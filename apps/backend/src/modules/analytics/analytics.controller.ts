import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { Public } from '../../common/public.decorator';
import { Roles } from '../../common/roles.decorator';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

@Controller('v1')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  /** Public client beacon (heartbeats). Tighter rate limit than global. */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  @Post('analytics/beacon')
  beacon(@Body() body: unknown, @Req() req: FastifyRequest) {
    const ua = req.headers['user-agent'];
    return this.analytics.ingestBeacon(body, typeof ua === 'string' ? ua : undefined);
  }

  @Get('admin/analytics/overview')
  @Roles(Role.CHIEF_EDITOR, Role.ADMIN)
  overview(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('postId') postId?: string,
  ) {
    return this.analytics.overview(from, to, postId);
  }

  @Get('admin/analytics/article')
  @Roles(Role.CHIEF_EDITOR, Role.ADMIN)
  article(@Query('postId') postId: string, @Query('from') from?: string, @Query('to') to?: string) {
    if (!postId?.trim()) throw new BadRequestException('postId is required');
    return this.analytics.overview(from, to, postId);
  }

  @Get('admin/analytics/pages')
  @Roles(Role.CHIEF_EDITOR, Role.ADMIN)
  pages(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.pages(from, to);
  }

  @Get('admin/analytics/page')
  @Roles(Role.CHIEF_EDITOR, Role.ADMIN)
  pageDetail(@Query('path') path: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.pageDetail(path || '/', from, to);
  }
}
