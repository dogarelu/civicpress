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
  headlineHref,
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
    <main [class.max-w-3xl]="layoutMode() === 'longform' && !sidebar() && !siblingArticle()">
      @if (post(); as p) {
        <div
          [class]="
            sidebar()
              ? 'grid grid-cols-1 md:grid-cols-4 md:gap-0 md:-mx-4 gap-4'
              : siblingArticle()
                ? ''
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

            @if (siblingArticle(); as sibling) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0">
                <div class="min-w-0 md:pr-4 md:border-r md:border-gray-300">
                  <ng-container *ngTemplateOutlet="articleColumn; context: { article: p }" />
                </div>
                <div class="min-w-0 border-t border-gray-300 pt-8 md:border-t-0 md:pt-0 md:pl-4">
                  <ng-container *ngTemplateOutlet="articleColumn; context: { article: sibling }" />
                </div>
              </div>
            } @else {
              <ng-container *ngTemplateOutlet="articleColumn; context: { article: p }" />
            }

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
          </div>

          <ng-template #articleColumn let-article="article">
            <article [class.article-longform]="layoutMode() === 'longform'">
              @switch (layoutMode()) {
                @case ('media-first') {
                  <ng-container *ngTemplateOutlet="mediaTpl; context: { article, rounded: true }" />
                  <ng-container *ngTemplateOutlet="categoryTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="kickerTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="titleTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="summaryTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="metaTpl; context: { article, bordered: true }" />
                  <ng-container *ngTemplateOutlet="bodyTpl; context: { article }" />
                }
                @case ('overlay-hero') {
                  <ng-container *ngTemplateOutlet="overlayHeroTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="summaryTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="metaTpl; context: { article, bordered: true }" />
                  <ng-container *ngTemplateOutlet="bodyTpl; context: { article }" />
                }
                @case ('split') {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
                    <ng-container
                      *ngTemplateOutlet="
                        mediaTpl;
                        context: { article, rounded: true, noMargin: true }
                      "
                    />
                    <div>
                      <ng-container *ngTemplateOutlet="categoryTpl; context: { article }" />
                      <ng-container *ngTemplateOutlet="kickerTpl; context: { article }" />
                      <ng-container *ngTemplateOutlet="titleTpl; context: { article }" />
                      <ng-container *ngTemplateOutlet="summaryTpl; context: { article }" />
                      <ng-container
                        *ngTemplateOutlet="metaTpl; context: { article, bordered: false }"
                      />
                    </div>
                  </div>
                  <ng-container *ngTemplateOutlet="bodyTpl; context: { article }" />
                }
                @case ('split-reverse') {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
                    <div class="md:order-2">
                      <ng-container
                        *ngTemplateOutlet="
                          mediaTpl;
                          context: { article, rounded: true, noMargin: true }
                        "
                      />
                    </div>
                    <div class="md:order-1">
                      <ng-container *ngTemplateOutlet="categoryTpl; context: { article }" />
                      <ng-container *ngTemplateOutlet="kickerTpl; context: { article }" />
                      <ng-container *ngTemplateOutlet="titleTpl; context: { article }" />
                      <ng-container *ngTemplateOutlet="summaryTpl; context: { article }" />
                      <ng-container
                        *ngTemplateOutlet="metaTpl; context: { article, bordered: false }"
                      />
                    </div>
                  </div>
                  <ng-container *ngTemplateOutlet="bodyTpl; context: { article }" />
                }
                @case ('compact-news') {
                  <ng-container
                    *ngTemplateOutlet="
                      metaTpl;
                      context: { article, bordered: false, compact: true }
                    "
                  />
                  <ng-container *ngTemplateOutlet="categoryTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="kickerTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="titleTpl; context: { article }" />
                  @if (showMainArticleSummary(article)) {
                    <ng-container *ngTemplateOutlet="summaryTpl; context: { article }" />
                  }
                  <ng-container
                    *ngTemplateOutlet="mediaTpl; context: { article, rounded: true, compact: true }"
                  />
                  <ng-container *ngTemplateOutlet="bodyTpl; context: { article }" />
                }
                @case ('longform') {
                  <ng-container *ngTemplateOutlet="categoryTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="kickerTpl; context: { article }" />
                  <h1
                    class="font-heading leading-tight text-secondary mb-4"
                    [attr.style]="mainArticleTitleStyle(true)"
                  >
                    {{ article.title }}
                  </h1>
                  <ng-container *ngTemplateOutlet="metaTpl; context: { article, bordered: true }" />
                  <ng-container
                    *ngTemplateOutlet="mediaTpl; context: { article, rounded: false }"
                  />
                  <ng-container *ngTemplateOutlet="summaryTpl; context: { article }" />
                  <div
                    class="article-content prose prose-lg max-w-none mx-auto"
                    [attr.style]="mainArticleBodyStyle(true)"
                    [innerHTML]="articleHtml(article)"
                  ></div>
                }
                @default {
                  <ng-container *ngTemplateOutlet="categoryTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="kickerTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="titleTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="summaryTpl; context: { article }" />
                  <ng-container *ngTemplateOutlet="metaTpl; context: { article, bordered: true }" />
                  <ng-container *ngTemplateOutlet="mediaTpl; context: { article, rounded: true }" />
                  <ng-container *ngTemplateOutlet="bodyTpl; context: { article }" />
                }
              }

              @if (article.tags?.length > 0) {
                <div class="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-border">
                  <span class="text-xs text-gray-500 shrink-0">Tag-uri:</span>
                  @for (tag of article.tags; track tag.id) {
                    <span
                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                    >
                      {{ tag.name }}
                    </span>
                  }
                </div>
              }

              <cp-share-buttons [title]="article.title" [url]="articleUrl(article)" />
            </article>
          </ng-template>

          @if (sidebar()) {
            <div class="hidden md:block md:col-span-1 md:px-4">
              <cp-layout-sidebar [sidebar]="sidebar()" />
            </div>
          }
        </div>
      }
    </main>

    <ng-template #categoryTpl let-article="article">
      @if (article.categories[0]; as cat) {
        <a
          [routerLink]="['/category', cat.slug]"
          class="uppercase tracking-wider mb-3 inline-block hover:opacity-80 transition-opacity"
          [attr.style]="mainArticleCategoryStyle()"
          >{{ cat.name }}</a
        >
      }
    </ng-template>

    <ng-template #kickerTpl let-article="article">
      @if (article.kicker) {
        <p class="italic mb-2" [attr.style]="mainArticleKickerStyle()">{{ article.kicker }}</p>
      }
    </ng-template>

    <ng-template #titleTpl let-article="article">
      <h1
        class="font-heading leading-tight text-secondary mb-4"
        [attr.style]="mainArticleTitleStyle()"
      >
        {{ article.title }}
      </h1>
    </ng-template>

    <ng-template #summaryTpl let-article="article">
      @if (showMainArticleSummary(article)) {
        <div class="mb-5" [attr.style]="mainArticleSummaryStyle()">
          <cp-post-subtitle
            [show]="true"
            [bulbi]="article.bulbi ?? []"
            [excerpt]="article.excerpt"
            listClass="text-gray-700 leading-snug"
            textClass="text-gray-700 leading-relaxed"
          />
        </div>
      }
    </ng-template>

    <ng-template #metaTpl let-article="article" let-bordered="bordered" let-compact="compact">
      @if (
        showAuthor(article) || showDate(article) || showViews(article) || showReadingTime(article)
      ) {
        <div
          class="flex flex-wrap items-center gap-3 mb-6"
          [class.text-sm]="!compact"
          [class.text-xs]="!!compact"
          [class.border-b]="!!bordered"
          [class.border-border]="!!bordered"
          [class.pb-4]="!!bordered"
          [class.mb-3]="!!compact"
        >
          @if (showAuthor(article)) {
            <span [attr.style]="mainArticleAuthorStyle()">{{ displayAuthor(article) }}</span>
          }
          @if (
            showAuthor(article) &&
            (showDate(article) || showReadingTime(article) || showViews(article))
          ) {
            <span class="text-gray-400">·</span>
          }
          @if (showDate(article)) {
            <time [dateTime]="article.publishedAt!" [attr.style]="mainArticleDateStyle()">{{
              formatDate(article.publishedAt!)
            }}</time>
          }
          @if (showDate(article) && showReadingTime(article)) {
            <span class="text-gray-400">·</span>
          }
          @if (showReadingTime(article)) {
            <cp-post-reading-time [seconds]="article.readingTimeSeconds!" />
          }
          @if ((showDate(article) || showReadingTime(article)) && showViews(article)) {
            <span class="text-gray-400">·</span>
          }
          @if (showViews(article)) {
            <span [attr.style]="mainArticleViewsStyle()">
              <cp-post-view-count [count]="article.viewCount!" />
            </span>
          }
        </div>
      }
    </ng-template>

    <ng-template
      #mediaTpl
      let-article="article"
      let-rounded="rounded"
      let-noMargin="noMargin"
      let-compact="compact"
    >
      @if (article.videoUrl) {
        <div [class.mb-6]="!noMargin" [class.mb-4]="!!compact">
          <div class="aspect-video">
            <cp-video-player
              [videoUrl]="article.videoUrl!"
              [title]="article.title"
              [posterUrl]="article.heroImage?.url ?? null"
              [autoplayOnStart]="false"
            />
          </div>
          <ng-container *ngTemplateOutlet="heroCaptionTpl; context: { article }" />
        </div>
      } @else if (article.heroImage) {
        <figure class="relative" [class.mb-6]="!noMargin" [class.mb-4]="!!compact">
          <img
            [src]="article.heroImage!.url"
            [alt]="article.heroImage!.alt ?? article.title"
            class="w-full object-cover"
            [class.rounded]="!!rounded"
            [class.max-h-72]="!!compact"
            loading="eager"
          />
          <ng-container
            *ngTemplateOutlet="heroCaptionTpl; context: { article, asFigcaption: true }"
          />
        </figure>
      }
    </ng-template>

    <ng-template #overlayHeroTpl let-article="article">
      <div class="relative mb-6 -mx-4 sm:mx-0 overflow-hidden bg-muted aspect-[16/9] sm:rounded">
        @if (article.videoUrl) {
          <cp-video-player
            [videoUrl]="article.videoUrl!"
            [title]="article.title"
            [posterUrl]="article.heroImage?.url ?? null"
            [autoplayOnStart]="false"
          />
        } @else if (article.heroImage) {
          <img
            [src]="article.heroImage!.url"
            [alt]="article.heroImage!.alt ?? article.title"
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
          @if (article.categories[0]; as cat) {
            <a
              [routerLink]="['/category', cat.slug]"
              class="uppercase tracking-wider mb-2 inline-block text-white/90 hover:text-white"
              [attr.style]="mainArticleCategoryStyle('#ffffff')"
              >{{ cat.name }}</a
            >
          }
          @if (article.kicker) {
            <p class="italic mb-2 text-white/90" [attr.style]="mainArticleKickerStyle('#ffffff')">
              {{ article.kicker }}
            </p>
          }
          <h1
            class="font-heading leading-tight text-white"
            [attr.style]="mainArticleTitleStyle(false, '#ffffff')"
          >
            {{ article.title }}
          </h1>
        </div>
      </div>
      @if (heroCaption(article)) {
        <div class="mb-6">
          <ng-container *ngTemplateOutlet="heroCaptionTpl; context: { article }" />
        </div>
      }
    </ng-template>

    <ng-template #heroCaptionTpl let-article="article" let-asFigcaption="asFigcaption">
      @if (heroCaption(article); as caption) {
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

    <ng-template #bodyTpl let-article="article">
      <div
        class="article-content prose prose-sm max-w-none"
        [attr.style]="mainArticleBodyStyle()"
        [innerHTML]="articleHtml(article)"
      ></div>
    </ng-template>
  `,
})
export class ArticlePageViewComponent {
  private siteSettings = inject(SiteSettingsService);
  private sanitizer = inject(DomSanitizer);
  post = input.required<PostDetail>();
  siblingArticle = computed(() => {
    const sibling = this.post().sibling;
    if (!sibling || sibling.id === this.post().id) return null;
    return sibling;
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

  articleUrl(article: PostDetail): string {
    const path = headlineHref(article);
    if (typeof window === 'undefined') return path;
    if (article.id === this.post().id) return window.location.href;
    return `${window.location.origin}${path}`;
  }

  articleHtml(article: PostDetail) {
    return this.sanitizer.bypassSecurityTrustHtml(article.contentHtml ?? '');
  }

  heroCaption(article: PostDetail): string | null {
    const fromHero = article.heroImage?.caption?.trim();
    if (fromHero) return fromHero;
    const fromLabels = article.photoCaptions?.[0]?.label?.trim();
    return fromLabels || null;
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

  displayAuthor(article: PostDetail): string | null {
    return article.authorName?.trim() || article.author?.displayName || null;
  }

  showDate(article: PostDetail): boolean {
    return article.showDate !== false && !!article.publishedAt;
  }

  showAuthor(article: PostDetail): boolean {
    return article.showAuthor !== false && !!this.displayAuthor(article);
  }

  showViews(article: PostDetail): boolean {
    return this.siteSettings.canShowViews(article);
  }

  showReadingTime(article: PostDetail): boolean {
    return this.post().articleMainShowReadingTime === true && (article.readingTimeSeconds ?? 0) > 0;
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr);
  }

  showMainArticleSummary(article: PostDetail): boolean {
    if (!hasPostSubtitle(article)) return false;
    if (article.bulbi && article.bulbi.length > 0) return true;
    const layout = this.post();
    if (this.layoutMode() === 'compact-news') {
      return layout.articleMainShowSummary === true;
    }
    return layout.articleMainShowSummary !== false;
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
