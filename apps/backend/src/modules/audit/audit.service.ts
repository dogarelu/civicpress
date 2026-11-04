import { Injectable } from '@nestjs/common';
import { PostStatus, Prisma } from '@prisma/client';
import type { AuthorPostCountRange, AuthorPostCounts, AuthorPostStats } from '@civicpress/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogData {
  actorId?: string;
  action: string;
  entity: string;
  entityId: string;
  diff?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: data.actorId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          diff:
            data.diff !== undefined && data.diff !== null
              ? (data.diff as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          ip: data.ip,
          userAgent: data.userAgent,
        },
      });
    } catch (e) {
      console.error('[AuditService] Failed to log:', e);
    }
  }

  async list(
    opts: {
      page?: number;
      perPage?: number;
      entity?: string;
      actorId?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) {
    const { page = 1, perPage = 20, entity, actorId, dateFrom, dateTo } = opts;
    const where: Record<string, unknown> = {
      ...(entity ? { entity } : {}),
      ...(actorId ? { actorId } : {}),
    };
    if (dateFrom || dateTo) {
      where['createdAt'] = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }
    const skip = (page - 1) * perPage;
    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
        include: { actor: { select: { id: true, displayName: true, email: true } } },
      }),
    ]);
    return {
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        diff: l.diff,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
        actor: l.actor
          ? { id: l.actor.id, displayName: l.actor.displayName, email: l.actor.email }
          : null,
      })),
      total,
      page,
      perPage,
    };
  }

  /** Published article counts per author for week / month / 3 months / year / all time. */
  async authorStats(): Promise<AuthorPostStats> {
    const now = Date.now();
    const since = {
      week: new Date(now - 7 * 86_400_000),
      month: new Date(now - 30 * 86_400_000),
      quarter: new Date(now - 90 * 86_400_000),
      year: new Date(now - 365 * 86_400_000),
    };

    const [week, month, quarter, year, all] = await Promise.all([
      this.groupPublishedByAuthor(since.week),
      this.groupPublishedByAuthor(since.month),
      this.groupPublishedByAuthor(since.quarter),
      this.groupPublishedByAuthor(since.year),
      this.groupPublishedByAuthor(),
    ]);

    const emptyCounts = (): AuthorPostCounts => ({
      week: 0,
      month: 0,
      quarter: 0,
      year: 0,
      all: 0,
    });
    const counts = new Map<string, AuthorPostCounts>();
    const apply = (
      rows: Array<{ authorId: string | null; _count: { _all: number } }>,
      field: AuthorPostCountRange,
    ) => {
      for (const row of rows) {
        const key = row.authorId ?? '';
        const current = counts.get(key) ?? emptyCounts();
        current[field] = row._count._all;
        counts.set(key, current);
      }
    };
    apply(week, 'week');
    apply(month, 'month');
    apply(quarter, 'quarter');
    apply(year, 'year');
    apply(all, 'all');

    const userIds = [...counts.keys()].filter(Boolean);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, displayName: true, email: true, role: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const authors = [...counts.entries()]
      .map(([id, authorCounts]) => {
        const user = id ? userById.get(id) : undefined;
        return {
          userId: id || null,
          displayName: user?.displayName ?? (id ? 'Utilizator șters' : 'Fără autor'),
          email: user?.email ?? null,
          role: user?.role ?? null,
          counts: authorCounts,
        };
      })
      .sort(
        (a, b) => b.counts.all - a.counts.all || a.displayName.localeCompare(b.displayName, 'ro'),
      );

    const totals = authors.reduce(
      (acc, author) => ({
        week: acc.week + author.counts.week,
        month: acc.month + author.counts.month,
        quarter: acc.quarter + author.counts.quarter,
        year: acc.year + author.counts.year,
        all: acc.all + author.counts.all,
      }),
      emptyCounts(),
    );

    return { authors, totals };
  }

  private groupPublishedByAuthor(from?: Date) {
    const publishedAtFilter: Prisma.PostWhereInput = from
      ? {
          OR: [
            { publishedAt: { gte: from } },
            { AND: [{ publishedAt: null }, { createdAt: { gte: from } }] },
          ],
        }
      : {};
    return this.prisma.post.groupBy({
      by: ['authorId'],
      where: { status: PostStatus.PUBLISHED, ...publishedAtFilter },
      _count: { _all: true },
    });
  }
}
