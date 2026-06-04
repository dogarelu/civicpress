import { Controller, Get, Post, Param, Res, StreamableFile, Query, Req } from '@nestjs/common';
import { MediaService } from './media.service';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../common/public.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('v1/media')
export class MediaController {
  constructor(private media: MediaService) {}

  @Public()
  @Get(':id')
  async getMeta(@Param('id') id: string) {
    return this.media.getMeta(id);
  }

  @Public()
  @Get(':id/:variant')
  async getFile(
    @Param('id') id: string,
    @Param('variant') variant: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { stream, mimeType, size } = await this.media.getFile(id, variant);
    res.header('Content-Type', mimeType);
    res.header('Cache-Control', 'public, max-age=31536000, immutable');
    if (size) res.header('Content-Length', size);
    return new StreamableFile(stream);
  }

  @Post('upload')
  async upload(@Req() req: FastifyRequest, @CurrentUser() user: JwtPayload) {
    return this.media.uploadFromRequest(req, user.sub);
  }

  @Get()
  list(@Query('page') page = '1', @Query('perPage') perPage = '20') {
    return this.media.list(parseInt(page, 10), parseInt(perPage, 10));
  }
}
