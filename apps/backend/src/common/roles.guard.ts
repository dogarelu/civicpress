import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = ctx.switchToHttp().getRequest<Record<string, unknown>>();
    const user = request['user'] as JwtPayload | undefined;
    if (!user) throw new ForbiddenException();

    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true, isActive: true },
    });
    if (!currentUser?.isActive || !requiredRoles.includes(currentUser.role)) {
      throw new ForbiddenException(`Requires one of: ${requiredRoles.join(', ')}`);
    }
    request['user'] = { ...user, role: currentUser.role };
    return true;
  }
}
