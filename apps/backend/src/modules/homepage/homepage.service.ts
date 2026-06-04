import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { mapPostSummary } from '../posts/posts.mapper';
import { HomepageSlotType, PostStatus } from '@prisma/client';
import type { PostSummary } from '@civicpress/shared';

const POST_SUMMARY_INCLUDE = {
  heroMedia: true,
  author: true,
  categories: { include: { category: true } },
} as const;

const PUBLISHED = { status: PostStatus.PUBLISHED };

@Injectable()
export class HomepageService {
  constructor(private prisma: PrismaService) {}

  // ─── Public home (with slot fallback) ─────────────────────────────────────

  async getPublicHome() {
    const [slots, menuCategories] = await Promise.all([
      this.prisma.homepageSlot.findMany({
        include: { post: { include: POST_SUMMARY_INCLUDE } },
        orderBy: { position: 'asc' },
      }),
      this.prisma.category.findMany({
        where: { showInMenu: true },
        orderBy: { menuOrder: 'asc' },
      }),
    ]);

    const publishedSlots = slots.filter((s) => s.post.status === PostStatus.PUBLISHED);
    const usedIds = new Set<string>();

    // ── Hero ──────────────────────────────────────────────────────────────
    let hero: PostSummary | null = null;
    const heroSlot = publishedSlots.find(
      (s) => s.slotType === HomepageSlotType.HERO && s.position === 0,
    );
    if (heroSlot) {
      hero = mapPostSummary(heroSlot.post);
      usedIds.add(heroSlot.post.id);
    } else {
      const latest = await this.prisma.post.findFirst({
        where: PUBLISHED,
        orderBy: { publishedAt: 'desc' },
        include: POST_SUMMARY_INCLUDE,
      });
      if (latest) {
        hero = mapPostSummary(latest);
        usedIds.add(latest.id);
      }
    }

    // ── Grid (4) ──────────────────────────────────────────────────────────
    const gridSlots = publishedSlots
      .filter((s) => s.slotType === HomepageSlotType.GRID)
      .sort((a, b) => a.position - b.position)
      .slice(0, 4);

    const grid: PostSummary[] = gridSlots.map((s) => {
      usedIds.add(s.post.id);
      return mapPostSummary(s.post);
    });

    if (grid.length < 4) {
      const fill = await this.prisma.post.findMany({
        where: { ...PUBLISHED, id: { notIn: [...usedIds] } },
        orderBy: { publishedAt: 'desc' },
        take: 4 - grid.length,
        include: POST_SUMMARY_INCLUDE,
      });
      for (const p of fill) {
        usedIds.add(p.id);
        grid.push(mapPostSummary(p));
      }
    }

    // ── List (≥10) ────────────────────────────────────────────────────────
    const listSlots = publishedSlots
      .filter((s) => s.slotType === HomepageSlotType.LIST)
      .sort((a, b) => a.position - b.position);

    const list: PostSummary[] = listSlots.map((s) => {
      usedIds.add(s.post.id);
      return mapPostSummary(s.post);
    });

    if (list.length < 10) {
      const fill = await this.prisma.post.findMany({
        where: { ...PUBLISHED, id: { notIn: [...usedIds] } },
        orderBy: { publishedAt: 'desc' },
        take: 10 - list.length,
        include: POST_SUMMARY_INCLUDE,
      });
      for (const p of fill) {
        usedIds.add(p.id);
        list.push(mapPostSummary(p));
      }
    }

    // ── Category strips (sidebar) ──────────────────────────────────────────
    const categoryStrips = await Promise.all(
      menuCategories.map(async (cat) => {
        const posts = await this.prisma.post.findMany({
          where: { ...PUBLISHED, categories: { some: { categoryId: cat.id } } },
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

    return { hero, grid, list, categoryStrips };
  }

  // ─── Admin read ───────────────────────────────────────────────────────────

  async getAdminConfig() {
    const slots = await this.prisma.homepageSlot.findMany({
      include: { post: { include: POST_SUMMARY_INCLUDE } },
      orderBy: { position: 'asc' },
    });

    const heroSlot = slots.find((s) => s.slotType === HomepageSlotType.HERO && s.position === 0);
    const hero = heroSlot ? mapPostSummary(heroSlot.post) : null;

    const gridSlots = slots
      .filter((s) => s.slotType === HomepageSlotType.GRID)
      .sort((a, b) => a.position - b.position);
    const grid: (PostSummary | null)[] = Array.from({ length: 4 }, (_, i) => {
      const s = gridSlots.find((x) => x.position === i);
      return s ? mapPostSummary(s.post) : null;
    });

    const listSlots = slots
      .filter((s) => s.slotType === HomepageSlotType.LIST)
      .sort((a, b) => a.position - b.position);
    const list: (PostSummary | null)[] = listSlots.map((s) => mapPostSummary(s.post));

    return { hero, grid, list };
  }

  // ─── Admin write ──────────────────────────────────────────────────────────

  async saveConfig(
    dto: { hero?: string | null; grid: (string | null)[]; list: (string | null)[] },
    updatedById: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.homepageSlot.deleteMany({});

      const inserts: Array<{
        slotType: HomepageSlotType;
        position: number;
        postId: string;
        updatedById: string;
      }> = [];

      if (dto.hero) {
        inserts.push({
          slotType: HomepageSlotType.HERO,
          position: 0,
          postId: dto.hero,
          updatedById,
        });
      }

      dto.grid.forEach((id, i) => {
        if (id)
          inserts.push({ slotType: HomepageSlotType.GRID, position: i, postId: id, updatedById });
      });

      dto.list.forEach((id, i) => {
        if (id)
          inserts.push({ slotType: HomepageSlotType.LIST, position: i, postId: id, updatedById });
      });

      if (inserts.length > 0) {
        await tx.homepageSlot.createMany({ data: inserts });
      }
    });

    return { ok: true };
  }
}
