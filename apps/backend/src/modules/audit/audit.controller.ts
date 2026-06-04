import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../../common/current-user.decorator';
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
   *  - ADMIN: full access; can also filter by actor / entity / date range.
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
    const isAdmin = user.role === Role.ADMIN;
    const wantsMine = mine === '1' || mine === 'true';

    if (!isAdmin && !wantsMine) {
      throw new ForbiddenException(
        'Only ADMIN can list all audit entries; pass ?mine=1 for own activity.',
      );
    }

    const effectiveActor = isAdmin ? actorId : user.sub;
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
}
