import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { Role } from '@prisma/client';
import crypto from 'node:crypto';

const MEDIA_BASE = process.env.MEDIA_BASE_URL || 'http://localhost:3000';

function mapUser(user: {
  id: string;
  email: string;
  displayName: string;
  slug: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    slug: user.slug,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
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
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      slug: user.slug,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      avatarUrl: user.avatar ? `${MEDIA_BASE}/v1/media/${user.avatar.id}/orig` : null,
    };
  }

  async updateMe(
    userId: string,
    data: { displayName?: string; bio?: string; avatarMediaId?: string | null },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return mapUser(user);
  }

  async list(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [total, users] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({ skip, take: perPage, orderBy: { createdAt: 'desc' } }),
    ]);
    return { users: users.map(mapUser), total, page, perPage };
  }

  async invite(email: string, displayName: string, role: Role) {
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const slug =
      displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
      '-' +
      crypto.randomBytes(3).toString('hex');
    const passwordHash = await this.auth.hashPassword(tempPassword);

    const user = await this.prisma.user.create({
      data: { email, displayName, slug, role, passwordHash },
    });

    console.log(
      `\n[INVITE] User created: ${email} | temp password: ${tempPassword} | role: ${role}\n`,
    );

    return { ...mapUser(user), tempPassword };
  }
}
