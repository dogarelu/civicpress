import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { mapPostSummary, mapPostDetail, mapPostBulbi } from './posts.mapper';
import { PostStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PillsService } from '../pills/pills.service';

const POST_SUMMARY_INCLUDE = {
  heroMedia: true,
  pill: true,
  author: true,
  categories: { include: { category: true } },
} as const;

const POST_BULBI_INCLUDE = {
  orderBy: { sortOrder: 'asc' as const },
  include: {
    linkedPost: { include: POST_SUMMARY_INCLUDE },
  },
} as const;

const POST_INCLUDE = {
  heroMedia: true,
  pill: true,
  author: { include: { avatar: true } },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
  bulbi: POST_BULBI_INCLUDE,
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

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private pills: PillsService,
  ) {}

  // ─── Public read ──────────────────────────────────────────────────────────

  async getBySlug(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED },
      include: POST_INCLUDE,
    });
    if (!post) throw new NotFoundException(`Post not found: ${slug}`);

    const incremented = await this.prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    const postWithViews = { ...post, viewCount: incremented.viewCount };

    const primaryCat =
      postWithViews.categories.find((c) => c.isPrimary) ?? postWithViews.categories[0];
    const [relatedPosts, latestPosts] = await Promise.all([
      primaryCat
        ? this.prisma.post.findMany({
            where: {
              status: PostStatus.PUBLISHED,
              id: { not: postWithViews.id },
              categories: { some: { categoryId: primaryCat.categoryId } },
            },
            orderBy: { publishedAt: 'desc' },
            take: 3,
            include: POST_SUMMARY_INCLUDE,
          })
        : Promise.resolve([]),
      this.prisma.post.findMany({
        where: { status: PostStatus.PUBLISHED, id: { not: postWithViews.id } },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        include: POST_SUMMARY_INCLUDE,
      }),
    ]);

    return {
      ...mapPostDetail(postWithViews),
      bulbi: mapPostBulbi(postWithViews.bulbi, { publishedOnly: true }),
      relatedPosts: relatedPosts.map((post) => mapPostSummary(post)),
      latestPosts: latestPosts.map((post) => mapPostSummary(post)),
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
    if (!post) throw new NotFoundException();
    if (actor.role === Role.AUTHOR && post.authorId !== actor.sub) throw new ForbiddenException();
    const mapped = mapPostDetail(post);
    return {
      ...mapped,
      excerpt: post.excerpt,
      showSummary: post.showSummary,
      status: post.status,
      scheduledFor: post.scheduledFor?.toISOString() ?? null,
      relatedPosts: [],
      latestPosts: [],
    };
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(
    data: {
      title: string;
      slug?: string;
      excerpt?: string | null;
      contentHtml?: string;
      publishedAt?: string | null;
      heroMediaId?: string | null;
      videoUrl?: string | null;
      categoryIds?: string[];
      primaryCategoryId?: string | null;
      tagIds?: string[];
      seoTitle?: string | null;
      seoDescription?: string | null;
      authorName?: string | null;
      showDate?: boolean;
      showAuthor?: boolean;
      showSummary?: boolean;
      pillId?: string | null;
      pillText?: string | null;
      pillColor?: string | null;
      pillTextColor?: string | null;
      bulbi?: Array<{ postId: string; labelOverride?: string | null }>;
    },
    actor: Actor,
  ) {
    const baseSlug = data.slug || slugify(data.title);
    const slug = await this.findUniqueSlug(baseSlug);

    const uploader = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: { displayName: true },
    });
    const authorName = data.authorName?.trim() || uploader?.displayName || null;
    const resolvedPillId = await this.resolvePillId(data);
    const publishedAt = toDateOrNull(data.publishedAt);
    const normalizedExcerpt = data.excerpt?.trim() ?? '';
    const fallbackShowSummary = normalizedExcerpt.length > 0;

    const post = await this.prisma.post.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt ?? null,
        contentHtml: data.contentHtml ?? '',
        heroMediaId: data.heroMediaId ?? null,
        videoUrl: data.videoUrl ?? null,
        pillId: resolvedPillId,
        authorId: actor.sub,
        authorName,
        showDate: data.showDate ?? true,
        showAuthor: data.showAuthor ?? true,
        showSummary: data.showSummary ?? fallbackShowSummary,
        publishedAt: publishedAt ?? null,
        status: PostStatus.DRAFT,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      },
    });

    await this.syncCategories(post.id, data.categoryIds ?? [], data.primaryCategoryId ?? null);
    await this.syncTags(post.id, data.tagIds ?? []);
    await this.syncBulbi(post.id, data.bulbi ?? [], null);
    await this.createRevision(post.id, actor.sub, 'Initial draft');

    return this.getByIdAdmin(post.id, actor);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    id: string,
    data: {
      title?: string;
      excerpt?: string | null;
      contentHtml?: string;
      publishedAt?: string | null;
      heroMediaId?: string | null;
      videoUrl?: string | null;
      categoryIds?: string[];
      primaryCategoryId?: string | null;
      tagIds?: string[];
      seoTitle?: string | null;
      seoDescription?: string | null;
      slug?: string;
      authorName?: string | null;
      showDate?: boolean;
      showAuthor?: boolean;
      showSummary?: boolean;
      pillId?: string | null;
      pillText?: string | null;
      pillColor?: string | null;
      pillTextColor?: string | null;
      bulbi?: Array<{ postId: string; labelOverride?: string | null }>;
    },
    actor: Actor,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();

    if (actor.role === Role.AUTHOR) {
      if (post.authorId !== actor.sub) throw new ForbiddenException();
      if (post.status !== PostStatus.DRAFT && post.status !== PostStatus.IN_REVIEW) {
        throw new ForbiddenException('Cannot edit a post past IN_REVIEW');
      }
    }
    // EDITORs cannot edit PUBLISHED posts directly — only ADMIN can.
    if (actor.role === Role.EDITOR && post.status === PostStatus.PUBLISHED) {
      throw new ForbiddenException(
        'EDITOR cannot edit PUBLISHED posts; archive first or ask an ADMIN.',
      );
    }

    const resolvedPillId =
      data.pillId !== undefined ||
      data.pillText !== undefined ||
      data.pillColor !== undefined ||
      data.pillTextColor !== undefined
        ? await this.resolvePillId(data)
        : undefined;
    const publishedAt = toDateOrNull(data.publishedAt);
    const excerptShowSummaryFallback =
      data.excerpt !== undefined ? (data.excerpt?.trim().length ?? 0) > 0 : undefined;
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
          : excerptShowSummaryFallback !== undefined
            ? { showSummary: excerptShowSummaryFallback }
            : {}),
        ...(resolvedPillId !== undefined ? { pillId: resolvedPillId } : {}),
      },
    });

    if (data.categoryIds !== undefined) {
      await this.syncCategories(id, data.categoryIds, data.primaryCategoryId ?? null);
    }
    if (data.tagIds !== undefined) {
      await this.syncTags(id, data.tagIds);
    }
    if (data.bulbi !== undefined) {
      await this.syncBulbi(id, data.bulbi, id);
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
    if (!post) throw new NotFoundException();

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
    const isEditor = actor.role === Role.EDITOR || actor.role === Role.ADMIN;
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
        if (!isEditor) throw new ForbiddenException('Only EDITOR/ADMIN can approve');
        if (current !== PostStatus.IN_REVIEW)
          throw new BadRequestException('Can only approve IN_REVIEW posts');
        return PostStatus.PUBLISHED;
      case 'reject':
        if (!isEditor) throw new ForbiddenException('Only EDITOR/ADMIN can reject');
        if (current !== PostStatus.IN_REVIEW)
          throw new BadRequestException('Can only reject IN_REVIEW posts');
        return PostStatus.DRAFT;
      case 'publish':
        if (!isEditor) throw new ForbiddenException('Only EDITOR/ADMIN can publish directly');
        return PostStatus.PUBLISHED;
      case 'archive':
        if (!isEditor) throw new ForbiddenException('Only EDITOR/ADMIN can archive');
        return PostStatus.ARCHIVED;
      case 'republish':
        if (!isEditor) throw new ForbiddenException('Only EDITOR/ADMIN can republish');
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
    if (!post) throw new NotFoundException();
    const isEditor = actor.role === Role.ADMIN || actor.role === Role.EDITOR;
    if (!isEditor && post.authorId !== actor.sub) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    await this.prisma.post.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Revisions ────────────────────────────────────────────────────────────

  async getRevisions(postId: string, actor: Actor) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
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
        where: { slug: candidate, ...(excludePostId ? { id: { not: excludePostId } } : {}) },
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

  private async syncBulbi(
    postId: string,
    bulbi: Array<{ postId: string; labelOverride?: string | null }>,
    selfPostId: string | null,
  ) {
    const seen = new Set<string>();
    const normalized: Array<{ postId: string; labelOverride: string | null }> = [];

    for (const item of bulbi) {
      const linkedPostId = item.postId?.trim();
      if (!linkedPostId) continue;
      if (selfPostId && linkedPostId === selfPostId) {
        throw new BadRequestException('Bulbi cannot link an article to itself');
      }
      if (seen.has(linkedPostId)) continue;
      seen.add(linkedPostId);
      normalized.push({
        postId: linkedPostId,
        labelOverride: item.labelOverride?.trim() ? item.labelOverride.trim() : null,
      });
    }

    if (normalized.length > 0) {
      const linkedPosts = await this.prisma.post.findMany({
        where: {
          id: { in: normalized.map((item) => item.postId) },
          status: PostStatus.PUBLISHED,
        },
        select: { id: true },
      });
      if (linkedPosts.length !== normalized.length) {
        throw new BadRequestException('Bulbi can only link published articles');
      }
    }

    await this.prisma.postBulb.deleteMany({ where: { postId } });
    for (const [index, item] of normalized.entries()) {
      await this.prisma.postBulb.create({
        data: {
          postId,
          linkedPostId: item.postId,
          sortOrder: index,
          labelOverride: item.labelOverride,
        },
      });
    }
  }

  private async resolvePillId(data: {
    pillId?: string | null;
    pillText?: string | null;
    pillColor?: string | null;
    pillTextColor?: string | null;
  }): Promise<string | null> {
    if (data.pillText?.trim() && data.pillColor) {
      const pill = await this.pills.findOrCreate(
        data.pillText,
        data.pillColor,
        data.pillTextColor ?? '#ffffff',
      );
      return pill.id;
    }
    if (data.pillId) return data.pillId;
    if (data.pillId === null) return null;
    if (data.pillText === null || data.pillColor === null) return null;
    return null;
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
