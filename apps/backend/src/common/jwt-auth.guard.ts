import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const tokens = this.extractTokens(request);
    if (!tokens.length) throw new UnauthorizedException();

    for (const token of tokens) {
      try {
        const payload = await this.jwt.verifyAsync(token);
        (request as unknown as Record<string, unknown>)['user'] = payload;
        return true;
      } catch {
        // Try the next available token. This lets a valid refresh cookie keep the
        // session alive when the short-lived access cookie has expired.
      }
    }

    throw new UnauthorizedException();
  }

  private extractTokens(request: FastifyRequest): string[] {
    const cookies = (request as unknown as Record<string, unknown>)['cookies'] as
      | Record<string, string>
      | undefined;
    const tokens: string[] = [];
    if (cookies?.['access_token']) tokens.push(cookies['access_token']);
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) tokens.push(auth.slice(7));
    if (cookies?.['refresh_token']) tokens.push(cookies['refresh_token']);
    return tokens;
  }
}
