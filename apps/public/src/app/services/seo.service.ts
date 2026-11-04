import { DOCUMENT } from '@angular/common';
import { Injectable, RendererFactory2, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
  DEFAULT_SITE_NAME,
  absoluteSiteUrl,
  buildNewsArticleJsonLd,
  buildWebSiteJsonLd,
  canonicalizeSiteOrigin,
  resolveMetaDescription,
  resolvePageTitle,
  type CategoryDetail,
  type PostDetail,
} from '@civicpress/shared';
import { SiteSettingsService } from './site-settings.service';

const CANONICAL_ID = 'cp-canonical';
const JSON_LD_ID = 'cp-jsonld';
const RSS_ID = 'cp-rss';

export type StaticSeoInput = {
  path: string;
  title: string;
  description: string;
  robots?: string;
  ogType?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | null;
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private siteSettings = inject(SiteSettingsService);
  private renderer = inject(RendererFactory2).createRenderer(null, null);

  applyHome(): void {
    const siteName = this.siteName();
    const description = resolveMetaDescription({
      tagline: this.siteSettings.tagline(),
      title: siteName,
    });
    const url = this.absolute('/');
    this.applyTags({
      title: resolvePageTitle({ title: siteName, siteName }),
      description,
      url,
      robots: 'index, follow',
      ogType: 'website',
      imageUrl: this.logoUrl(),
      jsonLd: buildWebSiteJsonLd({
        name: siteName,
        url: this.origin(),
        description,
        logoUrl: this.logoUrl(),
      }),
    });
  }

  applyArticle(post: PostDetail): void {
    const siteName = this.siteName();
    const title = resolvePageTitle({
      seoTitle: post.seoTitle,
      title: post.title,
      siteName,
    });
    const description = resolveMetaDescription({
      seoDescription: post.seoDescription,
      excerpt: post.excerpt,
      contentHtml: post.contentHtml,
      title: post.title,
      tagline: this.siteSettings.tagline(),
    });
    const url = this.absolute(`/${post.slug}`);
    const authorName = post.authorName?.trim() || post.author?.displayName || null;
    this.applyTags({
      title,
      description,
      url,
      robots: 'index, follow',
      ogType: 'article',
      imageUrl: post.heroImage?.url ?? this.logoUrl(),
      jsonLd: buildNewsArticleJsonLd({
        headline: post.title,
        description,
        url,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt ?? post.publishedAt,
        imageUrl: post.heroImage?.url ?? null,
        authorName,
        publisherName: siteName,
        publisherLogoUrl: this.logoUrl(),
        sections: post.categories.map((category) => category.name),
      }),
    });
    if (post.publishedAt) {
      this.meta.updateTag({ property: 'article:published_time', content: post.publishedAt });
    } else {
      this.meta.removeTag('property="article:published_time"');
    }
    if (post.updatedAt || post.publishedAt) {
      this.meta.updateTag({
        property: 'article:modified_time',
        content: post.updatedAt || post.publishedAt || '',
      });
    }
    if (authorName) {
      this.meta.updateTag({ property: 'article:author', content: authorName });
    } else {
      this.meta.removeTag('property="article:author"');
    }
  }

  applyCategory(category: CategoryDetail): void {
    const siteName = this.siteName();
    const title = resolvePageTitle({ title: category.name, siteName });
    const description = resolveMetaDescription({
      excerpt: category.description,
      title: `${category.name} — ${siteName}`,
      tagline: this.siteSettings.tagline(),
    });
    this.applyTags({
      title,
      description,
      url: this.absolute(`/category/${category.slug}`),
      robots: 'index, follow',
      ogType: 'website',
      imageUrl: this.logoUrl(),
      jsonLd: null,
    });
  }

  applyStatic(input: StaticSeoInput): void {
    const siteName = this.siteName();
    this.applyTags({
      title: resolvePageTitle({ title: input.title, siteName }),
      description: resolveMetaDescription({
        excerpt: input.description,
        tagline: this.siteSettings.tagline(),
        title: input.title,
      }),
      url: this.absolute(input.path),
      robots: input.robots ?? 'index, follow',
      ogType: input.ogType ?? 'website',
      imageUrl: this.logoUrl(),
      jsonLd: input.jsonLd ?? null,
    });
  }

  applyPreview(): void {
    this.applyTags({
      title: resolvePageTitle({ title: 'Previzualizare', siteName: this.siteName() }),
      description: 'Previzualizare articol — nu este indexată.',
      url: null,
      robots: 'noindex, nofollow',
      ogType: 'article',
      imageUrl: null,
      jsonLd: null,
    });
  }

  applyNotFound(): void {
    this.applyTags({
      title: resolvePageTitle({ title: 'Pagina nu a fost găsită', siteName: this.siteName() }),
      description: 'Pagina solicitată nu există sau a fost mutată.',
      url: null,
      robots: 'noindex, nofollow',
      ogType: 'website',
      imageUrl: null,
      jsonLd: null,
    });
  }

  private applyTags(input: {
    title: string;
    description: string;
    url: string | null;
    robots: string;
    ogType: 'website' | 'article';
    imageUrl?: string | null;
    jsonLd?: Record<string, unknown> | null;
  }): void {
    const siteName = this.siteName();
    this.title.setTitle(input.title);
    this.meta.updateTag({ name: 'description', content: input.description });
    this.meta.updateTag({ name: 'robots', content: input.robots });
    this.meta.updateTag({ property: 'og:title', content: input.title });
    this.meta.updateTag({ property: 'og:description', content: input.description });
    this.meta.updateTag({ property: 'og:type', content: input.ogType });
    this.meta.updateTag({ property: 'og:site_name', content: siteName });
    this.meta.updateTag({ property: 'og:locale', content: 'ro_RO' });
    this.meta.updateTag({
      name: 'twitter:card',
      content: input.imageUrl ? 'summary_large_image' : 'summary',
    });
    this.meta.updateTag({ name: 'twitter:title', content: input.title });
    this.meta.updateTag({ name: 'twitter:description', content: input.description });

    if (input.url) {
      this.meta.updateTag({ property: 'og:url', content: input.url });
      this.setCanonical(input.url);
    } else {
      this.meta.removeTag('property="og:url"');
      this.removeCanonical();
    }

    if (input.imageUrl) {
      this.meta.updateTag({ property: 'og:image', content: input.imageUrl });
      this.meta.updateTag({ name: 'twitter:image', content: input.imageUrl });
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('name="twitter:image"');
    }

    if (input.ogType !== 'article') {
      this.meta.removeTag('property="article:published_time"');
      this.meta.removeTag('property="article:modified_time"');
      this.meta.removeTag('property="article:author"');
    }

    this.setJsonLd(input.jsonLd ?? null);
    this.setRssAlternate();
  }

  private origin(): string {
    return canonicalizeSiteOrigin(
      (typeof process !== 'undefined' &&
        (process.env['PUBLIC_SITE_URL'] ||
          process.env['VITE_PUBLIC_SITE_URL'] ||
          process.env['PUBLIC_URL'])) ||
        (import.meta as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env?.VITE_PUBLIC_SITE_URL,
    );
  }

  private absolute(path: string): string {
    return absoluteSiteUrl(path, this.origin());
  }

  private siteName(): string {
    return this.siteSettings.siteName() || DEFAULT_SITE_NAME;
  }

  private logoUrl(): string | null {
    return this.siteSettings.logoUrl();
  }

  private setCanonical(href: string): void {
    const head = this.document.head;
    if (!head) return;
    let link = this.document.getElementById(CANONICAL_ID) as HTMLLinkElement | null;
    if (!link) {
      link = this.renderer.createElement('link') as HTMLLinkElement;
      link.id = CANONICAL_ID;
      link.rel = 'canonical';
      this.renderer.appendChild(head, link);
    }
    link.href = href;
  }

  private removeCanonical(): void {
    this.document.getElementById(CANONICAL_ID)?.remove();
  }

  private setRssAlternate(): void {
    const head = this.document.head;
    if (!head) return;
    let link = this.document.getElementById(RSS_ID) as HTMLLinkElement | null;
    if (!link) {
      link = this.document.querySelector(
        'link[rel="alternate"][type="application/rss+xml"]',
      ) as HTMLLinkElement | null;
    }
    if (!link) {
      link = this.renderer.createElement('link') as HTMLLinkElement;
      this.renderer.appendChild(head, link);
    }
    link.id = RSS_ID;
    link.rel = 'alternate';
    link.type = 'application/rss+xml';
    link.title = `${this.siteName()} RSS`;
    link.href = this.absolute('/rss.xml');
  }

  private setJsonLd(data: Record<string, unknown> | null): void {
    const existing = this.document.getElementById(JSON_LD_ID);
    if (existing) existing.remove();
    if (!data) return;
    const head = this.document.head;
    if (!head) return;
    const script = this.renderer.createElement('script') as HTMLScriptElement;
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    this.renderer.appendChild(head, script);
  }
}
