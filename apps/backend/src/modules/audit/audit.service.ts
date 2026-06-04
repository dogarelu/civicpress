import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
}
