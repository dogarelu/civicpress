import { Controller, Get, Put, Post, Param, Body, Query } from '@nestjs/common';
import { LayoutService } from './layout.service';
import { Roles } from '../../common/roles.decorator';
import { Public } from '../../common/public.decorator';
import { Role } from '@prisma/client';

@Controller('v1')
export class LayoutController {
  constructor(private layout: LayoutService) {}

  /** Public "load more articles" feed used by list-module "Mai multe" buttons. */
  @Public()
  @Get('posts-feed')
  getMorePosts(
    @Query('exclude') exclude = '',
    @Query('category') category?: string,
    @Query('take') take = '10',
    @Query('hasVideo') hasVideo?: string,
  ) {
    return this.layout.getMorePosts({
      excludeIds: exclude ? exclude.split(',').filter(Boolean) : [],
      categorySlug: category || undefined,
      take: parseInt(take, 10) || 10,
      hasVideo: hasVideo === 'true' || hasVideo === '1',
    });
  }

  @Get('admin/layout')
  @Roles(Role.EDITOR, Role.ADMIN)
  getAdmin() {
    return this.layout.getAdminLayouts();
  }

  @Put('admin/layout/:page')
  @Roles(Role.EDITOR, Role.ADMIN)
  save(@Param('page') page: string, @Body() body: unknown) {
    return this.layout.saveLayout(page, body);
  }

  /** Pin a post at the front of a layout module (dedupe + drop overflow). */
  @Post('admin/layout/pin-front')
  @Roles(Role.EDITOR, Role.ADMIN)
  pinFront(@Body() body: unknown) {
    return this.layout.pinPostAtFront(body);
  }
}
