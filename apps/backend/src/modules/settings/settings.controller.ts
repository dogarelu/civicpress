import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Public } from '../../common/public.decorator';
import { Roles } from '../../common/roles.decorator';
import { Role } from '@prisma/client';
import type { SettingsUpdate } from '@civicpress/shared';

@Controller('v1')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Public()
  @Get('settings/public')
  getPublic() {
    return this.settings.getPublic();
  }

  @Get('admin/settings')
  @Roles(Role.EDITOR, Role.ADMIN)
  getAdmin() {
    return this.settings.getAdmin();
  }

  @Patch('admin/settings')
  @Roles(Role.ADMIN)
  update(@Body() body: SettingsUpdate) {
    return this.settings.update(body);
  }
}
