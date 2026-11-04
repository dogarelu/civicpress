import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { Role } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Controller('v1/audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  /**
   * GET /v1/audit
   *  - ADMIN / CHIEF_EDITOR: full access; can also filter by actor / entity / date range.
   *  - EDITOR / AUTHOR: must pass `mine=1` (or `mine=true`); response is restricted to their own actions.
   *
   * `limit` is accepted as an alias for `perPage` to keep the plan's curl example working.
   */
  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('perPage') perPage?: string,
    @Query('limit') limit?: string,
    @Query('entity') entity?: string,
    @Query('actorId') actorId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('mine') mine?: string,
  ) {
    const canViewAll = user.role === Role.ADMIN || user.role === Role.CHIEF_EDITOR;
    const wantsMine = mine === '1' || mine === 'true';

    if (!canViewAll && !wantsMine) {
      throw new ForbiddenException(
        'Only ADMIN/CHIEF_EDITOR can list all audit entries; pass ?mine=1 for own activity.',
      );
    }

    const effectiveActor = canViewAll ? actorId : user.sub;
    const size = parseInt(perPage ?? limit ?? '20', 10);

    return this.audit.list({
      page: parseInt(page, 10),
      perPage: Math.min(Math.max(size, 1), 100),
      entity,
      actorId: effectiveActor,
      dateFrom,
      dateTo,
    });
  }

  /** GET /v1/audit/author-stats — published article counts per author. ADMIN only. */
  @Get('author-stats')
  @Roles(Role.ADMIN)
  authorStats() {
    return this.audit.authorStats();
  }
}
