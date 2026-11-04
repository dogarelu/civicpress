import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../common/roles.decorator';
import { Role } from '@prisma/client';
import type { UtmPresetCreate, UtmPresetUpdate } from '@civicpress/shared';
import { AnalyticsService } from './analytics.service';

@Controller('v1/admin/utm-presets')
export class UtmPresetsController {
  constructor(private analytics: AnalyticsService) {}

  @Get()
  @Roles(Role.AUTHOR, Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  list() {
    return this.analytics.listPresets();
  }

  @Post()
  @Roles(Role.AUTHOR, Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  create(@Body() body: UtmPresetCreate) {
    return this.analytics.createPreset(body);
  }

  @Patch(':id')
  @Roles(Role.AUTHOR, Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  update(@Param('id') id: string, @Body() body: UtmPresetUpdate) {
    return this.analytics.updatePreset(id, body);
  }

  @Delete(':id')
  @Roles(Role.AUTHOR, Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.analytics.deletePreset(id);
  }
}
