import { Injectable } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import {
  DEFAULT_SITE_NAME,
  DEFAULT_SITE_ORIGIN,
  RSS_FEED_LIMIT,
  absoluteSiteUrl,
  buildRssXml,
  buildUrlsetXml,
  canonicalizeSiteOrigin,
  resolveMetaDescription,
  toRssDate,
  toSitemapDate,
  type RssFeedItem,
  type SitemapUrlEntry,
} from '@civicpress/shared';
import { PrismaService } from '../../prisma/prisma.service';

const SITEMAP_CACHE_MS = 5 * 60 * 1000;
const RSS_CACHE_MS = 5 * 60 * 1000;

@Injectable()
export class SeoService {
  private cachedXml: { value: string; expires: number } | null = null;
  private cachedRss: { value: string; expires: number } | null = null;

  constructor(private prisma: PrismaService) {}

  async buildSitemapXml(): Promise<string> {
    const now = Date.now();
    if (this.cachedXml && this.cachedXml.expires > now) {
      return this.cachedXml.value;
    }
    const xml = await this.renderSitemapXml();
    this.cachedXml = { value: xml, expires: now + SITEMAP_CACHE_MS };
    return xml;
  }

  async buildRssXml(): Promise<string> {
    const now = Date.now();
    if (this.cachedRss && this.cachedRss.expires > now) {
      return this.cachedRss.value;
    }
    const xml = await this.renderRssXml();
    this.cachedRss = { value: xml, expires: now + RSS_CACHE_MS };
    return xml;
  }

  private siteOrigin(): string {
    const origin = canonicalizeSiteOrigin(process.env.PUBLIC_SITE_URL || process.env.PUBLIC_URL);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return DEFAULT_SITE_ORIGIN;
    }
    return origin;
  }

  private async renderSitemapXml(): Promise<string> {
    const origin = this.siteOrigin();
    const [posts, categories] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: PostStatus.PUBLISHED },
        select: { slug: true, publishedAt: true, updatedAt: true },
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.category.findMany({
        select: { slug: true },
        orderBy: { menuOrder: 'asc' },
      }),
    ]);

    const latestPostDate = posts[0]?.updatedAt ?? posts[0]?.publishedAt ?? null;
    const homeLastmod = toSitemapDate(latestPostDate);

    const urls: SitemapUrlEntry[] = [
      {
        loc: absoluteSiteUrl('/', origin),
        lastmod: homeLastmod,
        changefreq: 'hourly',
        priority: 1,
      },
      {
        loc: absoluteSiteUrl('/contact', origin),
        changefreq: 'monthly',
        priority: 0.3,
      },
      {
        loc: absoluteSiteUrl('/tc', origin),
        changefreq: 'yearly',
        priority: 0.2,
      },
      {
        loc: absoluteSiteUrl('/pp', origin),
        changefreq: 'yearly',
        priority: 0.2,
      },
      {
        loc: absoluteSiteUrl('/cookies', origin),
        changefreq: 'yearly',
        priority: 0.2,
      },
    ];

    for (const category of categories) {
      urls.push({
        loc: absoluteSiteUrl(`/category/${category.slug}`, origin),
        lastmod: homeLastmod,
        changefreq: 'daily',
        priority: 0.6,
      });
    }

    for (const post of posts) {
      urls.push({
        loc: absoluteSiteUrl(`/${post.slug}`, origin),
        lastmod: toSitemapDate(post.updatedAt ?? post.publishedAt),
        changefreq: 'weekly',
        priority: 0.8,
      });
    }

    return buildUrlsetXml(urls);
  }

  private mediaBaseUrl(): string {
    const raw = process.env.MEDIA_BASE_URL || '';
    if (raw && !raw.includes('localhost') && !raw.includes('127.0.0.1')) {
      return raw.replace(/\/$/, '');
    }
    return this.siteOrigin();
  }

  private async renderRssXml(): Promise<string> {
    const origin = this.siteOrigin();
    const [settings, posts] = await Promise.all([
      this.prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { siteName: true, tagline: true },
      }),
      this.prisma.post.findMany({
        where: { status: PostStatus.PUBLISHED },
        select: {
          slug: true,
          title: true,
          excerpt: true,
          seoDescription: true,
          contentHtml: true,
          publishedAt: true,
          updatedAt: true,
          authorName: true,
          author: { select: { displayName: true } },
          categories: {
            select: { isPrimary: true, category: { select: { name: true } } },
            orderBy: { isPrimary: 'desc' },
          },
          heroMedia: { select: { id: true, mimeType: true, sizeBytes: true } },
        },
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
        take: RSS_FEED_LIMIT,
      }),
    ]);

    const siteName = settings?.siteName?.trim() || DEFAULT_SITE_NAME;
    const description = settings?.tagline?.trim() || `Ultimele articole de pe ${siteName}`;
    const latestDate = posts[0]?.publishedAt ?? posts[0]?.updatedAt ?? new Date();
    const mediaBase = this.mediaBaseUrl();

    const items: RssFeedItem[] = posts.map((post) => {
      const link = absoluteSiteUrl(`/${post.slug}`, origin);
      const author = post.authorName?.trim() || post.author?.displayName?.trim() || undefined;
      const categories = post.categories.map((row) => row.category.name.trim()).filter(Boolean);
      const enclosure =
        post.heroMedia && post.heroMedia.mimeType.startsWith('image/')
          ? {
              url: `${mediaBase}/v1/media/${post.heroMedia.id}/orig`,
              type: post.heroMedia.mimeType,
              length: post.heroMedia.sizeBytes ?? undefined,
            }
          : undefined;

      return {
        title: post.title,
        link,
        guid: link,
        description: resolveMetaDescription({
          seoDescription: post.seoDescription,
          excerpt: post.excerpt,
          contentHtml: post.contentHtml,
          title: post.title,
        }),
        pubDate: toRssDate(post.publishedAt ?? post.updatedAt),
        author,
        categories,
        enclosure,
      };
    });

    return buildRssXml({
      title: siteName,
      link: absoluteSiteUrl('/', origin),
      description,
      language: 'ro',
      lastBuildDate: toRssDate(latestDate),
      selfUrl: absoluteSiteUrl('/rss.xml', origin),
      items,
    });
  }
}
