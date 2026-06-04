import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { FastifyRequest } from 'fastify';
import { AuditService } from './audit.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const method = req.method.toUpperCase();

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = (req as unknown as Record<string, unknown>)['user'] as JwtPayload | undefined;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap((response) => {
        try {
          const urlPath = req.routerPath || req.url;
          const action = this.deriveAction(method, urlPath);
          if (!action) return;

          const derived = this.deriveEntity(response, urlPath, req);
          if (!derived) return;
          const { entity, entityId } = derived;

          const body = req.body as Record<string, unknown> | undefined;
          const diff = body
            ? Object.fromEntries(
                Object.entries(body).filter(
                  ([k]) => !['contentHtml', 'password', 'passwordHash'].includes(k),
                ),
              )
            : null;

          // For login the actor is the user just authenticated (not yet on req.user).
          const res = response as Record<string, unknown> | null | undefined;
          const actorId =
            user?.sub ??
            (action === 'USER_LOGIN' ? (res?.['id'] as string | undefined) : undefined);

          this.audit
            .log({ actorId, action, entity, entityId, diff, ip, userAgent })
            .catch(() => {});
        } catch {
          // Audit logging must never break the primary request path.
        }
      }),
    );
  }

  private deriveAction(method: string, path: string): string | null {
    if (path.includes('/v1/auth/login') && method === 'POST') return 'USER_LOGIN';
    if (path.includes('/v1/auth/logout') && method === 'POST') return 'USER_LOGOUT';
    if (path.includes('/transition')) return 'POST_TRANSITIONED';
    if (path.includes('/v1/posts') && method === 'POST') return 'POST_CREATED';
    if (path.includes('/v1/posts') && method === 'PATCH') return 'POST_UPDATED';
    if (path.includes('/v1/posts') && method === 'DELETE') return 'POST_DELETED';
    if (path.includes('/v1/media/upload') && method === 'POST') return 'MEDIA_UPLOADED';
    if (path.includes('/v1/users/invite') && method === 'POST') return 'USER_INVITED';
    if (path.includes('/v1/users') && method === 'PATCH') return 'USER_UPDATED';
    if (path.includes('/v1/me') && method === 'PATCH') return 'USER_UPDATED';
    if (path.includes('/v1/settings') && method === 'PATCH') return 'SETTINGS_UPDATED';
    if (path.includes('/v1/admin/categories/order') && method === 'PUT')
      return 'CATEGORY_REORDERED';
    if (path.includes('/v1/admin/categories') && method === 'POST') return 'CATEGORY_CREATED';
    if (path.includes('/v1/admin/categories') && method === 'PATCH') return 'CATEGORY_UPDATED';
    if (path.includes('/v1/admin/categories') && method === 'DELETE') return 'CATEGORY_DELETED';
    return null;
  }

  private deriveEntity(
    response: unknown,
    path: string,
    _req: FastifyRequest,
  ): { entity: string; entityId: string } | null {
    const res = response as Record<string, unknown> | null | undefined;
    if (path.includes('/v1/auth')) {
      return { entity: 'user', entityId: (res?.['id'] as string) || 'unknown' };
    }
    if (path.includes('/v1/posts')) {
      return { entity: 'post', entityId: (res?.['id'] as string) || 'unknown' };
    }
    if (path.includes('/v1/media')) {
      return { entity: 'media', entityId: (res?.['id'] as string) || 'unknown' };
    }
    if (path.includes('/v1/users') || path.includes('/v1/me')) {
      return { entity: 'user', entityId: (res?.['id'] as string) || 'unknown' };
    }
    if (path.includes('/v1/settings')) {
      return { entity: 'settings', entityId: 'default' };
    }
    if (path.includes('/v1/admin/categories')) {
      return { entity: 'category', entityId: (res?.['id'] as string) || 'bulk' };
    }
    return null;
  }
}
