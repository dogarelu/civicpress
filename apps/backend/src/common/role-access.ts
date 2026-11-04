import { Role } from '@prisma/client';

export function canPublishPosts(role: Role): boolean {
  return role === Role.EDITOR || role === Role.CHIEF_EDITOR || role === Role.ADMIN;
}

export function canEditPublishedPosts(role: Role): boolean {
  return role === Role.CHIEF_EDITOR || role === Role.ADMIN;
}
