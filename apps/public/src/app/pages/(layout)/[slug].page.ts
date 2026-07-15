import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { ShareButtonsComponent } from '../../components/share-buttons.component';
import { ModuleLayoutComponent } from '../../components/modules/module-layout.component';
import { LayoutSidebarComponent } from '../../components/modules/layout-sidebar.component';
import { MobileOrderedLayoutComponent } from '../../components/modules/mobile-ordered-layout.component';
import { PostImagePillComponent } from '../../components/post-image-pill.component';
import { PostViewCountComponent } from '../../components/post-view-count.component';
import { VideoPlayerComponent } from '../../components/video-player.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import { formatPostDateForList } from '../../utils/post-date-display';

import type { ModuleTypographyStyle, PostBulbResolved, PostDetail } from '@civicpress/shared';

type SlugLoad = (args: PageServerLoad) => Promise<{ post: PostDetail }>;

@Component({
  selector: 'cp-article-page',
  standalone: true,
  imports: [
    RouterModule,
    BreadcrumbComponent,
    ShareButtonsComponent,
    ModuleLayoutComponent,
    LayoutSidebarComponent,
    MobileOrderedLayoutComponent,
    PostImagePillComponent,
    PostViewCountComponent,
    VideoPlayerComponent,
  ],
  template: `
    <main class="container mx-auto px-4 py-6">
      @if (post()) {
        <div [class]="sidebar() ? 'grid grid-cols-1 lg:grid-cols-4 gap-4' : 'max-w-4xl mx-auto'">
          <div [class.lg:col-span-3]="!!sidebar()">
            <cp-breadcrumb [items]="breadcrumbs()" />

            <article>
              @if (post()!.categories[0]) {
                <a
                  [routerLink]="['/category', post()!.categories[0].slug]"
                  class="text-sm font-bold uppercase tracking-wider mb-3 inline-block text-gray-600 hover:text-gray-800 transition-colors"
                  >{{ post()!.categories[0].name }}</a
                >
              }

              <h1
                class="font-heading leading-tight text-secondary mb-4"
                [attr.style]="mainArticleTitleStyle()"
              >
                {{ post()!.title }}
              </h1>

              @if (showMainArticleSummary()) {
                <p
                  class="text-gray-700 leading-relaxed mb-5 news-summary-clamp"
                  [attr.style]="mainArticleSummaryStyle()"
                >
                  {{ cleanExcerpt(post()!.excerpt!) }}
                </p>
              }

              <div
                class="flex items-center gap-3 text-sm text-gray-500 mb-6 border-b border-border pb-4"
              >
                @if (showAuthor()) {
                  <span class="font-medium text-secondary">{{ displayAuthor() }}</span>
                }
                @if (showAuthor() && (showDate() || showViews())) {
                  <span>·</span>
                }
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

              @if (post()!.videoUrl) {
                <div class="mb-6 aspect-video">
                  <cp-video-player
                    [videoUrl]="post()!.videoUrl!"
                    [title]="post()!.title"
                    [posterUrl]="post()!.heroImage?.url ?? null"
                    [autoplayOnStart]="false"
                  />
                </div>
              } @else if (post()!.heroImage) {
                <figure class="relative mb-6">
                  <img
                    [src]="post()!.heroImage!.url"
                    [alt]="post()!.heroImage!.alt ?? post()!.title"
                    class="w-full rounded object-cover"
                    loading="eager"
                  />
                  <cp-post-image-pill [pill]="post()!.pill" size="lg" />
                  @if (post()!.heroImage!.caption) {
                    <figcaption class="text-xs text-gray-500 mt-1 text-center italic">
                      {{ post()!.heroImage!.caption }}
                    </figcaption>
                  }
                </figure>
              }

              @if (bulbi().length > 0) {
                <nav class="mb-6" aria-label="Bulbi">
                  <ul class="space-y-1">
                    @for (item of bulbi(); track item.postId) {
                      <li>
                        <a
                          [routerLink]="['/', item.post.slug]"
                          class="text-blue-600 underline hover:text-blue-800 transition-colors"
                        >
                          {{ bulbLabel(item) }}
                        </a>
                      </li>
                    }
                  </ul>
                </nav>
              }

              <div
                class="article-content prose prose-sm max-w-none"
                [attr.style]="mainArticleContentStyle()"
                [innerHTML]="post()!.contentHtml"
              ></div>

              @if (post()!.tags?.length > 0) {
                <div class="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border">
                  <span class="text-xs text-gray-500">Tag-uri:</span>
                  @for (tag of post()!.tags; track tag.id) {
                    <span class="px-2 py-0.5 bg-muted text-xs text-gray-600 rounded">{{
                      tag.name
                    }}</span>
                  }
                </div>
              }

              <cp-share-buttons [title]="post()!.title" [url]="currentUrl()" />

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
                    <cp-mobile-ordered-layout
                      [mobileOrder]="mobileOrder()"
                      [modules]="articleModules()"
                      [sidebar]="sidebar()"
                      variant="article"
                    />
                  </div>
                </section>
              }
            </article>
          </div>

          @if (sidebar()) {
            <div class="hidden md:block lg:col-span-1">
              <cp-layout-sidebar [sidebar]="sidebar()" />
            </div>
          }
        </div>
      }
    </main>
  `,
})
export default class ArticlePageComponent {
  private siteSettings = inject(SiteSettingsService);
  private load = toSignal(injectLoad<SlugLoad>());
  post = computed(() => this.load()?.post ?? null);
  bulbi = computed(() => this.post()?.bulbi ?? []);
  articleModules = computed(() => this.post()?.modules ?? []);
  sidebar = computed(() => this.post()?.sidebar ?? null);
  mobileOrder = computed(() => this.post()?.mobileOrder ?? []);
  articleMainTypography = computed(() => this.post()?.articleMainTypography ?? null);
  articleMainSummaryTypography = computed(() => this.post()?.articleMainSummaryTypography ?? null);
  articleMainSummaryRows = computed(() => this.post()?.articleMainSummaryRows ?? null);

