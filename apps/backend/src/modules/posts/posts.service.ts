import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  mapPostSummary,
  mapPostDetail,
  mapPostBulbi,
  mapPostPhotoCaptions,
  applyPublicArticlePhotos,
  mapMedia,
  mapPill,
} from './posts.mapper';
import { PostStatus, Role } from '@prisma/client';
import {
  applyArticleReferences,
  DEFAULT_ARTICLE_LAYOUT_MODE,
  headlineHref,
  isYoutubeUrl,
  listArticleReferenceIds,
  readingTimeSecondsFromHtml,
  safeHttpUrl,
  toYoutubeEmbedUrl,
} from '@civicpress/shared';
import type { PostDetail, PostPreviewRequest } from '@civicpress/shared';
import { canEditPublishedPosts, canPublishPosts } from '../../common/role-access';
import { NotificationsService } from '../notifications/notifications.service';
import { PillsService } from '../pills/pills.service';
import { LayoutService } from '../layout/layout.service';

const POST_BULBI_INCLUDE = {
  orderBy: { sortOrder: 'asc' as const },
  include: {
    linkedPost: { select: { id: true, slug: true, title: true, status: true, deletedAt: true } },
  },
} as const;

const POST_PILLS_INCLUDE = {
  include: { pill: true },
} as const;

const POST_SUMMARY_INCLUDE = {
  heroMedia: true,
  postPills: POST_PILLS_INCLUDE,
  author: true,
  categories: { include: { category: true } },
  bulbi: POST_BULBI_INCLUDE,
} as const;

const POST_PHOTO_CAPTIONS_INCLUDE = {
  orderBy: { sortOrder: 'asc' as const },
} as const;

const POST_INCLUDE = {
  heroMedia: true,
  postPills: POST_PILLS_INCLUDE,
  author: { include: { avatar: true } },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
  bulbi: POST_BULBI_INCLUDE,
  photoCaptions: POST_PHOTO_CAPTIONS_INCLUDE,
} as const;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

interface Actor {
  sub: string;
  role: Role;
}

function toDateOrNull(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

const PREVIEW_TTL_MS = 15 * 60 * 1000;
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const TRASH_PURGE_INTERVAL_MS = 60 * 60 * 1000;

function normalizePreviewVideoUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return isYoutubeUrl(trimmed) ? toYoutubeEmbedUrl(trimmed) : trimmed;
  } catch {
    return null;
  }
}

@Injectable()
export class PostsService implements OnModuleInit, OnModuleDestroy {
  private readonly previews = new Map<string, { post: PostDetail; expires: number }>();
  private purgeTimer: ReturnType<typeof setInterval> | null = null;

