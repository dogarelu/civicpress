import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { BreadcrumbComponent } from '../../../components/breadcrumb.component';
import { VideoPlayerComponent } from '../../../components/video-player.component';
import { PostSubtitleComponent } from '../../../components/post-subtitle.component';
import { PostViewCountComponent } from '../../../components/post-view-count.component';
import { PostReadingTimeComponent } from '../../../components/post-reading-time.component';
import { injectResponse } from '@analogjs/router/tokens';

import { NotFoundViewComponent } from '../../../components/not-found-view.component';
import { SeoService } from '../../../services/seo.service';
import { SiteSettingsService } from '../../../services/site-settings.service';
import { markNotFound } from '../../../utils/not-found';
import {
  buildBumbiDisplayCss,
  buildSummaryDisplayCss,
  combineInlineStyles,
  hasPostSubtitle,
  type ModuleTypographyStyle,
  type PostDetail,
} from '@civicpress/shared';

type VideoLoad = (args: PageServerLoad) => Promise<{ post: PostDetail | null }>;

@Component({
  selector: 'cp-video-page',
  standalone: true,
  imports: [
    RouterModule,
    BreadcrumbComponent,
    VideoPlayerComponent,
    PostSubtitleComponent,
    PostViewCountComponent,
    PostReadingTimeComponent,
    NotFoundViewComponent,
  ],
  template: `
    <main class="max-w-4xl">
      @if (notFound()) {
        <cp-not-found-view
          title="Videoclipul nu a fost găsit"
          message="Videoclipul pe care îl cauți nu există sau a fost mutat."
        />
      } @else if (post()) {
        <cp-breadcrumb [items]="breadcrumbs()" />

        <article>
          @if (post()!.kicker) {
            <p class="italic mb-2 mt-4" [attr.style]="mainArticleKickerStyle()">
              {{ post()!.kicker }}
            </p>
          }

          <h1
            class="font-heading leading-tight text-secondary mb-4"
            [class.mt-4]="!post()!.kicker"
            [attr.style]="mainArticleTitleStyle()"
          >
            {{ post()!.title }}
          </h1>

          @if (showMainArticleSummary()) {
            <div class="mb-4" [attr.style]="mainArticleSummaryStyle()">
              <cp-post-subtitle
                [show]="true"
                [bulbi]="post()!.bulbi ?? []"
                [excerpt]="post()!.excerpt"
                listClass="text-gray-700 leading-snug"
                textClass="text-gray-700 leading-relaxed"
              />
            </div>
          }

          @if (showDate() || showReadingTime() || showViews()) {
            <div class="flex items-center gap-3 text-sm text-gray-500 mb-4">
              @if (showDate()) {
                <time [dateTime]="post()!.publishedAt!">{{
                  formatDate(post()!.publishedAt!)
                }}</time>
              }
              @if (showDate() && showReadingTime()) {
                <span>·</span>
              }
              @if (showReadingTime()) {
                <cp-post-reading-time [seconds]="post()!.readingTimeSeconds!" />
              }
              @if ((showDate() || showReadingTime()) && showViews()) {
                <span>·</span>
              }
              @if (showViews()) {
                <cp-post-view-count [count]="post()!.viewCount!" />
              }
            </div>
          }

          <div class="aspect-video mb-6">
            <cp-video-player
              [videoUrl]="post()!.videoUrl!"
              [title]="post()!.title"
              [posterUrl]="post()!.heroImage?.url ?? null"
              [autoplayOnStart]="true"
            />
          </div>
        </article>
      }
    </main>
  `,
})
export default class VideoPageComponent implements OnInit {
  private seo = inject(SeoService);
  private siteSettings = inject(SiteSettingsService);
  private response = injectResponse();
  private load = toSignal(injectLoad<VideoLoad>());
  post = computed(() => this.load()?.post ?? null);
  notFound = computed(() => this.load() != null && this.load()!.post == null);

  constructor() {
    effect(() => this.syncSeo());
  }

  ngOnInit() {
    this.syncSeo();
  }

  private syncSeo() {
    const data = this.load();
    if (!data) return;
    if (data.post) this.seo.applyArticle(data.post);
    else markNotFound(this.response, this.seo);
  }
  articleMainTypography = computed(() => this.post()?.articleMainTypography ?? null);
  articleMainSummaryTypography = computed(() => this.post()?.articleMainSummaryTypography ?? null);
  articleMainBumbiTypography = computed(() => this.post()?.articleMainBumbiTypography ?? null);
  articleMainSummaryRows = computed(() => this.post()?.articleMainSummaryRows ?? null);

  breadcrumbs = computed(() => {
    const p = this.post();
    if (!p) return [];
    const cat = p.categories.find((c) => c.slug === 'video') ?? p.categories[0];
    return [
      ...(cat ? [{ label: cat.name, href: `/category/${cat.slug}` }] : []),
      { label: p.title.slice(0, 50) + (p.title.length > 50 ? '…' : '') },
    ];
  });

  showDate(): boolean {
    const p = this.post();
    return !!p && p.showDate !== false && !!p.publishedAt;
  }

  showViews(): boolean {
    const p = this.post();
    return !!p && this.siteSettings.canShowViews(p);
  }

  showReadingTime(): boolean {
    const p = this.post();
    return !!p && p.articleMainShowReadingTime === true && (p.readingTimeSeconds ?? 0) > 0;
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr);
  }

  mainArticleKickerStyle(): string {
    return this.composeStyle(this.articleMainTypography()?.kicker, '16px', '400', '#4b5563');
  }

  mainArticleTitleStyle(): string {
    return this.composeStyle(
      this.articleMainTypography()?.title,
      'var(--article-title-font-size, 30px)',
      'var(--article-title-font-weight, 700)',
      'var(--article-title-color, currentColor)',
    );
  }

  mainArticleSummaryStyle(): string | null {
    const summaryFallback = { fontSize: 16, fontWeight: 400, color: '#374151' };
    const summaryTypography = this.articleMainSummaryTypography() ?? summaryFallback;
    const bumbiTypography = this.articleMainBumbiTypography() ?? summaryTypography;
    return combineInlineStyles(
      buildSummaryDisplayCss(summaryTypography, this.articleMainSummaryRows()),
      buildBumbiDisplayCss(bumbiTypography),
    );
  }

  showMainArticleSummary(): boolean {
    const p = this.post();
    if (!p || !hasPostSubtitle(p)) return false;
    // Bumbi always show; layout "rezumat" toggle only gates legacy excerpt.
    if (p.bulbi && p.bulbi.length > 0) return true;
    return p.articleMainShowSummary !== false;
  }

  private composeStyle(
    style: ModuleTypographyStyle | null | undefined,
    defaultFontSize: string,
    defaultFontWeight: string,
    defaultColor: string,
  ): string {
    const fontSize = style?.fontSize != null ? `${style.fontSize}px` : defaultFontSize;
    const fontWeight = style?.fontWeight != null ? `${style.fontWeight}` : defaultFontWeight;
    const color = style?.color ?? defaultColor;
    return `font-size: ${fontSize}; font-weight: ${fontWeight}; color: ${color};`;
  }
}
