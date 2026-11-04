import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LayoutService } from '../layout/layout.service';
import { mapPostSummary } from '../posts/posts.mapper';
import type { CategoryCreate, CategoryUpdate } from '@civicpress/shared';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private layout: LayoutService,
  ) {}

  private async normalizeParentId(parentId: string | null | undefined, categoryId?: string) {
    if (parentId === undefined) return undefined;
    if (parentId === null) return null;
    if (categoryId && parentId === categoryId) {
      throw new BadRequestException('O categorie nu poate fi propriul părinte.');
    }
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      throw new NotFoundException(`Categoria părinte nu există: ${parentId}`);
    }
    if (parent.parentId) {
      throw new BadRequestException('Doar categoriile principale pot avea subcategorii.');
    }
    return parent.id;
  }

  private async assertCanBecomeSubcategory(categoryId: string) {
    const childCount = await this.prisma.category.count({ where: { parentId: categoryId } });
    if (childCount > 0) {
      throw new BadRequestException(
        'Categoria are deja subcategorii și nu poate deveni subcategorie.',
      );
    }
  }

  async getMenu(variant: 'web' | 'mobile' | 'mobile-row' = 'web') {
    const where =
      variant === 'mobile'
        ? { showInMobileMenu: true }
        : variant === 'mobile-row'
          ? { showInMobileRow: true }
          : { showInMenu: true };
    const cats = await this.prisma.category.findMany({
      where,
      orderBy: { menuOrder: 'asc' },
    });
    const byId = new Map(cats.map((cat) => [cat.id, cat]));
    const childrenByParent = new Map<string, typeof cats>();

    for (const cat of cats) {
      if (!cat.parentId || !byId.has(cat.parentId)) continue;
      const siblings = childrenByParent.get(cat.parentId) ?? [];
      siblings.push(cat);
      childrenByParent.set(cat.parentId, siblings);
    }

    return cats
      .filter((cat) => !cat.parentId || !byId.has(cat.parentId))
      .map((cat) => {
        const children = (childrenByParent.get(cat.id) ?? []).map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          color: child.color,
          menuOrder: child.menuOrder,
        }));
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          color: cat.color,
          menuOrder: cat.menuOrder,
          ...(children.length ? { children } : {}),
        };
      });
  }

  async getBySlug(slug: string, page = 1, perPage = 15) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: { select: { id: true, name: true, slug: true, color: true } },
        children: {
          select: { id: true, name: true, slug: true, color: true, menuOrder: true },
          orderBy: { menuOrder: 'asc' },
        },
      },
    });
    if (!category) throw new NotFoundException(`Category not found: ${slug}`);

    const isVideoCategory = slug === 'video';
    const categoryIds = [category.id, ...category.children.map((child) => child.id)];

    // Video archive: every published clip, including those pinned in other
    // modules / assigned to other categories. Skip WordPress imports.
    const postWhere = isVideoCategory
      ? {
          status: 'PUBLISHED' as const,
          videoUrl: { not: null },
          externalId: null,
        }
      : {
          status: 'PUBLISHED' as const,
          categories: { some: { categoryId: { in: categoryIds } } },
        };

    const categoryLayoutConfig = !isVideoCategory ? await this.layout.getConfig('category') : null;
    const layoutPageSize = categoryLayoutConfig
      ? this.layout.categoryLayoutPageSize(categoryLayoutConfig)
      : perPage;
    const effectivePerPage = !isVideoCategory ? layoutPageSize : perPage;
    const skip = (page - 1) * effectivePerPage;

    const [total, posts, resolved] = await Promise.all([
      this.prisma.post.count({ where: postWhere }),
      this.prisma.post.findMany({
        where: postWhere,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: effectivePerPage,
        include: {
          heroMedia: true,
          postPills: { include: { pill: true } },
          author: true,
          categories: { include: { category: true } },
          bulbi: {
            orderBy: { sortOrder: 'asc' },
            include: {
              linkedPost: {
                select: { id: true, slug: true, title: true, status: true, deletedAt: true },
              },
            },
          },
        },
      }),
      // Video category uses its own template; others use the configured module layout.
      !isVideoCategory
        ? this.layout.resolveCategoryLayout(category.id, { skip })
        : Promise.resolve(null),
    ]);

    const categoryListModule = categoryLayoutConfig?.modules.find((mod) => mod.type === 'list');
    const showSummary = categoryListModule?.options?.showSummary ?? true;
    const mappedPosts = posts.map((post) => mapPostSummary(post, { forceShowSummary: true }));

    let modules = resolved?.modules ?? null;
    let mobileOrder = resolved?.mobileOrder ?? [];
    let mobileModules = resolved?.mobileModules ?? [];

    // Page 2+ keeps the same sidebar but drops hero/grid/rows/etc. — main column is a list.
    const hasMainLayout =
      (resolved?.modules?.length ?? 0) > 0 || (resolved?.mobileModules?.length ?? 0) > 0;
    if (page > 1 && resolved && hasMainLayout) {
      const existingList = resolved.modules.find((mod) => mod.type === 'list');
      const listId = existingList?.id ?? 'category-paged-list';
      modules = [
        {
          id: listId,
          type: 'list',
          posts: mappedPosts.map((post) => ({
            post,
            showDate: post.showDate !== false,
            showAuthor: post.showAuthor !== false,
          })),
          title: null,
          showCategory: existingList?.showCategory ?? true,
          showSummary,
          hasMore: false,
          typography: existingList?.typography,
          backgroundColor: existingList?.backgroundColor,
          summaryRows: existingList?.summaryRows,
          summaryTypography: existingList?.summaryTypography,
        },
      ];
      mobileOrder = [{ kind: 'module', ref: listId }];
      mobileModules = [];
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      color: category.color,
      description: category.description,
      parent: category.parent,
      subcategories: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        color: child.color,
        menuOrder: child.menuOrder,
      })),
      posts: mappedPosts,
      total,
      page,
      perPage: effectivePerPage,
      modules,
      showSummary,
      sidebar: resolved?.sidebar ?? null,
      mobileOrder,
      mobileModules,
    };
  }

  // ─── Admin CRUD ───────────────────────────────────────────────────────────────

  async listAdmin() {
    const cats = await this.prisma.category.findMany({
      orderBy: [{ menuOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { posts: { where: { post: { deletedAt: null } } } } } },
    });
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      color: c.color,
      description: c.description,
      parentId: c.parentId,
      showInMenu: c.showInMenu,
      showInMobileMenu: c.showInMobileMenu,
      showInMobileRow: c.showInMobileRow,
      menuOrder: c.menuOrder,
      postCount: c._count.posts,
    }));
  }

  async createCategory(data: CategoryCreate) {
    const slug = data.slug ?? slugify(data.name);
    const max = await this.prisma.category.aggregate({ _max: { menuOrder: true } });
    const parentId = await this.normalizeParentId(data.parentId, undefined);

    try {
      return await this.prisma.category.create({
        data: {
          name: data.name,
          slug,
          color: data.color ?? null,
          description: data.description ?? null,
          parentId: parentId ?? null,
          showInMenu: data.showInMenu ?? true,
          showInMobileMenu: data.showInMobileMenu ?? true,
          showInMobileRow: data.showInMobileRow ?? true,
          menuOrder: (max._max.menuOrder ?? 0) + 1,
        },
      });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === 'P2002') {
        throw new ConflictException(`Slug "${slug}" already exists`);
      }
      throw err;
    }
  }

  async updateCategory(id: string, data: CategoryUpdate) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Category not found: ${id}`);

    const slug = data.slug !== undefined ? data.slug : undefined;
    const parentId = await this.normalizeParentId(data.parentId, id);
    if (parentId !== undefined && parentId !== null) {
      await this.assertCanBecomeSubcategory(id);
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(parentId !== undefined ? { parentId } : {}),
          ...(data.showInMenu !== undefined ? { showInMenu: data.showInMenu } : {}),
          ...(data.showInMobileMenu !== undefined
            ? { showInMobileMenu: data.showInMobileMenu }
            : {}),
          ...(data.showInMobileRow !== undefined ? { showInMobileRow: data.showInMobileRow } : {}),
        },
      });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === 'P2002') {
        throw new ConflictException(`Slug "${slug}" already exists`);
      }
      throw err;
    }
  }

  async deleteCategory(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Category not found: ${id}`);

    await this.prisma.category.delete({ where: { id } });
    return { ok: true, id };
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, idx) =>
        this.prisma.category.update({ where: { id }, data: { menuOrder: idx } }),
      ),
    );
    return { ok: true };
  }
}
