import { Controller, Get, Patch, Post, Body, Query } from '@nestjs/common';
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
    @Body() body: { displayName?: string; bio?: string; avatarMediaId?: string | null },
  ) {
    return this.users.updateMe(user.sub, body);
  }

  @Get('users')
  @Roles(Role.ADMIN)
  list(@Query('page') page = '1', @Query('perPage') perPage = '20') {
    return this.users.list(parseInt(page, 10), parseInt(perPage, 10));
  }

  @Post('users/invite')
  @Roles(Role.ADMIN)
  invite(@Body() body: { email: string; displayName: string; role: Role }) {
    return this.users.invite(body.email, body.displayName, body.role);
  }
}
