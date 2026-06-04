import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import type { FastifyReply } from 'fastify';
import type { CookieSerializeOptions } from '@fastify/cookie';

const ACCESS_TTL = 15 * 60; // 15 min in seconds
const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string, res: FastifyReply) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: ACCESS_TTL });
    const refreshToken = await this.jwt.signAsync(payload, { expiresIn: REFRESH_TTL });

    this.setCookies(res, accessToken, refreshToken);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      slug: user.slug,
      role: user.role,
      avatarUrl: null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async refresh(refreshToken: string, res: FastifyReply) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const newPayload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(newPayload, { expiresIn: ACCESS_TTL });
    const newRefreshToken = await this.jwt.signAsync(newPayload, { expiresIn: REFRESH_TTL });

    this.setCookies(res, accessToken, newRefreshToken);
    return { ok: true };
  }

  logout(res: FastifyReply) {
    const r = res as unknown as {
      clearCookie: (name: string, opts: Record<string, unknown>) => void;
    };
    r.clearCookie('access_token', { path: '/' });
    r.clearCookie('refresh_token', { path: '/' });
    return { ok: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { avatar: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      slug: user.slug,
      role: user.role,
      avatarUrl: user.avatar
        ? `${process.env.MEDIA_BASE_URL || 'http://localhost:3000'}/v1/media/${user.avatar.id}/orig`
        : null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  private setCookies(res: FastifyReply, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const opts = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
    const r = res as unknown as {
      setCookie: (name: string, value: string, opts: Record<string, unknown>) => void;
    };
    r.setCookie('access_token', accessToken, { ...opts, maxAge: ACCESS_TTL });
    r.setCookie('refresh_token', refreshToken, { ...opts, maxAge: REFRESH_TTL });
  }
}
