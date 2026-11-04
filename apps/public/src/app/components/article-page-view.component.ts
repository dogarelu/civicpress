import { Component, computed, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { BreadcrumbComponent } from './breadcrumb.component';
import { ShareButtonsComponent } from './share-buttons.component';
import { ModuleLayoutComponent } from './modules/module-layout.component';
import { LayoutSidebarComponent } from './modules/layout-sidebar.component';
import { MobileOrderedLayoutComponent } from './modules/mobile-ordered-layout.component';
import { MobileModulesLayoutComponent } from './modules/mobile-modules-layout.component';
import { PostSubtitleComponent } from './post-subtitle.component';
import { PostViewCountComponent } from './post-view-count.component';
import { PostReadingTimeComponent } from './post-reading-time.component';
import { VideoPlayerComponent } from './video-player.component';
import { SiteSettingsService } from '../services/site-settings.service';

import type { ArticleLayoutMode, ModuleTypographyStyle, PostDetail } from '@civicpress/shared';
import {
  DEFAULT_ARTICLE_LAYOUT_MODE,
  buildBumbiDisplayCss,
  buildPhotoCaptionDisplayCss,
  buildSummaryDisplayCss,
  combineInlineStyles,
  hasPostSubtitle,
} from '@civicpress/shared';

@Component({
  selector: 'cp-article-page-view',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    RouterModule,
    BreadcrumbComponent,
    ShareButtonsComponent,
    ModuleLayoutComponent,
    LayoutSidebarComponent,
    MobileOrderedLayoutComponent,
    MobileModulesLayoutComponent,
    PostSubtitleComponent,
    PostViewCountComponent,
    PostReadingTimeComponent,
    VideoPlayerComponent,
  ],
  template: `
    <main [class.max-w-3xl]="layoutMode() === 'longform' && !sidebar()">
      @if (post(); as p) {
        <div
          [class]="
            sidebar()
              ? 'grid grid-cols-1 md:grid-cols-4 md:gap-0 md:-mx-4 gap-4'
              : layoutMode() === 'longform'
                ? 'mx-auto'
                : 'max-w-4xl mx-auto'
          "
        >
          <div
            [class.md:col-span-3]="!!sidebar()"
            [class.md:px-4]="!!sidebar()"
            [class.md:border-r]="!!sidebar()"
            [class.md:border-gray-400]="!!sidebar()"
          >
            <cp-breadcrumb [items]="breadcrumbs()" />

            <article [class.article-longform]="layoutMode() === 'longform'">
              @switch (layoutMode()) {
                @case ('media-first') {
                  <ng-container *ngTemplateOutlet="mediaTpl; context: { rounded: true }" />
                  <ng-container *ngTemplateOutlet="categoryTpl" />
                  <ng-container *ngTemplateOutlet="kickerTpl" />
                  <ng-container *ngTemplateOutlet="titleTpl" />
                  <ng-container *ngTemplateOutlet="summaryTpl" />
                  <ng-container *ngTemplateOutlet="metaTpl; context: { bordered: true }" />
                  <ng-container *ngTemplateOutlet="bodyTpl" />
                }
                @case ('overlay-hero') {
                  <ng-container *ngTemplateOutlet="overlayHeroTpl" />
                  <ng-container *ngTemplateOutlet="summaryTpl" />
                  <ng-container *ngTemplateOutlet="metaTpl; context: { bordered: true }" />
                  <ng-container *ngTemplateOutlet="bodyTpl" />
                }
                @case ('split') {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
                    <ng-container
                      *ngTemplateOutlet="mediaTpl; context: { rounded: true, noMargin: true }"
                    />
                    <div>
                      <ng-container *ngTemplateOutlet="categoryTpl" />
                      <ng-container *ngTemplateOutlet="kickerTpl" />
                      <ng-container *ngTemplateOutlet="titleTpl" />
                      <ng-container *ngTemplateOutlet="summaryTpl" />
                      <ng-container *ngTemplateOutlet="metaTpl; context: { bordered: false }" />
                    </div>
                  </div>
                  <ng-container *ngTemplateOutlet="bodyTpl" />
                }
                @case ('split-reverse') {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
                    <div class="md:order-2">
                      <ng-container
                        *ngTemplateOutlet="mediaTpl; context: { rounded: true, noMargin: true }"
                      />
                    </div>
                    <div class="md:order-1">
                      <ng-container *ngTemplateOutlet="categoryTpl" />
                      <ng-container *ngTemplateOutlet="kickerTpl" />
                      <ng-container *ngTemplateOutlet="titleTpl" />
                      <ng-container *ngTemplateOutlet="summaryTpl" />
                      <ng-container *ngTemplateOutlet="metaTpl; context: { bordered: false }" />
                    </div>
                  </div>
                  <ng-container *ngTemplateOutlet="bodyTpl" />
                }
                @case ('compact-news') {
                  <ng-container
                    *ngTemplateOutlet="metaTpl; context: { bordered: false, compact: true }"
                  />
                  <ng-container *ngTemplateOutlet="categoryTpl" />
                  <ng-container *ngTemplateOutlet="kickerTpl" />
                  <ng-container *ngTemplateOutlet="titleTpl" />
                  @if (showMainArticleSummary()) {
                    <ng-container *ngTemplateOutlet="summaryTpl" />
                  }
                  <ng-container
                    *ngTemplateOutlet="mediaTpl; context: { rounded: true, compact: true }"
                  />
                  <ng-container *ngTemplateOutlet="bodyTpl" />
                }
                @case ('longform') {
                  <ng-container *ngTemplateOutlet="categoryTpl" />
                  <ng-container *ngTemplateOutlet="kickerTpl" />
                  <h1
                    class="font-heading leading-tight text-secondary mb-4"
                    [attr.style]="mainArticleTitleStyle(true)"
                  >
                    {{ p.title }}
                  </h1>
                  <ng-container *ngTemplateOutlet="metaTpl; context: { bordered: true }" />
                  <ng-container *ngTemplateOutlet="mediaTpl; context: { rounded: false }" />
                  <ng-container *ngTemplateOutlet="summaryTpl" />
                  <div
                    class="article-content prose prose-lg max-w-none mx-auto"
                    [attr.style]="mainArticleBodyStyle(true)"
                    [innerHTML]="safeContentHtml()"
                  ></div>
                }
                @default {
                  <ng-container *ngTemplateOutlet="categoryTpl" />
                  <ng-container *ngTemplateOutlet="kickerTpl" />
                  <ng-container *ngTemplateOutlet="titleTpl" />
                  <ng-container *ngTemplateOutlet="summaryTpl" />
                  <ng-container *ngTemplateOutlet="metaTpl; context: { bordered: true }" />
                  <ng-container *ngTemplateOutlet="mediaTpl; context: { rounded: true }" />
                  <ng-container *ngTemplateOutlet="bodyTpl" />
                }
              }

              @if (p.tags?.length > 0) {
                <div class="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-border">
                  <span class="text-xs text-gray-500 shrink-0">Tag-uri:</span>
                  @for (tag of p.tags; track tag.id) {
                    <span
                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                    >
                      {{ tag.name }}
                    </span>
                  }
                </div>
              }

              <cp-share-buttons [title]="p.title" [url]="currentUrl()" />

              @if (hasLayoutContent()) {
                <section class="mt-8 pt-6 border-t border-border">
                  @if (articleModules().length > 0) {
                    <cp-module-layout
                      [modules]="articleModules()"
                      [sidebar]="null"
                      [showMobile]="false"
                    />
                  }
                  <div class="md:hidden">
                    @if (mobileModules().length > 0) {
                      <cp-mobile-modules-layout [modules]="mobileModules()" />
                    } @else {
                      <cp-mobile-ordered-layout
                        [mobileOrder]="mobileOrder()"
                        [modules]="articleModules()"
                        [sidebar]="sidebar()"
                        variant="article"
                      />
                    }
                  </div>
                </section>
              }
            </article>
          </div>

          @if (sidebar()) {
            <div class="hidden md:block md:col-span-1 md:px-4">
              <cp-layout-sidebar [sidebar]="sidebar()" />
            </div>
          }
        </div>
      }
    </main>

    <ng-template #categoryTpl>
      @if (post().categories[0]; as cat) {
        <a
          [routerLink]="['/category', cat.slug]"
          class="uppercase tracking-wider mb-3 inline-block hover:opacity-80 transition-opacity"
          [attr.style]="mainArticleCategoryStyle()"
          >{{ cat.name }}</a
        >
      }
    </ng-template>

    <ng-template #kickerTpl>
      @if (post().kicker) {
        <p class="italic mb-2" [attr.style]="mainArticleKickerStyle()">{{ post().kicker }}</p>
      }
    </ng-template>

    <ng-template #titleTpl>
      <h1
        class="font-heading leading-tight text-secondary mb-4"
        [attr.style]="mainArticleTitleStyle()"
      >
        {{ post().title }}
      </h1>
    </ng-template>

    <ng-template #summaryTpl>
      @if (showMainArticleSummary()) {
        <div class="mb-5" [attr.style]="mainArticleSummaryStyle()">
          <cp-post-subtitle
            [show]="true"
            [bulbi]="post().bulbi ?? []"
            [excerpt]="post().excerpt"
            listClass="text-gray-700 leading-snug"
            textClass="text-gray-700 leading-relaxed"
          />
        </div>
      }
    </ng-template>

    <ng-template #metaTpl let-bordered="bordered" let-compact="compact">
      @if (showAuthor() || showDate() || showViews() || showReadingTime()) {
        <div
          class="flex flex-wrap items-center gap-3 mb-6"
          [class.text-sm]="!compact"
          [class.text-xs]="!!compact"
          [class.border-b]="!!bordered"
          [class.border-border]="!!bordered"
          [class.pb-4]="!!bordered"
          [class.mb-3]="!!compact"
        >
          @if (showAuthor()) {
            <span [attr.style]="mainArticleAuthorStyle()">{{ displayAuthor() }}</span>
          }
          @if (showAuthor() && (showDate() || showReadingTime() || showViews())) {
            <span class="text-gray-400">·</span>
          }
          @if (showDate()) {
            <time [dateTime]="post().publishedAt!" [attr.style]="mainArticleDateStyle()">{{
              formatDate(post().publishedAt!)
            }}</time>
          }
          @if (showDate() && showReadingTime()) {
            <span class="text-gray-400">·</span>
          }
          @if (showReadingTime()) {
            <cp-post-reading-time [seconds]="post().readingTimeSeconds!" />
          }
          @if ((showDate() || showReadingTime()) && showViews()) {
            <span class="text-gray-400">·</span>
          }
          @if (showViews()) {
            <span [attr.style]="mainArticleViewsStyle()">
              <cp-post-view-count [count]="post().viewCount!" />
            </span>
          }
        </div>
      }
    </ng-template>

    <ng-template #mediaTpl let-rounded="rounded" let-noMargin="noMargin" let-compact="compact">
      @if (post().videoUrl) {
        <div [class.mb-6]="!noMargin" [class.mb-4]="!!compact">
          <div class="aspect-video">
            <cp-video-player
              [videoUrl]="post().videoUrl!"
              [title]="post().title"
              [posterUrl]="post().heroImage?.url ?? null"
              [autoplayOnStart]="false"
            />
          </div>
          <ng-container *ngTemplateOutlet="heroCaptionTpl" />
        </div>
      } @else if (post().heroImage) {
        <figure class="relative" [class.mb-6]="!noMargin" [class.mb-4]="!!compact">
          <img
            [src]="post().heroImage!.url"
            [alt]="post().heroImage!.alt ?? post().title"
            class="w-full object-cover"
            [class.rounded]="!!rounded"
            [class.max-h-72]="!!compact"
            loading="eager"
          />
          <ng-container *ngTemplateOutlet="heroCaptionTpl; context: { asFigcaption: true }" />
        </figure>
      }
    </ng-template>

    <ng-template #overlayHeroTpl>
      <div class="relative mb-6 -mx-4 sm:mx-0 overflow-hidden bg-muted aspect-[16/9] sm:rounded">
        @if (post().videoUrl) {
          <cp-video-player
            [videoUrl]="post().videoUrl!"
            [title]="post().title"
            [posterUrl]="post().heroImage?.url ?? null"
            [autoplayOnStart]="false"
          />
        } @else if (post().heroImage) {
          <img
            [src]="post().heroImage!.url"
            [alt]="post().heroImage!.alt ?? post().title"
            class="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
        } @else {
          <div class="absolute inset-0 bg-gray-800"></div>
        }
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
        ></div>
        <div class="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white">
          @if (post().categories[0]; as cat) {
            <a
              [routerLink]="['/category', cat.slug]"
              class="uppercase tracking-wider mb-2 inline-block text-white/90 hover:text-white"
              [attr.style]="mainArticleCategoryStyle('#ffffff')"
              >{{ cat.name }}</a
            >
          }
          @if (post().kicker) {
            <p class="italic mb-2 text-white/90" [attr.style]="mainArticleKickerStyle('#ffffff')">
              {{ post().kicker }}
            </p>
          }
          <h1
            class="font-heading leading-tight text-white"
            [attr.style]="mainArticleTitleStyle(false, '#ffffff')"
          >
            {{ post().title }}
          </h1>
        </div>
      </div>
      @if (heroCaption()) {
        <div class="mb-6">
          <ng-container *ngTemplateOutlet="heroCaptionTpl" />
        </div>
      }
    </ng-template>

    <ng-template #heroCaptionTpl let-asFigcaption="asFigcaption">
      @if (heroCaption(); as caption) {
        @if (asFigcaption) {
          <figcaption
            class="cp-article-photo-caption"
            [attr.style]="mainArticlePhotoCaptionStyle()"
          >
            {{ caption }}
          </figcaption>
        } @else {
          <p class="cp-article-photo-caption" [attr.style]="mainArticlePhotoCaptionStyle()">
            {{ caption }}
          </p>
        }
      }
    </ng-template>

    <ng-template #bodyTpl>
      <div
        class="article-content prose prose-sm max-w-none"
        [attr.style]="mainArticleBodyStyle()"
        [innerHTML]="safeContentHtml()"
      ></div>
    </ng-template>
  `,
})
export class ArticlePageViewComponent {
  private siteSettings = inject(SiteSettingsService);
  private sanitizer = inject(DomSanitizer);
  post = input.required<PostDetail>();
  safeContentHtml = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.post().contentHtml ?? ''),
  );
  heroCaption = computed(() => {
    const post = this.post();
    const fromHero = post.heroImage?.caption?.trim();
    if (fromHero) return fromHero;
    const fromLabels = post.photoCaptions?.[0]?.label?.trim();
    return fromLabels || null;
  });
  articleModules = computed(() => this.post().modules ?? []);
  sidebar = computed(() => this.post().sidebar ?? null);
  mobileOrder = computed(() => this.post().mobileOrder ?? []);
  mobileModules = computed(() => this.post().mobileModules ?? []);
  articleMainTypography = computed(() => this.post().articleMainTypography ?? null);
  articleMainSummaryTypography = computed(() => this.post().articleMainSummaryTypography ?? null);
  articleMainBumbiTypography = computed(() => this.post().articleMainBumbiTypography ?? null);
  articleMainPhotoCaptionTypography = computed(
    () => this.post().articleMainPhotoCaptionTypography ?? null,
  );
  articleMainSummaryRows = computed(() => this.post().articleMainSummaryRows ?? null);
  layoutMode = computed<ArticleLayoutMode>(
    () => this.post().articleLayoutMode ?? DEFAULT_ARTICLE_LAYOUT_MODE,
  );

  hasLayoutContent(): boolean {
    return this.articleModules().length > 0 || this.mobileModules().length > 0 || !!this.sidebar();
  }

  breadcrumbs = computed(() => {
    const p = this.post();
    const cat = p.categories[0];
    return [
      ...(cat ? [{ label: cat.name, href: `/category/${cat.slug}` }] : []),
      { label: p.title.slice(0, 50) + (p.title.length > 50 ? '…' : '') },
    ];
  });

  currentUrl() {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  mainArticleCategoryStyle(fallbackColor = '#4b5563'): string {
    return this.composeStyle(this.articleMainTypography()?.category, '13px', '700', fallbackColor);
  }

  mainArticleKickerStyle(fallbackColor = '#4b5563'): string {
    return this.composeStyle(this.articleMainTypography()?.kicker, '16px', '400', fallbackColor);
  }

  mainArticleTitleStyle(longform = false, fallbackColor = 'currentColor'): string {
    return this.composeStyle(
      this.articleMainTypography()?.title,
      longform ? 'var(--article-title-font-size, 36px)' : 'var(--article-title-font-size, 30px)',
      'var(--article-title-font-weight, 700)',
      fallbackColor,
    );
  }

  mainArticleAuthorStyle(): string {
    return this.composeStyle(this.articleMainTypography()?.author, '14px', '500', '#111827');
  }

  mainArticleDateStyle(): string {
    return this.composeStyle(this.articleMainTypography()?.date, '14px', '400', '#6b7280');
  }

  mainArticleViewsStyle(): string {
    return this.composeStyle(this.articleMainTypography()?.views, '14px', '400', '#6b7280');
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

  mainArticleContentStyle(longform = false): string {
    const content = this.articleMainTypography()?.content;
    const base = this.composeStyle(
      content,
      longform
        ? 'var(--article-content-font-size, 19px)'
        : 'var(--article-content-font-size, 17px)',
      'var(--article-content-font-weight, 400)',
      'var(--article-content-color, inherit)',
    );
    const lineHeight =
      content?.lineHeight != null ? `--article-content-line-height: ${content.lineHeight}` : null;
    return lineHeight ? `${base} ${lineHeight};` : base;
  }

  mainArticlePhotoCaptionStyle(): string | null {
    return buildPhotoCaptionDisplayCss(
      this.articleMainPhotoCaptionTypography() ?? {
        fontSize: 13,
        fontWeight: 400,
        color: '#6b7280',
      },
    );
  }

  mainArticleBodyStyle(longform = false): string {
    return (
      combineInlineStyles(
        this.mainArticleContentStyle(longform),
        this.mainArticlePhotoCaptionStyle(),
      ) ?? this.mainArticleContentStyle(longform)
    );
  }

  displayAuthor(): string | null {
    const p = this.post();
    return p.authorName?.trim() || p.author?.displayName || null;
  }

  showDate(): boolean {
    const p = this.post();
    return p.showDate !== false && !!p.publishedAt;
  }

  showAuthor(): boolean {
    return this.post().showAuthor !== false && !!this.displayAuthor();
  }

  showViews(): boolean {
    return this.siteSettings.canShowViews(this.post());
  }

  showReadingTime(): boolean {
    const p = this.post();
    return p.articleMainShowReadingTime === true && (p.readingTimeSeconds ?? 0) > 0;
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr);
  }

  showMainArticleSummary(): boolean {
    const post = this.post();
    if (!hasPostSubtitle(post)) return false;
    if (post.bulbi && post.bulbi.length > 0) return true;
    if (this.layoutMode() === 'compact-news') {
      return post.articleMainShowSummary === true;
    }
    return post.articleMainShowSummary !== false;
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
