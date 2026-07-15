import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { BreadcrumbComponent } from '../../../components/breadcrumb.component';
import { VideoPlayerComponent } from '../../../components/video-player.component';
import { PostViewCountComponent } from '../../../components/post-view-count.component';
import { SiteSettingsService } from '../../../services/site-settings.service';
import { formatPostDateForList } from '../../../utils/post-date-display';
import type { ModuleTypographyStyle, PostDetail } from '@civicpress/shared';

type VideoLoad = (args: PageServerLoad) => Promise<{ post: PostDetail }>;

@Component({
  selector: 'cp-video-page',
  standalone: true,
  imports: [RouterModule, BreadcrumbComponent, VideoPlayerComponent, PostViewCountComponent],
  template: `
    <main class="container mx-auto px-4 py-6 max-w-4xl">
      @if (post()) {
        <cp-breadcrumb [items]="breadcrumbs()" />

        <article>
          <h1
            class="font-heading leading-tight text-secondary mb-4 mt-4"
            [attr.style]="mainArticleTitleStyle()"
          >
            {{ post()!.title }}
          </h1>

          @if (post()!.publishedAt) {
            <div class="flex items-center gap-3 text-sm text-gray-500 mb-4">
              @if (showDate()) {
                <time [dateTime]="post()!.publishedAt!">{{
                  formatDate(post()!.publishedAt!)
                }}</time>
              }
              @if (showDate() && showViews()) {
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

          @if (showMainArticleSummary()) {
            <p
              class="text-gray-700 leading-relaxed news-summary-clamp"
              [attr.style]="mainArticleSummaryStyle()"
            >
              {{ cleanExcerpt(post()!.excerpt!) }}
            </p>
          }
        </article>
      }
    </main>
  `,
})
export default class VideoPageComponent {
  private siteSettings = inject(SiteSettingsService);
  private load = toSignal(injectLoad<VideoLoad>());
  post = computed(() => this.load()?.post ?? null);
  articleMainTypography = computed(() => this.post()?.articleMainTypography ?? null);
  articleMainSummaryTypography = computed(() => this.post()?.articleMainSummaryTypography ?? null);
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

  formatDate(dateStr: string): string {
    return formatPostDateForList(dateStr);
  }

  mainArticleTitleStyle(): string {
    return this.composeStyle(
      this.articleMainTypography()?.title,
      'var(--article-title-font-size, 30px)',
      'var(--article-title-font-weight, 700)',
      'var(--article-title-color, currentColor)',
    );
  }

  mainArticleSummaryStyle(): string {
    const baseStyle = this.composeStyle(
      this.articleMainSummaryTypography(),
      'var(--news-summary-font-size, 16px)',
      'var(--news-summary-font-weight, 400)',
      'var(--news-summary-color, currentColor)',
    );
    const rows = this.articleMainSummaryRows();
    if (rows == null) return baseStyle;
    return `${baseStyle} --news-summary-line-clamp: ${rows};`;
  }

  cleanExcerpt(excerpt: string): string {
    return excerpt.replace(/<[^>]*>/g, '').trim();
  }

  showMainArticleSummary(): boolean {
    const p = this.post();
    if (!p?.excerpt) return false;
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
