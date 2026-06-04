import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(private prisma: PrismaService) {}

  async getMenu() {
    const cats = await this.prisma.category.findMany({
      where: { showInMenu: true },
      orderBy: { menuOrder: 'asc' },
    });
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      color: c.color,
      menuOrder: c.menuOrder,
    }));
  }

  async getBySlug(slug: string, page = 1, perPage = 15) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException(`Category not found: ${slug}`);

    const skip = (page - 1) * perPage;

    const [total, posts] = await Promise.all([
      this.prisma.post.count({
        where: { status: 'PUBLISHED', categories: { some: { categoryId: category.id } } },
      }),
      this.prisma.post.findMany({
        where: { status: 'PUBLISHED', categories: { some: { categoryId: category.id } } },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: perPage,
        include: {
          heroMedia: true,
          author: true,
          categories: { include: { category: true } },
        },
      }),
    ]);

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      color: category.color,
      description: category.description,
      posts: posts.map(mapPostSummary),
      total,
      page,
      perPage,
    };
  }

  // ─── Admin CRUD ───────────────────────────────────────────────────────────────

  async listAdmin() {
    const cats = await this.prisma.category.findMany({
      orderBy: [{ menuOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { posts: true } } },
    });
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      color: c.color,
      description: c.description,
      showInMenu: c.showInMenu,
      menuOrder: c.menuOrder,
      postCount: c._count.posts,
    }));
  }

  async createCategory(data: CategoryCreate) {
    const slug = data.slug ?? slugify(data.name);
    const max = await this.prisma.category.aggregate({ _max: { menuOrder: true } });

    try {
      return await this.prisma.category.create({
        data: {
          name: data.name,
          slug,
          color: data.color ?? null,
          description: data.description ?? null,
          showInMenu: data.showInMenu ?? true,
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

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.showInMenu !== undefined ? { showInMenu: data.showInMenu } : {}),
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
