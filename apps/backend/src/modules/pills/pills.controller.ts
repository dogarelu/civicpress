import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { PillsService } from './pills.service';
import { Roles } from '../../common/roles.decorator';
import { Role } from '@prisma/client';
import type { PillCreate, PillUpdate } from '@civicpress/shared';

@Controller('v1/admin/pills')
export class PillsController {
  constructor(private pills: PillsService) {}

  @Get()
  @Roles(Role.AUTHOR, Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  listAdmin() {
    return this.pills.listAdmin();
  }

  /** Lightweight list for post editor dropdown. */
  @Get('picker')
  @Roles(Role.AUTHOR, Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  listForPicker() {
    return this.pills.listForPicker();
  }

  @Post()
  @Roles(Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  create(@Body() body: PillCreate) {
    return this.pills.create(body);
  }

  @Patch(':id')
  @Roles(Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  update(@Param('id') id: string, @Body() body: PillUpdate) {
    return this.pills.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.pills.delete(id);
  }

  @Delete(':pillId/posts/:postId')
  @Roles(Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN)
  detachFromPost(@Param('pillId') pillId: string, @Param('postId') postId: string) {
    return this.pills.detachFromPost(pillId, postId);
  }
}
