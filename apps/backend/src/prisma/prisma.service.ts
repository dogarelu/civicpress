import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const POST_READ_ACTIONS = new Set<Prisma.PrismaAction>([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

/** True when the caller already decided how deleted posts should be treated. */
function mentionsDeletedAt(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(mentionsDeletedAt);
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'deletedAt' || mentionsDeletedAt(nested)) return true;
  }
  return false;
}

function excludeTrashedPosts(where: Record<string, unknown> | undefined) {
  if (mentionsDeletedAt(where)) return where;
  if (!where || Object.keys(where).length === 0) return { deletedAt: null };
  return { AND: [where, { deletedAt: null }] };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // List/count queries hide trash unless the caller sets deletedAt explicitly.
    // findUnique stays unfiltered so lookups by id (analytics, restore) still resolve.
    this.$use(async (params, next) => {
      if (params.model === 'Post' && POST_READ_ACTIONS.has(params.action)) {
        const args = (params.args ?? {}) as { where?: Record<string, unknown> };
        args.where = excludeTrashedPosts(args.where);
        params.args = args;
      }
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
