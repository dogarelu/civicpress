import { Controller, Get, Put, Body } from '@nestjs/common';
import { HomepageService } from './homepage.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { Role } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Controller('v1')
export class HomepageController {
  constructor(private homepage: HomepageService) {}

  @Get('admin/homepage')
  getConfig() {
    return this.homepage.getAdminConfig();
  }

  @Put('admin/homepage')
  @Roles(Role.EDITOR, Role.ADMIN)
  saveConfig(
    @Body() body: { hero?: string | null; grid: (string | null)[]; list: (string | null)[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.homepage.saveConfig(body, user.sub);
  }
}
