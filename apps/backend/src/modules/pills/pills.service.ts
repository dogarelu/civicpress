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
        postPills: {
          include: {
            post: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                updatedAt: true,
                deletedAt: true,
              },
            },
          },
          orderBy: { post: { updatedAt: 'desc' } },
        },
      },
    });

    return pills.map((pill) => {
      const posts = pill.postPills
        .filter((pp) => !pp.post.deletedAt)
        .map((pp) => ({
          id: pp.post.id,
          title: pp.post.title,
          slug: pp.post.slug,
          status: pp.post.status,
        }));
      return {
        id: pill.id,
        text: pill.text,
        color: pill.color,
        textColor: pill.textColor,
        postCount: posts.length,
        posts,
        createdAt: pill.createdAt.toISOString(),
        updatedAt: pill.updatedAt.toISOString(),
      };
    });
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
    const link = await this.prisma.postPill.findUnique({
      where: { postId_pillId: { postId, pillId } },
    });
    if (!link) {
      throw new NotFoundException(`Post is not linked to pill: ${pillId}`);
    }

    await this.prisma.postPill.delete({
      where: { postId_pillId: { postId, pillId } },
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
