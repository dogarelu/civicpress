import { Controller, Get, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Public } from '../../common/public.decorator';
import { SeoService } from './seo.service';

@Controller('v1')
export class SeoController {
  constructor(private seo: SeoService) {}

  @Public()
  @Get('sitemap.xml')
  async sitemap(@Res() reply: FastifyReply) {
    const xml = await this.seo.buildSitemapXml();
    return reply
      .header('Content-Type', 'application/xml; charset=utf-8')
      .header('Cache-Control', 'public, max-age=300')
      .send(xml);
  }

  @Public()
  @Get(['rss.xml', 'feed.xml'])
  async rss(@Res() reply: FastifyReply) {
    const xml = await this.seo.buildRssXml();
    return reply
      .header('Content-Type', 'application/rss+xml; charset=utf-8')
      .header('Cache-Control', 'public, max-age=300')
      .send(xml);
  }
}
