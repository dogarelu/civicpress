import { Controller, Get, Patch, Put, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Public } from '../../common/public.decorator';
import { Roles } from '../../common/roles.decorator';
import { Role } from '@prisma/client';
import type { SettingsUpdate, TickerBarsUpdate } from '@civicpress/shared';

@Controller('v1')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Public()
  @Get('settings/public')
  getPublic() {
    return this.settings.getPublic();
  }

  @Public()
  @Get('ticker-bars')
  getPublicTickerBars() {
    return this.settings.getPublicTickerBars();
  }

  @Get('admin/settings')
  @Roles(Role.EDITOR, Role.ADMIN)
  getAdmin() {
    return this.settings.getAdmin();
  }

  @Get('admin/ticker-bars')
  @Roles(Role.EDITOR, Role.ADMIN)
  getTickerBars() {
    return this.settings.getTickerBars();
  }

  @Put('admin/ticker-bars')
  @Roles(Role.EDITOR, Role.ADMIN)
  saveTickerBars(@Body() body: TickerBarsUpdate) {
    return this.settings.saveTickerBars(body);
  }

  @Patch('admin/settings')
  @Roles(Role.ADMIN)
  update(@Body() body: SettingsUpdate) {
    return this.settings.update(body);
  }
}
