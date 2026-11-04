import { plainTextFromHtml } from './reading-time-utils.js';

export const DEFAULT_SITE_ORIGIN = 'https://civicpress.ro';
export const DEFAULT_SITE_NAME = 'Civicpress';
export const META_DESCRIPTION_MAX = 155;

export type SitemapChangefreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: SitemapChangefreq;
  priority?: number;
};

export function canonicalizeSiteOrigin(raw?: string | null): string {
  if (!raw?.trim()) return DEFAULT_SITE_ORIGIN;
  try {
    const url = new URL(raw.trim());
    if (url.hostname === 'www.civicpress.ro') {
      url.hostname = 'civicpress.ro';
    }
    return `${url.protocol}//${url.host}`.replace(/\/$/, '');
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function absoluteSiteUrl(path: string, origin = DEFAULT_SITE_ORIGIN): string {
  const base = canonicalizeSiteOrigin(origin);
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `${base}/`;
  return `${base}${normalized.replace(/\/+$/, '')}`;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function toSitemapDate(iso: string | Date | null | undefined): string | undefined {
  if (!iso) return undefined;
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

export function clipMetaDescription(text: string, max = META_DESCRIPTION_MAX): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const clipped = (lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trimEnd();
  return `${clipped}…`;
}

export function resolvePageTitle(opts: {
  seoTitle?: string | null;
  title: string;
  siteName?: string | null;
}): string {
  const seo = opts.seoTitle?.trim();
  if (seo) return seo;
  const site = opts.siteName?.trim() || DEFAULT_SITE_NAME;
  const title = opts.title.trim();
  if (!title) return site;
  if (title.toLowerCase().includes(site.toLowerCase())) return title;
  return `${title} | ${site}`;
}

export function resolveMetaDescription(opts: {
  seoDescription?: string | null;
  excerpt?: string | null;
  contentHtml?: string | null;
  title?: string | null;
  tagline?: string | null;
}): string {
  const seo = opts.seoDescription?.trim();
  if (seo) return clipMetaDescription(seo);
  const excerpt = opts.excerpt?.trim();
  if (excerpt) return clipMetaDescription(excerpt);
  const fromHtml = plainTextFromHtml(opts.contentHtml);
  if (fromHtml) return clipMetaDescription(fromHtml);
  const tagline = opts.tagline?.trim();
  if (tagline) return clipMetaDescription(tagline);
  return clipMetaDescription(opts.title?.trim() || DEFAULT_SITE_NAME);
}

export function buildUrlsetXml(urls: SitemapUrlEntry[]): string {
  const items = urls.map((entry) => {
    const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
    const changefreq = entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : '';
    const priority =
      entry.priority != null ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : '';
    return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>\n`;
}

export const RSS_FEED_LIMIT = 50;

export type RssEnclosure = {
  url: string;
  type: string;
  length?: number;
};

export type RssFeedItem = {
  title: string;
  link: string;
  guid?: string;
  description?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
  enclosure?: RssEnclosure;
};

export type RssFeed = {
  title: string;
  link: string;
  description: string;
  language?: string;
  lastBuildDate?: string;
  selfUrl?: string;
  items: RssFeedItem[];
};

export function toRssDate(iso: string | Date | null | undefined): string | undefined {
  if (!iso) return undefined;
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toUTCString();
}

export function buildRssXml(feed: RssFeed): string {
  const channelBits = [
    `    <title>${escapeXml(feed.title)}</title>`,
    `    <link>${escapeXml(feed.link)}</link>`,
    `    <description>${escapeXml(feed.description)}</description>`,
  ];
  if (feed.language) channelBits.push(`    <language>${escapeXml(feed.language)}</language>`);
  if (feed.lastBuildDate) {
    channelBits.push(`    <lastBuildDate>${escapeXml(feed.lastBuildDate)}</lastBuildDate>`);
  }
  if (feed.selfUrl) {
    channelBits.push(
      `    <atom:link href="${escapeXml(feed.selfUrl)}" rel="self" type="application/rss+xml"/>`,
    );
  }

  const items = feed.items.map((item) => {
    const bits = [
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(item.link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(item.guid || item.link)}</guid>`,
    ];
    if (item.description) {
      bits.push(`      <description>${escapeXml(item.description)}</description>`);
    }
    if (item.pubDate) bits.push(`      <pubDate>${escapeXml(item.pubDate)}</pubDate>`);
    if (item.author) bits.push(`      <dc:creator>${escapeXml(item.author)}</dc:creator>`);
    for (const category of item.categories ?? []) {
      bits.push(`      <category>${escapeXml(category)}</category>`);
    }
    if (item.enclosure?.url) {
      const length =
        item.enclosure.length && item.enclosure.length > 0 ? String(item.enclosure.length) : '0';
      bits.push(
        `      <enclosure url="${escapeXml(item.enclosure.url)}" type="${escapeXml(item.enclosure.type)}" length="${length}"/>`,
      );
    }
    return `    <item>\n${bits.join('\n')}\n    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n  <channel>\n${channelBits.join('\n')}\n${items.join('\n')}\n  </channel>\n</rss>\n`;
}

export type NewsArticleJsonLdInput = {
  headline: string;
  description: string;
  url: string;
  datePublished?: string | null;
  dateModified?: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
  publisherName: string;
  publisherLogoUrl?: string | null;
  sections?: string[];
};

export function buildNewsArticleJsonLd(input: NewsArticleJsonLdInput): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    publisher: buildOrganizationJsonLd({
      name: input.publisherName,
      url: canonicalizeSiteOrigin(new URL(input.url).origin),
      logoUrl: input.publisherLogoUrl,
    }),
  };
  if (input.datePublished) jsonLd['datePublished'] = input.datePublished;
  if (input.dateModified || input.datePublished) {
    jsonLd['dateModified'] = input.dateModified || input.datePublished;
  }
  if (input.imageUrl) jsonLd['image'] = [input.imageUrl];
  if (input.authorName?.trim()) {
    jsonLd['author'] = { '@type': 'Person', name: input.authorName.trim() };
  } else {
    jsonLd['author'] = { '@type': 'Organization', name: input.publisherName };
  }
  if (input.sections?.length) {
    jsonLd['articleSection'] = input.sections[0];
    jsonLd['about'] = input.sections.map((name) => ({ '@type': 'Thing', name }));
  }
  return jsonLd;
}

export function buildOrganizationJsonLd(opts: {
  name: string;
  url: string;
  logoUrl?: string | null;
}): Record<string, unknown> {
  const org: Record<string, unknown> = {
    '@type': 'Organization',
    name: opts.name,
    url: opts.url,
  };
  if (opts.logoUrl) {
    org['logo'] = { '@type': 'ImageObject', url: opts.logoUrl };
  }
  return org;
}

export function buildWebSiteJsonLd(opts: {
  name: string;
  url: string;
  description?: string | null;
  logoUrl?: string | null;
}): Record<string, unknown> {
  const origin = canonicalizeSiteOrigin(opts.url);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        ...buildOrganizationJsonLd({
          name: opts.name,
          url: origin,
          logoUrl: opts.logoUrl,
        }),
        '@id': `${origin}/#organization`,
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: opts.name,
        url: `${origin}/`,
        description: opts.description || undefined,
        inLanguage: 'ro-RO',
        publisher: { '@id': `${origin}/#organization` },
      },
    ],
  };
}
