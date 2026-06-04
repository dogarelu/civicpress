import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { mapPostSummary, mapPostDetail } from './posts.mapper';
import { PostStatus, Role } from '@prisma/client';

const POST_INCLUDE = {
  heroMedia: true,
  author: { include: { avatar: true } },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} as const;

const POST_SUMMARY_INCLUDE = {
  heroMedia: true,
  author: true,
  categories: { include: { category: true } },
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

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  // ─── Public read ──────────────────────────────────────────────────────────

  async getHome() {
    const published = { status: PostStatus.PUBLISHED };

    const hero = await this.prisma.post.findFirst({
      where: published,
      orderBy: { publishedAt: 'desc' },
      include: POST_SUMMARY_INCLUDE,
    });

    const featured = await this.prisma.post.findMany({
      where: { ...published, id: { not: hero?.id ?? '' } },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      include: POST_SUMMARY_INCLUDE,
    });

    const menuCategories = await this.prisma.category.findMany({
      where: { showInMenu: true },
      orderBy: { menuOrder: 'asc' },
    });

    const categoryStrips = await Promise.all(
      menuCategories.map(async (cat) => {
        const posts = await this.prisma.post.findMany({
          where: { ...published, categories: { some: { categoryId: cat.id } } },
          orderBy: { publishedAt: 'desc' },
          take: 3,
          include: POST_SUMMARY_INCLUDE,
        });
        return {
          category: { id: cat.id, name: cat.name, slug: cat.slug, color: cat.color },
          posts: posts.map(mapPostSummary),
        };
      }),
    );

    return {
      hero: hero ? mapPostSummary(hero) : null,
      featured: featured.map(mapPostSummary),
      categoryStrips,
    };
  }

  async getBySlug(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED },
      include: POST_INCLUDE,
    });
    if (!post) throw new NotFoundException(`Post not found: ${slug}`);

    const primaryCat = post.categories.find((c) => c.isPrimary) ?? post.categories[0];
    const relatedPosts = primaryCat
      ? await this.prisma.post.findMany({
          where: {
            status: PostStatus.PUBLISHED,
            id: { not: post.id },
            categories: { some: { categoryId: primaryCat.categoryId } },
          },
          orderBy: { publishedAt: 'desc' },
          take: 3,
          include: POST_SUMMARY_INCLUDE,
        })
      : [];

    return {
      ...mapPostDetail(post),
      relatedPosts: relatedPosts.map(mapPostSummary),
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
    if (search) where['title'] = { contains: search, mode: 'insensitive' };

    const [total, posts] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: perPage,
        include: POST_SUMMARY_INCLUDE,
      }),
    ]);

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
    return {
      ...mapPostDetail(post),
      status: post.status,
      scheduledFor: post.scheduledFor?.toISOString() ?? null,
      relatedPosts: [],
    };
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(
    data: {
      title: string;
      slug?: string;
      excerpt?: string | null;
      contentHtml?: string;
      heroMediaId?: string | null;
      videoUrl?: string | null;
      categoryIds?: string[];
      primaryCategoryId?: string | null;
      tagIds?: string[];
      seoTitle?: string | null;
      seoDescription?: string | null;
    },
    actor: Actor,
  ) {
    const baseSlug = data.slug || slugify(data.title);
    const slug = await this.findUniqueSlug(baseSlug);

    const post = await this.prisma.post.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt ?? null,
        contentHtml: data.contentHtml ?? '',
        heroMediaId: data.heroMediaId ?? null,
        videoUrl: data.videoUrl ?? null,
        authorId: actor.sub,
        status: PostStatus.DRAFT,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      },
    });

    await this.syncCategories(post.id, data.categoryIds ?? [], data.primaryCategoryId ?? null);
    await this.syncTags(post.id, data.tagIds ?? []);
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
      heroMediaId?: string | null;
      videoUrl?: string | null;
      categoryIds?: string[];
      primaryCategoryId?: string | null;
      tagIds?: string[];
      seoTitle?: string | null;
      seoDescription?: string | null;
      slug?: string;
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

    const updated = await this.prisma.post.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.excerpt !== undefined ? { excerpt: data.excerpt } : {}),
        ...(data.contentHtml !== undefined ? { contentHtml: data.contentHtml } : {}),
        ...(data.heroMediaId !== undefined ? { heroMediaId: data.heroMediaId } : {}),
        ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
        ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
        ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
      },
    });

    if (data.categoryIds !== undefined) {
      await this.syncCategories(id, data.categoryIds, data.primaryCategoryId ?? null);
    }
    if (data.tagIds !== undefined) {
      await this.syncTags(id, data.tagIds);
    }

    await this.createRevision(id, actor.sub, 'Updated');
    return this.getByIdAdmin(updated.id, actor);
  }

  // ─── Workflow transition ───────────────────────────────────────────────────

  async transition(
    id: string,
    action: 'submit' | 'approve' | 'reject' | 'publish' | 'archive',
    actor: Actor,
    message?: string,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();

    const newStatus = this.computeTransition(post.status, action, actor);

    const updateData: Record<string, unknown> = { status: newStatus };
    if (action === 'submit') updateData['submittedById'] = actor.sub;
    if (action === 'approve' || action === 'publish') {
      updateData['approvedById'] = actor.sub;
      updateData['publishedAt'] = new Date();
    }

    const updated = await this.prisma.post.update({ where: { id }, data: updateData });
    await this.createRevision(id, actor.sub, message || `Transition: ${action}`);

    return { id: updated.id, status: updated.status };
  }

  private computeTransition(current: PostStatus, action: string, actor: Actor): PostStatus {
    const isEditor = actor.role === Role.EDITOR || actor.role === Role.ADMIN;
    switch (action) {
      case 'submit':
        if (current !== PostStatus.DRAFT && current !== PostStatus.IN_REVIEW) {
          throw new BadRequestException('Can only submit from DRAFT or IN_REVIEW');
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
      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(id: string, actor: Actor) {
    if (actor.role !== Role.ADMIN) throw new ForbiddenException('Only ADMIN can delete posts');
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
  private async findUniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (await this.prisma.post.findUnique({ where: { slug: candidate } })) {
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
