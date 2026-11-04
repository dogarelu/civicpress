import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyticsBeaconSchema,
  UtmCodeSchema,
  UtmPresetCreateSchema,
  UtmPresetUpdateSchema,
  type AnalyticsBeacon,
  type AnalyticsBreakdownRow,
  type AnalyticsDailyPoint,
  type AnalyticsPageDetail,
  type AnalyticsPageStat,
  type AnalyticsPageType,
  type AnalyticsOverview,
  type AnalyticsUtmStat,
  type UtmPreset,
  type UtmPresetCreate,
  type UtmPresetUpdate,
} from '@civicpress/shared';

const MAX_DURATION_MS = 5 * 60 * 1000; // 5 min idle cap per active stretch (client-enforced; server clamps)
const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const REPORT_TZ = 'Europe/Bucharest';
const PAGE_TYPE_LABELS: Record<AnalyticsPageType, string> = {
  home: 'Acasă',
  article: 'Articol',
  video: 'Video',
  search: 'Căutare',
  contact: 'Contact',
  category: 'Categorie',
  other: 'Altele',
};

type PageViewRow = {
  path: string;
  pageType: string;
  title: string | null;
  postId: string | null;
  sessionId: string;
  durationMs: number;
  utm: string | null;
  startedAt: Date;
  session: { visitorId: string | null };
};

type BucketAcc = {
  sessions: Set<string>;
  visitors: Set<string>;
  pageViews: number;
  duration: number;
};

function visitorKey(sessionId: string, visitorId?: string | null): string {
  return visitorId || `s:${sessionId}`;
}

function emptyBucket(): BucketAcc {
  return { sessions: new Set(), visitors: new Set(), pageViews: 0, duration: 0 };
}

function bump(acc: BucketAcc, sessionId: string, visitor: string, durationMs: number) {
  acc.sessions.add(sessionId);
  acc.visitors.add(visitor);
  acc.pageViews += 1;
  acc.duration += durationMs;
}

function formatDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function eachDay(from: Date, to: Date): string[] {
  const start = formatDay(from);
  const end = formatDay(to);
  const days: string[] = [];
  const [ys, ms, ds] = start.split('-').map(Number);
  let cursor = Date.UTC(ys, ms - 1, ds);
  for (let i = 0; i < 400; i++) {
    const key = new Date(cursor).toISOString().slice(0, 10);
    days.push(key);
    if (key >= end) break;
    cursor += 86400000;
  }
  return days;
}

function toBreakdown(
  map: Map<string, BucketAcc>,
  labels: Map<string, string>,
): AnalyticsBreakdownRow[] {
  return [...map.entries()]
    .map(([key, b]) => ({
      key,
      label: labels.get(key) ?? key,
      sessions: b.sessions.size,
      uniqueVisitors: b.visitors.size,
      pageViews: b.pageViews,
      totalDurationMs: b.duration,
    }))
    .sort((a, b) => b.pageViews - a.pageViews || b.sessions - a.sessions);
}

function normalizePath(path: string): string {
  try {
    const u = path.startsWith('http') ? new URL(path) : new URL(path, 'http://local');
    let p = u.pathname || '/';
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/';
  } catch {
    return path.split('?')[0]?.split('#')[0] || '/';
  }
}

