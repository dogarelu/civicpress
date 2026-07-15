import { Controller, Get, Patch, Post, Body, Query, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { Role } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('v1')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.users.getMe(user.sub);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
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
    return this.users.updateMe(user.sub, body);
  }

  @Get('users')
  @Roles(Role.ADMIN)
  list(@Query('page') page = '1', @Query('perPage') perPage = '20') {
    return this.users.list(parseInt(page, 10), parseInt(perPage, 10));
  }

  @Get('users/:id')
  @Roles(Role.ADMIN)
  getById(@Param('id') id: string) {
    return this.users.getById(id);
  }

  @Post('users')
  @Roles(Role.ADMIN)
  create(@Body() body: { email: string; displayName: string; role: Role; password?: string }) {
    return this.users.adminCreate(body);
  }

  @Patch('users/:id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body()
    body: { displayName?: string; role?: Role; isActive?: boolean; password?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.adminUpdate(id, body, user.sub);
  }

  @Post('users/invite')
  @Roles(Role.ADMIN)
  invite(@Body() body: { email: string; displayName: string; role: Role }) {
    return this.users.invite(body.email, body.displayName, body.role);
  }
}