  onModuleInit() {
    void this.purgeExpired().catch((err) => {
      console.error('Failed to purge expired trash', err);
    });
    this.purgeTimer = setInterval(() => {
      void this.purgeExpired().catch((err) => {
        console.error('Failed to purge expired trash', err);
      });
    }, TRASH_PURGE_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private pills: PillsService,
    private layout: LayoutService,
  ) {}

  // ─── Public read ──────────────────────────────────────────────────────────

  async getBySlug(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED },
      include: POST_INCLUDE,
    });
    if (!post) throw new NotFoundException(`Post not found: ${slug}`);

    const primaryCat = post.categories.find((c) => c.isPrimary) ?? post.categories[0];
    const [relatedPosts, latestPosts] = await Promise.all([
      primaryCat
        ? this.prisma.post.findMany({
            where: {
              status: PostStatus.PUBLISHED,
              id: { not: post.id },
              categories: { some: { categoryId: primaryCat.categoryId } },
            },
            orderBy: { publishedAt: 'desc' },
            take: 3,
            include: POST_SUMMARY_INCLUDE,
          })
        : Promise.resolve([]),
      this.prisma.post.findMany({
        where: { status: PostStatus.PUBLISHED, id: { not: post.id } },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        include: POST_SUMMARY_INCLUDE,
      }),
    ]);

    const mapped = mapPostDetail(post);
    const photoCaptions = mapPostPhotoCaptions(post.photoCaptions);
    const withPhotos = applyPublicArticlePhotos(mapped, photoCaptions);
    const sibling = await this.loadSiblingDetail(post.siblingPostId, { publishedOnly: true });
    return {
      ...withPhotos,
      contentHtml: await this.resolveArticleReferences(withPhotos.contentHtml),
      bulbi: mapPostBulbi(post.bulbi, { publishedOnly: true }),
      photoCaptions,
      relatedPosts: relatedPosts.map((related) => mapPostSummary(related)),
      latestPosts: latestPosts.map((latest) => mapPostSummary(latest)),
      sibling,
    };
  }

  /** Top published articles from the last 7 days, ranked by analytics-backed viewCount. */
  async getMostRead(limit = 5) {
    const take = Math.min(Math.max(limit, 1), 5);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        excludeFromModules: false,
        publishedAt: { gte: since },
      },
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      take,
      select: { id: true, title: true, slug: true, videoUrl: true },
    });
    return { posts: rows };
  }

  // ─── Public search ────────────────────────────────────────────────────────

  async search(opts: { query?: string; page?: number; perPage?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const perPage = Math.min(Math.max(opts.perPage ?? 15, 1), 50);
    const query = (opts.query ?? '').trim();
    const skip = (page - 1) * perPage;

    if (!query) {
      return { query: '', posts: [], total: 0, page, perPage };
    }

    const where = {
      status: PostStatus.PUBLISHED,
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { excerpt: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [total, rows] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: perPage,
        include: POST_SUMMARY_INCLUDE,
      }),
    ]);

    return {
      query,
      posts: rows.map((post) => mapPostSummary(post)),
      total,
      page,
      perPage,
    };
  }

  // ─── Admin list ───────────────────────────────────────────────────────────

  async adminList(opts: {
    page?: number;
    perPage?: number;
    status?: PostStatus;
    authorId?: string;
    search?: string;
    actor: Actor;
  }) {
    const { page = 1, perPage = 20, status, authorId, search, actor } = opts;
    const skip = (page - 1) * perPage;

    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;
    if (authorId) where['authorId'] = authorId;
    if (actor.role === Role.AUTHOR) where['authorId'] = actor.sub;
    if (search) {
      const term = search.trim();
      if (term) {
        where['OR'] = [
          { title: { contains: term, mode: 'insensitive' } },
          { excerpt: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    const totalPromise = this.prisma.post.count({ where });
    let postsPromise: Promise<
      Array<{
        id: string;
        title: string;
        slug: string;
        status: PostStatus;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        author: { id: string; displayName: string | null; slug: string | null } | null;
        authorName: string | null;
        showDate: boolean;
        showAuthor: boolean;
        showSummary: boolean;
        viewCount: number;
        categories: Array<{
          isPrimary: boolean;
          category: { id: string; name: string; slug: string; color: string | null };
        }>;
      }>
    >;

    if (status) {
      postsPromise = this.prisma.post.findMany({
        where,
        orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
        skip,
        take: perPage,
        include: POST_SUMMARY_INCLUDE,
      });
    } else {
      postsPromise = (async () => {
        const draftWhere = { ...where, status: PostStatus.DRAFT };
        const nonDraftWhere = { ...where, status: { not: PostStatus.DRAFT } };
        const draftCount = await this.prisma.post.count({ where: draftWhere });

        const draftSkip = Math.min(skip, draftCount);
        const draftTake = Math.max(0, Math.min(perPage, draftCount - draftSkip));

        const drafts = draftTake
          ? await this.prisma.post.findMany({
              where: draftWhere,
              orderBy: { updatedAt: 'desc' },
              skip: draftSkip,
              take: draftTake,
              include: POST_SUMMARY_INCLUDE,
            })
          : [];

        const remainingTake = perPage - drafts.length;
        if (remainingTake <= 0) return drafts;

        const nonDraftSkip = Math.max(0, skip - draftCount);
        const nonDrafts = await this.prisma.post.findMany({
          where: nonDraftWhere,
          orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
          skip: nonDraftSkip,
          take: remainingTake,
          include: POST_SUMMARY_INCLUDE,
        });

        return [...drafts, ...nonDrafts];
      })();
    }

    const [total, posts] = await Promise.all([totalPromise, postsPromise]);

    return {
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        author: p.author
          ? { id: p.author.id, displayName: p.author.displayName, slug: p.author.slug }
          : null,
        authorName: p.authorName?.trim() || p.author?.displayName || null,
        ...(actor.role === Role.ADMIN
          ? { createdByUsername: p.author?.displayName?.trim() || null }
          : {}),
        showDate: p.showDate,
        showAuthor: p.showAuthor,
        showSummary: p.showSummary,
        viewCount: p.viewCount,
        primaryCategory: this.getPrimaryCategory(
          p.categories as Parameters<typeof this.getPrimaryCategory>[0],
        ),
      })),
      total,
      page,
      perPage,
    };
  }

  private getPrimaryCategory(
    categories: Array<{
      isPrimary: boolean;
      category: { id: string; name: string; slug: string; color: string | null };
    }>,
  ) {
    const primary = categories.find((c) => c.isPrimary) ?? categories[0];
    return primary
      ? {
          id: primary.category.id,
          name: primary.category.name,
          slug: primary.category.slug,
          color: primary.category.color,
        }
      : null;
  }

  // ─── Admin get single post (any status) ──────────────────────────────────

  async getByIdAdmin(id: string, actor: Actor) {
    const post = await this.prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
    if (!post || post.deletedAt) throw new NotFoundException();
    if (actor.role === Role.AUTHOR && post.authorId !== actor.sub) throw new ForbiddenException();
    const mapped = mapPostDetail(post);
    const siblingPost = await this.loadSiblingSummary(post.siblingPostId);
    return {
      ...mapped,
      kicker: post.kicker,
      excerpt: post.excerpt,
      showSummary: post.showSummary,
      bulbi: mapPostBulbi(post.bulbi),
      photoCaptions: mapPostPhotoCaptions(post.photoCaptions),
      status: post.status,
      scheduledFor: post.scheduledFor?.toISOString() ?? null,
      relatedPosts: [],
      latestPosts: [],
      siblingPost,
    };
  }

  // ─── Live editor preview (no writes, no view increment) ───────────────────

  async preview(data: PostPreviewRequest, actor: Actor): Promise<{ token: string }> {
    const post = await this.buildPreviewDetail(data, actor);
    this.prunePreviews();
    const token = randomUUID();
    this.previews.set(token, { post, expires: Date.now() + PREVIEW_TTL_MS });
    return { token };
  }

  getPreview(token: string): PostDetail {
    const entry = this.previews.get(token);
    if (!entry || entry.expires <= Date.now()) {
      if (entry) this.previews.delete(token);
      throw new NotFoundException('Preview expired');
    }
    return entry.post;
  }

  private prunePreviews() {
    const now = Date.now();
    for (const [token, entry] of this.previews) {
      if (entry.expires <= now) this.previews.delete(token);
    }
  }

  private async buildPreviewDetail(data: PostPreviewRequest, actor: Actor): Promise<PostDetail> {
    const title = data.title?.trim() || 'Fără titlu';
    const slug = data.slug?.trim() || slugify(title) || 'preview';
    const kicker = data.kicker?.trim() || null;
    const rawExcerpt = data.excerpt?.trim() || null;
    const contentHtml = data.contentHtml ?? '';
    const publishedAt = toDateOrNull(data.publishedAt);
    const videoUrl = normalizePreviewVideoUrl(data.videoUrl);
    const categoryIds = [
      ...new Set(
        [data.primaryCategoryId, ...(data.categoryIds ?? [])].filter((id): id is string => !!id),
      ),
    ];

    const [heroMedia, categoryRows, author, layout, pills, bulbi, photoCaptions] =
      await Promise.all([
        data.heroMediaId
          ? this.prisma.media.findUnique({ where: { id: data.heroMediaId } })
          : Promise.resolve(null),
        categoryIds.length
          ? this.prisma.category.findMany({
              where: { id: { in: categoryIds } },
              select: { id: true, name: true, slug: true, color: true },
            })
          : Promise.resolve([]),
        this.prisma.user.findUnique({
          where: { id: actor.sub },
          include: { avatar: true },
        }),
        this.layout.getArticleLayout(data.id),
        this.resolvePreviewPills(data.pills ?? []),
        this.resolvePreviewBulbi(data.bulbi ?? []),
        Promise.resolve(this.resolvePreviewPhotoCaptions(data.photoCaptions ?? [])),
      ]);

    const categories = categoryIds
      .map((id) => categoryRows.find((row) => row.id === id))
      .filter((row): row is (typeof categoryRows)[number] => !!row)
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        color: row.color,
      }));

    const tagNames = (data.tagNames ?? []).map((name) => name.trim()).filter(Boolean);
    const tags = tagNames.map((name, index) => ({
      id: `preview-tag-${index}`,
      name,
      slug: slugify(name) || `tag-${index}`,
    }));

    const firstPill = pills[0];
    const authorName = data.authorName?.trim() || author?.displayName || null;
    const hasSubtitleBulbi = bulbi.length > 0;

    const sibling =
      data.siblingPostId && data.siblingPostId !== data.id
        ? await this.loadSiblingDetail(data.siblingPostId, { publishedOnly: true })
        : null;

    const detailed = applyPublicArticlePhotos(
      {
        id: data.id || 'preview',
        title,
        slug,
        kicker,
        excerpt: hasSubtitleBulbi ? null : rawExcerpt,
        contentHtml,
        publishedAt: publishedAt ? publishedAt.toISOString() : new Date().toISOString(),
        heroImage: mapMedia(heroMedia),
        videoUrl,
        author: author
          ? {
              id: author.id,
              displayName: author.displayName,
              slug: author.slug,
              bio: author.bio,
              avatar: mapMedia(author.avatar),
            }
          : null,
        authorName,
        showDate: data.showDate ?? true,
        showAuthor: data.showAuthor ?? true,
        showSummary: data.showSummary ?? (hasSubtitleBulbi || !!rawExcerpt),
        viewCount: 0,
        readingTimeSeconds: readingTimeSecondsFromHtml(contentHtml),
        categories,
        tags,
        relatedPosts: [],
        latestPosts: [],
        articleLayoutMode: layout.articleLayoutMode ?? 'classic',
        articleMainTypography: layout.articleMainTypography ?? null,
        articleMainShowSummary: layout.articleMainShowSummary,
        articleMainShowReadingTime: layout.articleMainShowReadingTime,
        articleMainSummaryRows: layout.articleMainSummaryRows ?? undefined,
        articleMainSummaryTypography: layout.articleMainSummaryTypography ?? null,
        articleMainBumbiTypography: layout.articleMainBumbiTypography ?? null,
        articleMainPhotoCaptionTypography: layout.articleMainPhotoCaptionTypography ?? null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        updatedAt: new Date().toISOString(),
        pills,
        pill: firstPill?.pill ?? null,
        pillCorner: firstPill?.corner ?? null,
        bulbi,
        photoCaptions,
        modules: layout.modules,
        sidebar: layout.sidebar,
        mobileOrder: layout.mobileOrder,
        mobileModules: layout.mobileModules,
        sibling,
      },
      photoCaptions,
    );
    return {
      ...detailed,
      contentHtml: await this.resolveArticleReferences(detailed.contentHtml),
      sibling,
    };
  }

  /**
   * Article body for the principal's second column.
   * Unpublished or trashed siblings are omitted. The sibling's own sibling is not loaded.
   */
  private async loadSiblingDetail(
    siblingPostId: string | null | undefined,
    opts: { publishedOnly: boolean },
  ): Promise<PostDetail | null> {
    if (!siblingPostId) return null;
    const sibling = await this.prisma.post.findFirst({
      where: {
        id: siblingPostId,
        deletedAt: null,
        ...(opts.publishedOnly ? { status: PostStatus.PUBLISHED } : {}),
      },
      include: POST_INCLUDE,
    });
    if (!sibling) return null;

    const mapped = mapPostDetail(sibling);
    const photoCaptions = mapPostPhotoCaptions(sibling.photoCaptions);
    const withPhotos = applyPublicArticlePhotos(mapped, photoCaptions);
    return {
      ...withPhotos,
      contentHtml: await this.resolveArticleReferences(withPhotos.contentHtml),
      bulbi: mapPostBulbi(sibling.bulbi, { publishedOnly: opts.publishedOnly }),
      photoCaptions,
      relatedPosts: [],
      latestPosts: [],
      modules: [],
      sidebar: null,
      mobileOrder: [],
      mobileModules: [],
      articleLayoutMode: DEFAULT_ARTICLE_LAYOUT_MODE,
      articleMainShowSummary: true,
      articleMainShowReadingTime: false,
      sibling: null,
    };
  }

  private async loadSiblingSummary(siblingPostId: string | null | undefined) {
    if (!siblingPostId) return null;
    const sibling = await this.prisma.post.findUnique({
      where: { id: siblingPostId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        deletedAt: true,
        publishedAt: true,
        authorName: true,
        author: { select: { displayName: true } },
      },
    });
    if (!sibling || sibling.deletedAt) return null;
    return {
      id: sibling.id,
      title: sibling.title,
      slug: sibling.slug,
      status: sibling.status,
      publishedAt: sibling.publishedAt?.toISOString() ?? null,
      authorName: sibling.authorName?.trim() || sibling.author?.displayName || null,
    };
  }

  private async assertSiblingPostId(
    siblingPostId: string | null | undefined,
    selfId?: string,
  ): Promise<string | null | undefined> {
    if (siblingPostId === undefined) return undefined;
    const id = siblingPostId?.trim() || null;
    if (!id) return null;
    if (selfId && id === selfId) {
      throw new BadRequestException('Un articol nu poate fi fratele lui însuși.');
    }
    const sibling = await this.prisma.post.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!sibling || sibling.deletedAt) {
      throw new BadRequestException('Articolul frate nu există.');
    }
    return sibling.id;
  }

  /** Published title, link, and hero image for in-body “Vezi și” blocks. */
  async getArticleReferences(ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 40);
    if (unique.length === 0) return { posts: [] };
    const posts = await this.prisma.post.findMany({
      where: { id: { in: unique }, status: PostStatus.PUBLISHED },
      select: { id: true, title: true, slug: true, videoUrl: true, heroMedia: true },
    });
    return {
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        href: headlineHref(post),
        imageUrl: mapMedia(post.heroMedia)?.url ?? null,
      })),
    };
  }

  private async resolveArticleReferences(html: string): Promise<string> {
    const ids = listArticleReferenceIds(html);
    if (ids.length === 0) return html;
    const { posts } = await this.getArticleReferences(ids);
    const byId = new Map(posts.map((post) => [post.id, post]));
    return applyArticleReferences(html, (postId) => {
      const post = byId.get(postId);
      if (!post) return null;
      return { title: post.title, href: post.href, imageUrl: post.imageUrl };
    });
  }

  private async resolvePreviewPills(
    pills: NonNullable<PostPreviewRequest['pills']>,
  ): Promise<PostDetail['pills']> {
    const placements: PostDetail['pills'] = [];
    const seen = new Set<string>();

    for (const [index, item] of pills.entries()) {
      if (item.pillText?.trim() && item.pillColor) {
        const text = item.pillText.trim();
        const color = item.pillColor;
        const textColor = item.pillTextColor ?? '#ffffff';
        const existing = await this.prisma.pill.findFirst({
          where: { text, color, textColor },
        });
        const pill = existing
          ? mapPill(existing)
          : { id: `preview-pill-${index}`, text, color, textColor };
        if (!pill || seen.has(pill.id)) continue;
        seen.add(pill.id);
        placements.push({ pill, corner: item.corner ?? null, size: item.size ?? 'default' });
        continue;
      }
      if (!item.pillId || seen.has(item.pillId)) continue;
      const row = await this.prisma.pill.findUnique({ where: { id: item.pillId } });
      const pill = mapPill(row);
      if (!pill) continue;
      seen.add(pill.id);
      placements.push({ pill, corner: item.corner ?? null, size: item.size ?? 'default' });
    }

    return placements.slice(0, 4);
  }

  private async resolvePreviewBulbi(
    bulbi: NonNullable<PostPreviewRequest['bulbi']>,
  ): Promise<PostDetail['bulbi']> {
    const items = bulbi
      .map((item) => {
        const link = readBumbLink(item);
        return {
          label: item.label?.trim() ?? '',
          postId: link.postId,
          externalUrl: link.externalUrl,
        };
      })
      .filter((item) => item.label);

    const linkedIds = [
      ...new Set(items.map((item) => item.postId).filter((id): id is string => !!id)),
    ];
    const linkedRows = linkedIds.length
      ? await this.prisma.post.findMany({
          where: { id: { in: linkedIds } },
          select: { id: true, slug: true, title: true },
        })
      : [];
    const linkedById = new Map(linkedRows.map((row) => [row.id, row]));

    return items.map((item, index) => ({
      id: `preview-bumb-${index}`,
      label: item.label,
      linkedPost: item.postId ? (linkedById.get(item.postId) ?? null) : null,
      externalUrl: item.postId ? null : item.externalUrl,
    }));
  }

  private resolvePreviewPhotoCaptions(
    captions: NonNullable<PostPreviewRequest['photoCaptions']>,
  ): PostDetail['photoCaptions'] {
    return captions.map((item, index) => ({
      id: `preview-photo-caption-${index}`,
      label: item.label ?? '',
    }));
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(
    data: {
      title: string;
      slug?: string;
      kicker?: string | null;
      excerpt?: string | null;
      contentHtml?: string;
      publishedAt?: string | null;
      heroMediaId?: string | null;
      videoUrl?: string | null;
      categoryIds?: string[];
      primaryCategoryId?: string | null;
      tagIds?: string[];
      tagNames?: string[];
      seoTitle?: string | null;
      seoDescription?: string | null;
      authorName?: string | null;
      showDate?: boolean;
      showAuthor?: boolean;
      showSummary?: boolean;
      pills?: Array<{
        pillId?: string | null;
        pillText?: string | null;
        pillColor?: string | null;
        pillTextColor?: string | null;
        corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;
        size?: 'smaller' | 'default' | 'bigger';
      }>;
      bulbi?: Array<{ label: string; postId?: string | null; externalUrl?: string | null }>;
      photoCaptions?: Array<{ label: string }>;
      siblingPostId?: string | null;
    },
    actor: Actor,
  ) {
    const siblingPostId = await this.assertSiblingPostId(data.siblingPostId);
    const baseSlug = data.slug || slugify(data.title);
    const slug = await this.findUniqueSlug(baseSlug);

    const uploader = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: { displayName: true },
    });
    const authorName = data.authorName?.trim() || uploader?.displayName || null;
    const publishedAt = toDateOrNull(data.publishedAt);
    const hasSubtitleBulbi = (data.bulbi ?? []).some((item) => item.label?.trim());
    const normalizedExcerpt = data.excerpt?.trim() ?? '';
    const fallbackShowSummary = hasSubtitleBulbi || normalizedExcerpt.length > 0;

    const post = await this.prisma.post.create({
      data: {
        title: data.title,
        slug,
        kicker: data.kicker?.trim() ? data.kicker.trim() : null,
        excerpt: data.excerpt ?? null,
        contentHtml: data.contentHtml ?? '',
        heroMediaId: data.heroMediaId ?? null,
        videoUrl: data.videoUrl ?? null,
        authorId: actor.sub,
        authorName,
        showDate: data.showDate ?? true,
        showAuthor: data.showAuthor ?? true,
        showSummary: data.showSummary ?? fallbackShowSummary,
        publishedAt: publishedAt ?? null,
        status: PostStatus.DRAFT,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        ...(siblingPostId ? { siblingPostId } : {}),
      },
    });

    await this.syncCategories(post.id, data.categoryIds ?? [], data.primaryCategoryId ?? null);
    if (data.tagNames !== undefined) {
      await this.syncTagNames(post.id, data.tagNames);
    } else {
      await this.syncTags(post.id, data.tagIds ?? []);
    }
    await this.syncPostPills(post.id, data.pills ?? []);
    await this.syncBulbi(post.id, data.bulbi ?? [], null);
    await this.syncPhotoCaptions(post.id, data.photoCaptions ?? []);
    await this.createRevision(post.id, actor.sub, 'Initial draft');

    return this.getByIdAdmin(post.id, actor);
  }

  /**
   * Create a published video article from a layout upload / YouTube URL.
   * Always creates a new post (no dedupe by URL). EDITOR/CHIEF_EDITOR/ADMIN only.
   */
  async createFromVideo(
    data: { title: string; videoUrl: string; categoryId: string },
    actor: Actor,
  ) {
    if (!canPublishPosts(actor.role)) {
      throw new ForbiddenException(
        'Only EDITOR/CHIEF_EDITOR/ADMIN can create published video articles',
      );
    }

    const title = data.title.trim();
    if (!title) throw new BadRequestException('Title is required');

    const rawUrl = data.videoUrl.trim();
    let videoUrl: string;
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestException('Invalid video URL');
      }
      videoUrl = isYoutubeUrl(rawUrl) ? toYoutubeEmbedUrl(rawUrl) : rawUrl;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Invalid video URL');
    }

    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Category not found');

    const uploader = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: { displayName: true },
    });
    const baseSlug = slugify(title) || 'video';
    const slug = await this.findUniqueSlug(baseSlug);
    const now = new Date();

    const post = await this.prisma.post.create({
      data: {
        title,
        slug,
        excerpt: null,
        contentHtml: '',
        heroMediaId: null,
        videoUrl,
        authorId: actor.sub,
        authorName: uploader?.displayName || null,
        showDate: true,
        showAuthor: true,
        showSummary: false,
        excludeFromModules: true,
        publishedAt: now,
        status: PostStatus.PUBLISHED,
        approvedById: actor.sub,
      },
    });

    await this.syncCategories(post.id, [category.id], category.id);
    await this.createRevision(post.id, actor.sub, 'Created from video URL');

    return this.getByIdAdmin(post.id, actor);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    id: string,
    data: {
      title?: string;
      kicker?: string | null;
      excerpt?: string | null;
      contentHtml?: string;
      publishedAt?: string | null;
      heroMediaId?: string | null;
      videoUrl?: string | null;
      categoryIds?: string[];
      primaryCategoryId?: string | null;
      tagIds?: string[];
      tagNames?: string[];
      seoTitle?: string | null;
      seoDescription?: string | null;
      slug?: string;
      authorName?: string | null;
      showDate?: boolean;
      showAuthor?: boolean;
      showSummary?: boolean;
      pills?: Array<{
        pillId?: string | null;
        pillText?: string | null;
        pillColor?: string | null;
        pillTextColor?: string | null;
        corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;
        size?: 'smaller' | 'default' | 'bigger';
      }>;
      bulbi?: Array<{ label: string; postId?: string | null; externalUrl?: string | null }>;
      photoCaptions?: Array<{ label: string }>;
      siblingPostId?: string | null;
    },
    actor: Actor,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) throw new NotFoundException();

    if (actor.role === Role.AUTHOR) {
      if (post.authorId !== actor.sub) throw new ForbiddenException();
      if (post.status !== PostStatus.DRAFT && post.status !== PostStatus.IN_REVIEW) {
        throw new ForbiddenException('Cannot edit a post past IN_REVIEW');
      }
    }
    // EDITORs cannot edit PUBLISHED posts directly — CHIEF_EDITOR and ADMIN can.
    if (post.status === PostStatus.PUBLISHED && !canEditPublishedPosts(actor.role)) {
      if (actor.role === Role.EDITOR) {
        throw new ForbiddenException(
          'EDITOR cannot edit PUBLISHED posts; archive first or ask a CHIEF_EDITOR/ADMIN.',
        );
      }
    }

    const siblingPostId = await this.assertSiblingPostId(data.siblingPostId, id);
    const publishedAt = toDateOrNull(data.publishedAt);
    const subtitleShowSummaryFallback =
      data.bulbi !== undefined
        ? data.bulbi.some((item) => item.label?.trim())
        : data.excerpt !== undefined
          ? (data.excerpt?.trim().length ?? 0) > 0
          : undefined;
    const slug =
      data.slug !== undefined
        ? await this.findUniqueSlug(
            data.slug.trim() || slugify(data.title ?? post.title) || 'post',
            id,
          )
        : undefined;

    const updated = await this.prisma.post.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.kicker !== undefined
          ? { kicker: data.kicker?.trim() ? data.kicker.trim() : null }
          : {}),
        ...(data.excerpt !== undefined ? { excerpt: data.excerpt } : {}),
        ...(data.contentHtml !== undefined ? { contentHtml: data.contentHtml } : {}),
        ...(publishedAt !== undefined ? { publishedAt } : {}),
        ...(data.heroMediaId !== undefined ? { heroMediaId: data.heroMediaId } : {}),
        ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
        ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
        ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(data.authorName !== undefined
          ? { authorName: data.authorName?.trim() ? data.authorName.trim() : null }
          : {}),
        ...(data.showDate !== undefined ? { showDate: data.showDate } : {}),
        ...(data.showAuthor !== undefined ? { showAuthor: data.showAuthor } : {}),
        ...(data.showSummary !== undefined
          ? { showSummary: data.showSummary }
          : subtitleShowSummaryFallback !== undefined
            ? { showSummary: subtitleShowSummaryFallback }
            : {}),
        ...(siblingPostId !== undefined ? { siblingPostId } : {}),
      },
    });

    if (data.categoryIds !== undefined) {
      await this.syncCategories(id, data.categoryIds, data.primaryCategoryId ?? null);
    }
    if (data.tagNames !== undefined) {
      await this.syncTagNames(id, data.tagNames);
    } else if (data.tagIds !== undefined) {
      await this.syncTags(id, data.tagIds);
    }
    if (data.pills !== undefined) {
      await this.syncPostPills(id, data.pills);
    }
    if (data.bulbi !== undefined) {
      await this.syncBulbi(id, data.bulbi, id);
    }
    if (data.photoCaptions !== undefined) {
      await this.syncPhotoCaptions(id, data.photoCaptions);
    }

    await this.createRevision(id, actor.sub, 'Updated');
    return this.getByIdAdmin(updated.id, actor);
  }

  // ─── Workflow transition ───────────────────────────────────────────────────

  async transition(
    id: string,
    action: 'submit' | 'approve' | 'reject' | 'publish' | 'archive' | 'republish',
    actor: Actor,
    message?: string,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) throw new NotFoundException();

    const newStatus = this.computeTransition(post.status, action, actor, post.authorId);

    const updateData: Record<string, unknown> = { status: newStatus };
    if (action === 'submit') updateData['submittedById'] = actor.sub;
    if (action === 'approve' || action === 'publish' || action === 'republish') {
      updateData['approvedById'] = actor.sub;
      updateData['publishedAt'] = post.publishedAt ?? new Date();
    }

    const updated = await this.prisma.post.update({ where: { id }, data: updateData });
    await this.createRevision(id, actor.sub, message || `Transition: ${action}`);

    if (action === 'submit') {
      const actorUser = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { displayName: true },
      });
      this.notifications.notifyPostSubmitted({
        postId: updated.id,
        title: post.title,
        actorId: actor.sub,
        actorName: actorUser?.displayName ?? 'un autor',
      });
    }

    return { id: updated.id, status: updated.status };
  }

  private computeTransition(
    current: PostStatus,
    action: string,
    actor: Actor,
    authorId?: string | null,
  ): PostStatus {
    const isEditor = canPublishPosts(actor.role);
    switch (action) {
      case 'submit':
        if (!isEditor && authorId !== actor.sub) {
          throw new ForbiddenException('You can only submit your own posts');
        }
        if (current !== PostStatus.DRAFT) {
          throw new BadRequestException('Can only submit DRAFT posts');
        }
        return PostStatus.IN_REVIEW;
      case 'approve':
        if (!isEditor) throw new ForbiddenException('Only EDITOR/CHIEF_EDITOR/ADMIN can approve');
        if (current !== PostStatus.IN_REVIEW)
          throw new BadRequestException('Can only approve IN_REVIEW posts');
        return PostStatus.PUBLISHED;
      case 'reject':
        if (!isEditor) throw new ForbiddenException('Only EDITOR/CHIEF_EDITOR/ADMIN can reject');
        if (current !== PostStatus.IN_REVIEW)
          throw new BadRequestException('Can only reject IN_REVIEW posts');
        return PostStatus.DRAFT;
      case 'publish':
        if (!isEditor)
          throw new ForbiddenException('Only EDITOR/CHIEF_EDITOR/ADMIN can publish directly');
        return PostStatus.PUBLISHED;
      case 'archive':
        if (!isEditor) throw new ForbiddenException('Only EDITOR/CHIEF_EDITOR/ADMIN can archive');
        return PostStatus.ARCHIVED;
      case 'republish':
        if (!isEditor) throw new ForbiddenException('Only EDITOR/CHIEF_EDITOR/ADMIN can republish');
        if (current !== PostStatus.ARCHIVED) {
          throw new BadRequestException('Can only republish ARCHIVED posts');
        }
        return PostStatus.PUBLISHED;
      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(id: string, actor: Actor) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) throw new NotFoundException();
    this.assertCanDelete(post, actor);
    await this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async trashList(opts: { page?: number; perPage?: number; search?: string; actor: Actor }) {
    await this.purgeExpired();
    const page = Math.max(1, opts.page ?? 1);
    const perPage = Math.min(Math.max(opts.perPage ?? 20, 1), 100);
    const skip = (page - 1) * perPage;
    const where: Record<string, unknown> = { deletedAt: { not: null } };
    if (opts.actor.role === Role.AUTHOR) where['authorId'] = opts.actor.sub;
    const term = opts.search?.trim();
    if (term) {
      where['OR'] = [
        { title: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, posts] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip,
        take: perPage,
        include: POST_SUMMARY_INCLUDE,
      }),
    ]);

    return {
      posts: posts.map((p) => {
        const deletedAt = p.deletedAt ?? new Date();
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          deletedAt: deletedAt.toISOString(),
          purgeAt: new Date(deletedAt.getTime() + TRASH_RETENTION_MS).toISOString(),
          daysRemaining: this.daysRemaining(deletedAt),
          authorName: p.authorName?.trim() || p.author?.displayName || null,
          primaryCategory: this.getPrimaryCategory(
            p.categories as Parameters<typeof this.getPrimaryCategory>[0],
          ),
        };
      }),
      total,
      page,
      perPage,
      retentionDays: 30,
    };
  }

  async restore(id: string, actor: Actor) {
    await this.purgeExpired();
    const post = await this.prisma.post.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!post) throw new NotFoundException();
    this.assertCanDelete(post, actor, 'restore');
    const updated = await this.prisma.post.update({
      where: { id },
      data: { deletedAt: null },
    });
    return { id: updated.id, status: updated.status };
  }

  async permanentDelete(id: string, actor: Actor) {
    const post = await this.prisma.post.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!post) throw new NotFoundException();
    this.assertCanDelete(post, actor, 'delete');
    await this.prisma.post.delete({ where: { id } });
    return { ok: true };
  }

  async purgeExpired() {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);
    await this.prisma.post.deleteMany({
      where: { deletedAt: { lte: cutoff } },
    });
  }

  private daysRemaining(deletedAt: Date) {
    const remaining = deletedAt.getTime() + TRASH_RETENTION_MS - Date.now();
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  }

  private assertCanDelete(
    post: { authorId: string | null },
    actor: Actor,
    action: 'delete' | 'restore' = 'delete',
  ) {
    const isEditor = canPublishPosts(actor.role);
    if (!isEditor && post.authorId !== actor.sub) {
      throw new ForbiddenException(
        action === 'restore'
          ? 'You can only restore your own posts'
          : 'You can only delete your own posts',
      );
    }
  }

  // ─── Revisions ────────────────────────────────────────────────────────────

  async getRevisions(postId: string, actor: Actor) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException();
    if (actor.role === Role.AUTHOR && post.authorId !== actor.sub) throw new ForbiddenException();

    const revisions = await this.prisma.revision.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { editor: { select: { id: true, displayName: true } } },
    });

    return revisions.map((r) => ({
      id: r.id,
      postId: r.postId,
      title: r.title,
      excerpt: r.excerpt,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
      editor: r.editor ? { id: r.editor.id, displayName: r.editor.displayName } : null,
    }));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Find a unique slug by appending -2, -3, ... until it doesn't collide.
   * Returns the input untouched if it's already free.
   */
  private async findUniqueSlug(base: string, excludePostId?: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.post.findFirst({
        where: {
          slug: candidate,
          ...(excludePostId ? { id: { not: excludePostId } } : {}),
          // Keep slugs reserved while the article is still in trash.
          OR: [{ deletedAt: null }, { deletedAt: { not: null } }],
        },
      })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
      if (suffix > 100) {
        // Safety net so we don't loop forever on a runaway data set.
        return `${base}-${Date.now()}`;
      }
    }
    return candidate;
  }

  private async syncCategories(
    postId: string,
    categoryIds: string[],
    primaryCategoryId: string | null,
  ) {
    await this.prisma.postCategory.deleteMany({ where: { postId } });
    for (const catId of categoryIds) {
      await this.prisma.postCategory.create({
        data: { postId, categoryId: catId, isPrimary: catId === primaryCategoryId },
      });
    }
  }

  private async syncTags(postId: string, tagIds: string[]) {
    await this.prisma.postTag.deleteMany({ where: { postId } });
    for (const tagId of tagIds) {
      await this.prisma.postTag.create({ data: { postId, tagId } });
    }
  }

  /** Resolve free-form labels to Tag rows (find-or-create by slug), then sync join table. */
  private async syncTagNames(postId: string, tagNames: string[]) {
    const seenSlugs = new Set<string>();
    const tagIds: string[] = [];

    for (const raw of tagNames) {
      const name = raw.trim().replace(/\s+/g, ' ');
      if (!name) continue;
      const slug = slugify(name);
      if (!slug || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      let tag = await this.prisma.tag.findUnique({ where: { slug } });
      if (!tag) {
        tag = await this.prisma.tag.create({ data: { name, slug } });
      }
      tagIds.push(tag.id);
    }

    await this.syncTags(postId, tagIds);
  }

  private async syncBulbi(
    postId: string,
    bulbi: Array<{ label: string; postId?: string | null; externalUrl?: string | null }>,
    selfPostId: string | null,
  ) {
    const seenLinks = new Set<string>();
    const normalized: Array<{
      label: string;
      linkedPostId: string | null;
      externalUrl: string | null;
    }> = [];

    for (const item of bulbi) {
      const label = item.label?.trim();
      if (!label) continue;
      const link = readBumbLink(item);
      const externalUrl = link.externalUrl;
      const linkedPostId = link.postId;
      if (linkedPostId) {
        if (selfPostId && linkedPostId === selfPostId) {
          throw new BadRequestException('Bumbi cannot link an article to itself');
        }
        if (seenLinks.has(linkedPostId)) {
          throw new BadRequestException('Duplicate linked article in bumbi');
        }
        seenLinks.add(linkedPostId);
      }
      normalized.push({ label, linkedPostId, externalUrl });
    }

    const linkedIds = normalized
      .map((item) => item.linkedPostId)
      .filter((id): id is string => !!id);
    if (linkedIds.length > 0) {
      const linkedPosts = await this.prisma.post.findMany({
        where: {
          id: { in: linkedIds },
          status: PostStatus.PUBLISHED,
        },
        select: { id: true },
      });
      if (linkedPosts.length !== linkedIds.length) {
        throw new BadRequestException('Bumbi can only link published articles');
      }
    }

    await this.prisma.postBulb.deleteMany({ where: { postId } });
    for (const [index, item] of normalized.entries()) {
      await this.prisma.postBulb.create({
        data: {
          postId,
          linkedPostId: item.linkedPostId,
          externalUrl: item.externalUrl,
          sortOrder: index,
          label: item.label,
        },
      });
    }
  }

  private async syncPhotoCaptions(postId: string, captions: Array<{ label: string }>) {
    const normalized = [...captions.map((item) => item.label ?? '')];
    while (normalized.length > 0 && !normalized[normalized.length - 1]?.trim()) {
      normalized.pop();
    }

    await this.prisma.postPhotoCaption.deleteMany({ where: { postId } });
    for (const [index, label] of normalized.entries()) {
      await this.prisma.postPhotoCaption.create({
        data: {
          postId,
          sortOrder: index,
          label,
        },
      });
    }
  }

  private async syncPostPills(
    postId: string,
    pills: Array<{
      pillId?: string | null;
      pillText?: string | null;
      pillColor?: string | null;
      pillTextColor?: string | null;
      corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;
      size?: 'smaller' | 'default' | 'bigger';
    }>,
  ) {
    type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    type Size = 'smaller' | 'default' | 'bigger';
    const resolved: Array<{ pillId: string; corner: Corner | null; size: Size }> = [];
    const seenPillIds = new Set<string>();

    for (const item of pills) {
      let pillId: string | null = null;
      if (item.pillText?.trim() && item.pillColor) {
        const pill = await this.pills.findOrCreate(
          item.pillText,
          item.pillColor,
          item.pillTextColor ?? '#ffffff',
        );
        pillId = pill.id;
      } else if (item.pillId) {
        pillId = item.pillId;
      }
      if (!pillId) continue;
      if (seenPillIds.has(pillId)) {
        throw new BadRequestException('Same pill cannot be attached more than once');
      }
      seenPillIds.add(pillId);
      resolved.push({
        pillId,
        corner: item.corner ?? null,
        size: item.size ?? 'default',
      });
    }

    if (resolved.length > 4) {
      throw new BadRequestException('Maximum 4 pills per article');
    }
    if (resolved.length > 1) {
      for (const row of resolved) {
        if (!row.corner) {
          throw new BadRequestException('Corner is required when multiple pills are set');
        }
      }
    }
    const corners = resolved.map((r) => r.corner).filter((c): c is Corner => !!c);
    if (new Set(corners).size !== corners.length) {
      throw new BadRequestException('Each pill must use a different corner');
    }

    const existingIds = [...seenPillIds];
    if (existingIds.length > 0) {
      const found = await this.prisma.pill.findMany({
        where: { id: { in: existingIds } },
        select: { id: true },
      });
      if (found.length !== existingIds.length) {
        throw new BadRequestException('One or more pills were not found');
      }
    }

    await this.prisma.postPill.deleteMany({ where: { postId } });
    for (const row of resolved) {
      await this.prisma.postPill.create({
        data: {
          postId,
          pillId: row.pillId,
          corner: row.corner,
          size: row.size,
        },
      });
    }
  }

  private async createRevision(postId: string, editorId: string, message: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) return;
    await this.prisma.revision.create({
      data: {
        postId,
        title: post.title,
        excerpt: post.excerpt,
        contentHtml: post.contentHtml,
        editorId,
        message,
      },
    });
  }
}

function readBumbLink(item: { postId?: string | null; externalUrl?: string | null }): {
  postId: string | null;
  externalUrl: string | null;
} {
  const rawUrl = item.externalUrl?.trim() || null;
  const postId = item.postId?.trim() || null;
  if (rawUrl && postId) {
    throw new BadRequestException('Un bumb poate avea fie un articol, fie un link extern');
  }
  return { postId, externalUrl: readBumbExternalUrl(rawUrl) };
}

function readBumbExternalUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  const safe = safeHttpUrl(trimmed);
  if (!safe) {
    throw new BadRequestException(
      'Linkul extern al bumbului trebuie să fie o adresă http sau https',
    );
  }
  return safe;
}