function normalizeUtm(raw?: string | null): string | null {
  if (!raw) return null;
  const parsed = UtmCodeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function parseDateRange(from?: string, to?: string): { from: Date; to: Date } {
  const now = new Date();
  const toDate = to ? new Date(to) : now;
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new BadRequestException('Invalid date range');
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    toDate.setHours(23, 59, 59, 999);
  }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    fromDate.setHours(0, 0, 0, 0);
  }
  if (toDate.getTime() < fromDate.getTime()) {
    throw new BadRequestException('Invalid date range');
  }
  if (toDate.getTime() - fromDate.getTime() > MAX_RANGE_MS) {
    throw new BadRequestException('Intervalul maxim este 366 zile');
  }
  return { from: fromDate, to: toDate };
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ─── Public beacon ────────────────────────────────────────────────────────

  async ingestBeacon(raw: unknown, userAgent?: string) {
    const parsed = AnalyticsBeaconSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    const path = normalizePath(data.path);
    const durationMs = Math.min(data.durationMs, MAX_DURATION_MS * 12);

    const session = await this.upsertSession(data, userAgent);
    const postMeta = await this.resolvePostMeta(path, data.pageType, data.postId);
    const existing = await this.prisma.analyticsPageView.findUnique({
      where: { id: data.pageViewId },
    });

    if (data.event === 'start') {
      if (!existing) {
        await this.prisma.analyticsPageView.create({
          data: {
            id: data.pageViewId,
            sessionId: session.id,
            path,
            pageType: data.pageType,
            postId: postMeta.postId,
            title: data.title?.trim() || postMeta.title,
            durationMs: 0,
            utm: session.utm,
          },
        });
        await this.bumpPostViewCount(postMeta.postId);
      } else {
        await this.prisma.analyticsPageView.update({
          where: { id: data.pageViewId },
          data: {
            path,
            pageType: data.pageType,
            postId: existing.postId ?? postMeta.postId,
            title: data.title?.trim() || postMeta.title,
            utm: session.utm,
          },
        });
        if (!existing.postId && postMeta.postId) {
          await this.bumpPostViewCount(postMeta.postId);
        }
      }
      return { ok: true, pageViewId: data.pageViewId };
    }

    if (!existing) {
      await this.prisma.analyticsPageView.create({
        data: {
          id: data.pageViewId,
          sessionId: session.id,
          path,
          pageType: data.pageType,
          postId: postMeta.postId,
          title: data.title?.trim() || postMeta.title,
          durationMs,
          utm: session.utm,
        },
      });
      await this.bumpPostViewCount(postMeta.postId);
      return { ok: true, pageViewId: data.pageViewId };
    }

    await this.prisma.analyticsPageView.update({
      where: { id: data.pageViewId },
      data: {
        durationMs: Math.max(existing.durationMs, durationMs),
        title: data.title?.trim() || existing.title || postMeta.title,
        postId: existing.postId ?? postMeta.postId,
      },
    });
    if (!existing.postId && postMeta.postId) {
      await this.bumpPostViewCount(postMeta.postId);
    }
    return { ok: true, pageViewId: data.pageViewId };
  }

  /** Keep Post.viewCount aligned with analytics page views without touching @updatedAt. */
  private async bumpPostViewCount(postId: string | null) {
    if (!postId) return;
    await this.prisma.$executeRaw`
      UPDATE "Post"
      SET "viewCount" = "viewCount" + 1
      WHERE id = ${postId}
    `;
  }

  private async upsertSession(data: AnalyticsBeacon, userAgent?: string) {
    const existing = await this.prisma.analyticsSession.findUnique({
      where: { id: data.sessionId },
    });
    const incomingUtm = normalizeUtm(data.utm);

    const incomingVisitor = data.visitorId?.trim() || null;

    if (!existing) {
      const utmPresetId = incomingUtm ? await this.matchPresetId(incomingUtm) : null;
      return this.prisma.analyticsSession.create({
        data: {
          id: data.sessionId,
          visitorId: incomingVisitor,
          userAgent: userAgent?.slice(0, 500) ?? null,
          utm: incomingUtm,
          utmPresetId,
        },
      });
    }

    const patch: Prisma.AnalyticsSessionUpdateInput = { lastSeenAt: new Date() };
    if (!existing.visitorId && incomingVisitor) patch.visitorId = incomingVisitor;

    // First-touch: only set UTM if session has none yet
    if (!existing.utm && incomingUtm) {
      patch.utm = incomingUtm;
      patch.utmPresetId = await this.matchPresetId(incomingUtm);
    }

    return this.prisma.analyticsSession.update({
      where: { id: existing.id },
      data: patch,
    });
  }

  private async matchPresetId(code: string): Promise<string | null> {
    const preset = await this.prisma.utmPreset.findUnique({
      where: { code },
      select: { id: true },
    });
    return preset?.id ?? null;
  }

  private async resolvePostMeta(
    path: string,
    pageType: AnalyticsPageType,
    postId?: string | null,
  ): Promise<{ postId: string | null; title: string | null }> {
    if (postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, title: true },
      });
      return { postId: post?.id ?? null, title: post?.title ?? null };
    }
    if (pageType !== 'article' && pageType !== 'video') {
      return { postId: null, title: null };
    }
    const slug = path.replace(/^\/video\//, '/').replace(/^\//, '');
    if (!slug || slug.includes('/')) return { postId: null, title: null };
    const post = await this.prisma.post.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });
    return { postId: post?.id ?? null, title: post?.title ?? null };
  }

  // ─── Admin reports ────────────────────────────────────────────────────────

  async overview(fromStr?: string, toStr?: string, postId?: string): Promise<AnalyticsOverview> {
    const { from, to } = parseDateRange(fromStr, toStr);
    const scopedPostId = postId?.trim() || null;

    const where: Prisma.AnalyticsPageViewWhereInput = {
      startedAt: { gte: from, lte: to },
      ...(scopedPostId ? { postId: scopedPostId } : {}),
    };

    const [rows, postMeta] = await Promise.all([
      this.prisma.analyticsPageView.findMany({
        where,
        select: {
          path: true,
          pageType: true,
          title: true,
          postId: true,
          sessionId: true,
          durationMs: true,
          utm: true,
          startedAt: true,
          session: { select: { visitorId: true } },
        },
      }),
      scopedPostId
        ? this.prisma.post.findUnique({
            where: { id: scopedPostId },
            select: { id: true, title: true, slug: true },
          })
        : Promise.resolve(null),
    ]);

    if (scopedPostId && !postMeta) {
      throw new NotFoundException(`Articol inexistent: ${scopedPostId}`);
    }

    return this.assembleReport(rows, from, to, {
      postId: scopedPostId,
      title: postMeta?.title ?? rows.find((r) => r.title)?.title ?? null,
      path: postMeta ? `/${postMeta.slug}` : null,
    });
  }

  async pages(fromStr?: string, toStr?: string): Promise<AnalyticsPageStat[]> {
    const { from, to } = parseDateRange(fromStr, toStr);
    const rows = await this.prisma.analyticsPageView.findMany({
      where: { startedAt: { gte: from, lte: to } },
      select: {
        path: true,
        pageType: true,
        title: true,
        postId: true,
        sessionId: true,
        durationMs: true,
        session: { select: { visitorId: true } },
      },
    });
    return this.aggregatePages(rows);
  }

  async pageDetail(path: string, fromStr?: string, toStr?: string): Promise<AnalyticsPageDetail> {
    const { from, to } = parseDateRange(fromStr, toStr);
    const normalized = normalizePath(path);
    const rows = await this.prisma.analyticsPageView.findMany({
      where: { path: normalized, startedAt: { gte: from, lte: to } },
      select: {
        path: true,
        pageType: true,
        title: true,
        postId: true,
        sessionId: true,
        durationMs: true,
        utm: true,
        startedAt: true,
        session: { select: { visitorId: true } },
      },
    });

    if (rows.length === 0) {
      return {
        path: normalized,
        pageType: null,
        title: null,
        postId: null,
        sessions: 0,
        uniqueVisitors: 0,
        pageViews: 0,
        totalDurationMs: 0,
        avgDurationMs: 0,
        utmBreakdown: [],
      };
    }

    const report = await this.assembleReport(rows, from, to, {
      postId: rows.find((r) => r.postId)?.postId ?? null,
      title: rows.find((r) => r.title)?.title ?? null,
      path: normalized,
    });
    const first = rows[0];
    return {
      path: normalized,
      pageType: (first.pageType as AnalyticsPageType) ?? null,
      title: report.title,
      postId: report.postId,
      sessions: report.totalSessions,
      uniqueVisitors: report.uniqueVisitors,
      pageViews: report.totalPageViews,
      totalDurationMs: report.totalDurationMs,
      avgDurationMs: report.avgDurationMs,
      utmBreakdown: report.byUtm,
    };
  }

  private async assembleReport(
    rows: PageViewRow[],
    from: Date,
    to: Date,
    meta: { postId: string | null; title: string | null; path: string | null },
  ): Promise<AnalyticsOverview> {
    const dayKeys = eachDay(from, to);
    const dailyMap = new Map<string, BucketAcc>(dayKeys.map((d) => [d, emptyBucket()]));
    const byUtm = new Map<string, BucketAcc>();
    const utmRaw = new Map<string, string | null>();
    const byPageType = new Map<string, BucketAcc>();
    const pageTypeLabels = new Map<string, string>();
    const sessionViews = new Map<string, number>();
    const sessionDuration = new Map<string, number>();
    const allVisitors = new Set<string>();
    const realVisitorIds = new Set<string>();
    const visitorSessions = new Map<string, Set<string>>();

    let totalDurationMs = 0;

    for (const row of rows) {
      const visitor = visitorKey(row.sessionId, row.session.visitorId);
      allVisitors.add(visitor);
      if (row.session.visitorId) {
        realVisitorIds.add(row.session.visitorId);
        const sessions = visitorSessions.get(row.session.visitorId) ?? new Set<string>();
        sessions.add(row.sessionId);
        visitorSessions.set(row.session.visitorId, sessions);
      }
      totalDurationMs += row.durationMs;
      sessionViews.set(row.sessionId, (sessionViews.get(row.sessionId) ?? 0) + 1);
      sessionDuration.set(
        row.sessionId,
        (sessionDuration.get(row.sessionId) ?? 0) + row.durationMs,
      );

      const day = formatDay(row.startedAt);
      const dayBucket = dailyMap.get(day) ?? emptyBucket();
      if (!dailyMap.has(day)) dailyMap.set(day, dayBucket);
      bump(dayBucket, row.sessionId, visitor, row.durationMs);

      const utmKey = row.utm || 'no-utm';
      const utmBucket = byUtm.get(utmKey) ?? emptyBucket();
      if (!byUtm.has(utmKey)) {
        byUtm.set(utmKey, utmBucket);
        utmRaw.set(utmKey, row.utm);
      }
      bump(utmBucket, row.sessionId, visitor, row.durationMs);

      const typeKey = (row.pageType as AnalyticsPageType) || 'other';
      const typeBucket = byPageType.get(typeKey) ?? emptyBucket();
      if (!byPageType.has(typeKey)) {
        byPageType.set(typeKey, typeBucket);
        pageTypeLabels.set(typeKey, PAGE_TYPE_LABELS[typeKey as AnalyticsPageType] ?? typeKey);
      }
      bump(typeBucket, row.sessionId, visitor, row.durationMs);
    }

    const totalSessions = sessionViews.size;
    const uniqueVisitors = allVisitors.size;
    const sessionDurationSum = [...sessionDuration.values()].reduce((s, n) => s + n, 0);

    const multiInRange = [...visitorSessions.entries()]
      .filter(([, sessions]) => sessions.size >= 2)
      .map(([id]) => id);

    const [returningVisitors, byCategory, presets] = await Promise.all([
      this.countReturning(realVisitorIds, from, multiInRange),
      this.aggregateCategories(rows),
      this.prisma.utmPreset.findMany(),
    ]);

    const newVisitors = uniqueVisitors - returningVisitors;

    const presetByCode = new Map(presets.map((p) => [p.code, p]));
    const byUtmRows: AnalyticsUtmStat[] = [...byUtm.entries()]
      .map(([key, b]) => {
        const raw = utmRaw.get(key) ?? null;
        const preset = key === 'no-utm' ? null : (presetByCode.get(key) ?? null);
        return {
          key,
          label: key === 'no-utm' ? 'Fără UTM / direct' : (preset?.code ?? raw ?? key),
          utm: raw,
          presetId: preset?.id ?? null,
          sessions: b.sessions.size,
          uniqueVisitors: b.visitors.size,
          pageViews: b.pageViews,
          totalDurationMs: b.duration,
        };
      })
      .sort((a, b) => b.sessions - a.sessions);

    const daily: AnalyticsDailyPoint[] = dayKeys.map((date) => {
      const b = dailyMap.get(date) ?? emptyBucket();
      return {
        date,
        sessions: b.sessions.size,
        uniqueVisitors: b.visitors.size,
        pageViews: b.pageViews,
        totalDurationMs: b.duration,
      };
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      postId: meta.postId,
      title: meta.title,
      path: meta.path,
      totalSessions,
      uniqueVisitors,
      newVisitors,
      returningVisitors,
      totalPageViews: rows.length,
      totalDurationMs,
      avgDurationMs: rows.length ? Math.round(totalDurationMs / rows.length) : 0,
      avgSessionDurationMs: totalSessions ? Math.round(sessionDurationSum / totalSessions) : 0,
      pagesPerSession: totalSessions ? Math.round((rows.length / totalSessions) * 100) / 100 : 0,
      daily,
      byCategory,
      byUtm: byUtmRows,
      byPageType: toBreakdown(byPageType, pageTypeLabels),
      topPages: this.aggregatePages(rows).slice(0, 25),
    };
  }

  private async countReturning(
    visitorIds: Set<string>,
    from: Date,
    multiSessionVisitorIds: string[],
  ): Promise<number> {
    const returning = new Set(multiSessionVisitorIds);
    const unknown = [...visitorIds].filter((id) => !returning.has(id));
    if (unknown.length === 0) return returning.size;
    const prior = await this.prisma.analyticsSession.findMany({
      where: {
        visitorId: { in: unknown },
        startedAt: { lt: from },
      },
      select: { visitorId: true },
      distinct: ['visitorId'],
    });
    for (const row of prior) {
      if (row.visitorId) returning.add(row.visitorId);
    }
    return returning.size;
  }

  private async aggregateCategories(rows: PageViewRow[]): Promise<AnalyticsBreakdownRow[]> {
    const postIds = [...new Set(rows.map((r) => r.postId).filter((id): id is string => !!id))];
    const listingSlugs = [
      ...new Set(
        rows
          .filter((r) => r.pageType === 'category')
          .map((r) => r.path.replace(/^\/category\//, '').split('/')[0] || '')
          .filter(Boolean),
      ),
    ];

    type CatRef = { id: string; name: string; slug: string };
    const [postCats, listingCats] = await Promise.all([
      postIds.length
        ? this.prisma.postCategory.findMany({
            where: { postId: { in: postIds } },
            select: {
              postId: true,
              isPrimary: true,
              category: { select: { id: true, name: true, slug: true } },
            },
          })
        : Promise.resolve([] as Array<{ postId: string; isPrimary: boolean; category: CatRef }>),
      listingSlugs.length
        ? this.prisma.category.findMany({
            where: { slug: { in: listingSlugs } },
            select: { id: true, name: true, slug: true },
          })
        : Promise.resolve([] as CatRef[]),
    ]);

    const byPost = new Map<string, { id: string; name: string; slug: string }>();
    for (const pc of postCats) {
      const current = byPost.get(pc.postId);
      if (!current || pc.isPrimary) byPost.set(pc.postId, pc.category);
    }
    const bySlug = new Map(listingCats.map((c) => [c.slug, c]));

    const buckets = new Map<string, BucketAcc>();
    const labels = new Map<string, string>();

    for (const row of rows) {
      let cat: { id: string; name: string } | null = null;
      if (row.postId && byPost.has(row.postId)) {
        cat = byPost.get(row.postId) ?? null;
      } else if (row.pageType === 'category') {
        const slug = row.path.replace(/^\/category\//, '').split('/')[0] || '';
        cat = bySlug.get(slug) ?? null;
      } else if (row.pageType === 'article' || row.pageType === 'video') {
        cat = { id: 'uncategorized', name: 'Fără categorie' };
      } else {
        continue;
      }
      if (!cat) continue;
      const acc = buckets.get(cat.id) ?? emptyBucket();
      if (!buckets.has(cat.id)) {
        buckets.set(cat.id, acc);
        labels.set(cat.id, cat.name);
      }
      bump(acc, row.sessionId, visitorKey(row.sessionId, row.session.visitorId), row.durationMs);
    }

    return toBreakdown(buckets, labels);
  }

  private aggregatePages(
    rows: Array<{
      path: string;
      pageType: string;
      title: string | null;
      postId: string | null;
      sessionId: string;
      durationMs: number;
      session?: { visitorId: string | null };
    }>,
  ): AnalyticsPageStat[] {
    const map = new Map<
      string,
      {
        path: string;
        pageType: AnalyticsPageType;
        title: string | null;
        postId: string | null;
        sessions: Set<string>;
        visitors: Set<string>;
        pageViews: number;
        totalDurationMs: number;
      }
    >();

    for (const row of rows) {
      let entry = map.get(row.path);
      if (!entry) {
        entry = {
          path: row.path,
          pageType: row.pageType as AnalyticsPageType,
          title: row.title,
          postId: row.postId,
          sessions: new Set(),
          visitors: new Set(),
          pageViews: 0,
          totalDurationMs: 0,
        };
        map.set(row.path, entry);
      }
      entry.sessions.add(row.sessionId);
      entry.visitors.add(visitorKey(row.sessionId, row.session?.visitorId));
      entry.pageViews += 1;
      entry.totalDurationMs += row.durationMs;
      if (!entry.title && row.title) entry.title = row.title;
      if (!entry.postId && row.postId) entry.postId = row.postId;
    }

    return [...map.values()]
      .map((e) => ({
        path: e.path,
        pageType: e.pageType,
        title: e.title,
        postId: e.postId,
        sessions: e.sessions.size,
        uniqueVisitors: e.visitors.size,
        pageViews: e.pageViews,
        totalDurationMs: e.totalDurationMs,
        avgDurationMs: e.pageViews ? Math.round(e.totalDurationMs / e.pageViews) : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions || b.pageViews - a.pageViews);
  }

  // ─── UTM presets ──────────────────────────────────────────────────────────

  async listPresets(): Promise<UtmPreset[]> {
    const rows = await this.prisma.utmPreset.findMany({ orderBy: { code: 'asc' } });
    return rows.map((r) => this.mapPreset(r));
  }

  async createPreset(input: UtmPresetCreate): Promise<UtmPreset> {
    const data = UtmPresetCreateSchema.parse(input);
    const existing = await this.prisma.utmPreset.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException(`UTM „${data.code}” există deja`);
    const row = await this.prisma.utmPreset.create({ data: { code: data.code } });
    return this.mapPreset(row);
  }

  async updatePreset(id: string, input: UtmPresetUpdate): Promise<UtmPreset> {
    const existing = await this.prisma.utmPreset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`UTM preset not found: ${id}`);
    const data = UtmPresetUpdateSchema.parse(input);
    if (data.code !== undefined && data.code !== existing.code) {
      const clash = await this.prisma.utmPreset.findUnique({ where: { code: data.code } });
      if (clash) throw new BadRequestException(`UTM „${data.code}” există deja`);
    }
    const row = await this.prisma.utmPreset.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
      },
    });
    return this.mapPreset(row);
  }

  async deletePreset(id: string) {
    const existing = await this.prisma.utmPreset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`UTM preset not found: ${id}`);
    await this.prisma.utmPreset.delete({ where: { id } });
    return { ok: true, id };
  }

  private mapPreset(r: { id: string; code: string; createdAt: Date; updatedAt: Date }): UtmPreset {
    return {
      id: r.id,
      code: r.code,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