  hasLayoutContent(): boolean {
    return this.articleModules().length > 0 || !!this.sidebar();
  }

  breadcrumbs = computed(() => {
    const p = this.post();
    if (!p) return [];
    const cat = p.categories[0];
    return [
      ...(cat ? [{ label: cat.name, href: `/category/${cat.slug}` }] : []),
      { label: p.title.slice(0, 50) + (p.title.length > 50 ? '…' : '') },
    ];
  });

  currentUrl() {
    return typeof window !== 'undefined' ? window.location.href : '';
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

  mainArticleContentStyle(): string {
    return this.composeStyle(
      this.articleMainTypography()?.content,
      'var(--article-content-font-size, 17px)',
      'var(--article-content-font-weight, 400)',
      'var(--article-content-color, inherit)',
    );
  }

  displayAuthor(): string | null {
    const p = this.post();
    if (!p) return null;
    return p.authorName?.trim() || p.author?.displayName || null;
  }

  showDate(): boolean {
    const p = this.post();
    return !!p && p.showDate !== false && !!p.publishedAt;
  }

  showAuthor(): boolean {
    const p = this.post();
    return !!p && p.showAuthor !== false && !!this.displayAuthor();
  }

  showViews(): boolean {
    const p = this.post();
    return !!p && this.siteSettings.canShowViews(p);
  }

  formatDate(dateStr: string): string {
    return formatPostDateForList(dateStr);
  }

  cleanExcerpt(excerpt: string): string {
    return excerpt.replace(/<[^>]*>/g, '').trim();
  }

  showMainArticleSummary(): boolean {
    const post = this.post();
    if (!post?.excerpt) return false;
    return post.articleMainShowSummary !== false;
  }

  bulbLabel(item: PostBulbResolved): string {
    const override = item.labelOverride?.trim();
    return override || item.post.title;
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
