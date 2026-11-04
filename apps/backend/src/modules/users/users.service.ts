import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { Role } from '@prisma/client';
import { randomBytes } from 'node:crypto';

const MEDIA_BASE = process.env.MEDIA_BASE_URL || 'http://localhost:3000';

function normalizePseudonyms(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= 20) break;
  }
  return result;
}

function mapMe(user: {
  id: string;
  email: string;
  displayName: string;
  slug: string;
  role: Role;
  createdAt: Date;
  pseudonyms?: string[];
  avatar?: { id: string } | null;
  notificationEmail?: string | null;
  signalNumber?: string | null;
  notifyReviewEmail?: boolean;
  notifyReviewSignal?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    slug: user.slug,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    avatarUrl: user.avatar ? `${MEDIA_BASE}/v1/media/${user.avatar.id}/orig` : null,
    notificationEmail: user.notificationEmail ?? null,
    signalNumber: user.signalNumber ?? null,
    notifyReviewEmail: user.notifyReviewEmail ?? false,
    notifyReviewSignal: user.notifyReviewSignal ?? false,
    pseudonyms: normalizePseudonyms(user.pseudonyms ?? []),
  };
}

function mapUser(user: {
  id: string;
  email: string;
  displayName: string;
  slug: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    slug: user.slug,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { avatar: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return mapMe(user);
  }

  async updateMe(
    userId: string,
    data: {
      displayName?: string;
      bio?: string;
      avatarMediaId?: string | null;
      notificationEmail?: string | null;
      signalNumber?: string | null;
      notifyReviewEmail?: boolean;
      notifyReviewSignal?: boolean;
      pseudonyms?: string[];
    },
  ) {
    const updateData: Record<string, unknown> = { ...data };
    if (Array.isArray(data.pseudonyms)) {
      updateData.pseudonyms = normalizePseudonyms(data.pseudonyms);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { avatar: true },
    });
    return mapMe(user);
  }

  async list(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [total, users] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          slug: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
    ]);
    return { users: users.map(mapUser), total, page, perPage };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        slug: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { posts: { where: { deletedAt: null } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      ...mapUser(user),
      bio: user.bio,
      postCount: user._count.posts,
    };
  }

  async adminCreate(data: { email: string; displayName: string; role: Role; password?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const plainPassword = data.password?.trim() || randomBytes(8).toString('hex');
    const slug =
      data.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
      '-' +
      randomBytes(3).toString('hex');
    const passwordHash = await this.auth.hashPassword(plainPassword);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        displayName: data.displayName,
        slug,
        role: data.role,
        passwordHash,
      },
    });

    return { ...mapUser(user), password: plainPassword };
  }

  async adminUpdate(
    id: string,
    data: { displayName?: string; role?: Role; isActive?: boolean; password?: string },
    requestingUserId: string,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');

    if (id === requestingUserId) {
      if (data.isActive === false) {
        throw new ForbiddenException('Nu îți poți dezactiva propriul cont');
      }
      if (data.role && data.role !== target.role) {
        throw new ForbiddenException('Nu îți poți schimba propriul rol');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password?.trim()) {
      updateData.passwordHash = await this.auth.hashPassword(data.password.trim());
    }

    const user = await this.prisma.user.update({ where: { id }, data: updateData });
    return mapUser(user);
  }

  async invite(email: string, displayName: string, role: Role) {
    return this.adminCreate({ email, displayName, role });
  }
}
