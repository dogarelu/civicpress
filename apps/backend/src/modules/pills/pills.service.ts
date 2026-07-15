import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PillCreate, PillUpdate } from '@civicpress/shared';

@Injectable()
export class PillsService {
  constructor(private prisma: PrismaService) {}

  async listAdmin() {
    const pills = await this.prisma.pill.findMany({
      orderBy: [{ text: 'asc' }, { createdAt: 'desc' }],
      include: {
        posts: {
          select: { id: true, title: true, slug: true, status: true },
          orderBy: { updatedAt: 'desc' },
        },
        _count: { select: { posts: true } },
      },
    });

    return pills.map((pill) => ({
      id: pill.id,
      text: pill.text,
      color: pill.color,
      textColor: pill.textColor,
      postCount: pill._count.posts,
      posts: pill.posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
      })),
      createdAt: pill.createdAt.toISOString(),
      updatedAt: pill.updatedAt.toISOString(),
    }));
  }

  /** Simple list for post editor dropdown. */
  async listForPicker() {
    const pills = await this.prisma.pill.findMany({
      orderBy: [{ text: 'asc' }, { createdAt: 'desc' }],
    });
    return pills.map((p) => ({ id: p.id, text: p.text, color: p.color, textColor: p.textColor }));
  }

  async create(data: PillCreate) {
    const pill = await this.prisma.pill.create({
      data: {
        text: data.text.trim(),
        color: data.color,
        textColor: data.textColor ?? '#ffffff',
      },
    });
    return { id: pill.id, text: pill.text, color: pill.color, textColor: pill.textColor };
  }

  async update(id: string, data: PillUpdate) {
    const existing = await this.prisma.pill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Pill not found: ${id}`);

    const pill = await this.prisma.pill.update({
      where: { id },
      data: {
        ...(data.text !== undefined ? { text: data.text.trim() } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.textColor !== undefined ? { textColor: data.textColor } : {}),
      },
    });
    return { id: pill.id, text: pill.text, color: pill.color, textColor: pill.textColor };
  }

  async delete(id: string) {
    const existing = await this.prisma.pill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Pill not found: ${id}`);

    await this.prisma.pill.delete({ where: { id } });
    return { ok: true, id };
  }

  /** Detach pill from a specific post without deleting the global pill. */
  async detachFromPost(pillId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException(`Post not found: ${postId}`);
    if (post.pillId !== pillId) {
      throw new NotFoundException(`Post is not linked to pill: ${pillId}`);
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { pillId: null },
    });
    return { ok: true, postId, pillId };
  }

  /**
   * Find existing pill by text+color or create a new global pill.
   * Used when creating pills inline from post editor.
   */
  async findOrCreate(text: string, color: string, textColor = '#ffffff') {
    const normalizedText = text.trim();
    const existing = await this.prisma.pill.findFirst({
      where: { text: normalizedText, color, textColor },
    });
    if (existing) return existing;

    return this.prisma.pill.create({
      data: { text: normalizedText, color, textColor },
    });
  }
}
