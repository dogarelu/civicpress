import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PostImagePillComponent } from '../post-image-pill.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import type { PostSummary, ResolvedModule } from '@civicpress/shared';
import { cleanExcerptText } from '@civicpress/shared';
import { formatPostDateForList } from '../../utils/post-date-display';

/** Module: one full-width hero with overlay text + three secondary items in a row below. */
@Component({
  selector: 'cp-module-hero-top-list',
  standalone: true,
  imports: [RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    @if (mainItem; as item) {
      @let post = item.post;
      <article class="group">
        <a [routerLink]="'/' + post.slug" class="block">
          <div class="relative overflow-hidden bg-muted aspect-[16/9] rounded-sm">
            @if (post.heroImage) {
              <img
                [src]="post.heroImage.url"
                [alt]="post.heroImage.alt ?? post.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="eager"
                width="1200"
                height="675"
              />
            }
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
            ></div>
            <cp-post-image-pill [pill]="post.pill" size="lg" />

            <div class="absolute inset-x-0 bottom-0 p-4 md:p-6 text-white">
              @if (showCategory && post.primaryCategory) {
                <a
                  [routerLink]="['/category', post.primaryCategory.slug]"
                  class="uppercase tracking-wider mb-2 inline-block px-2 py-0.5 rounded-sm bg-white/20 hover:bg-white/30 transition-colors"
                  style="font-size: var(--module-category-font-size, 14px); font-weight: var(--module-category-font-weight, 700); color: var(--module-category-color, currentColor);"
                >
                  {{ post.primaryCategory.name }}
                </a>
              }
              <h2
                class="font-heading leading-tight text-white"
                style="font-size: var(--hero-title-font-size, 28px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
              >
                {{ post.title }}
              </h2>
              @if (showSummary && post.excerpt) {
                <p
                  class="mt-2 news-summary-clamp text-white/85"
                  style="font-size: var(--news-summary-font-size, 14px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
                >
                  {{ cleanExcerpt(post) }}
                </p>
              }
              @if (canShowMeta(item, post)) {
                <div
                  class="flex items-center gap-1.5 mt-2 text-white/90"
                  style="font-size: var(--module-meta-font-size, 14px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                >
                  @if (canShowDate(item, post)) {
                    <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                  }
                  @if (
                    canShowDate(item, post) && (canShowAuthor(item, post) || canShowViews(post))
                  ) {
                    <span class="text-white/60">•</span>
                  }
                  @if (canShowAuthor(item, post) && displayAuthor(post); as authorName) {
                    <span class="font-medium">{{ authorName }}</span>
                  }
                  @if (canShowAuthor(item, post) && canShowViews(post)) {
                    <span class="text-white/60">•</span>
                  }
                  @if (canShowViews(post)) {
                    <cp-post-view-count [count]="post.viewCount!" />
                  }
                </div>
              }
            </div>
          </div>
        </a>
      </article>
    }

    @if (secondaryItems.length > 0) {
      <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        @for (item of secondaryItems; track item.post.id) {
          @let post = item.post;
          <article
            class="group bg-white border border-border rounded-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            <a [routerLink]="'/' + post.slug" class="block">
              @if (post.heroImage) {
                <div class="relative overflow-hidden bg-muted aspect-[16/9]">
                  <img
                    [src]="post.heroImage.url"
                    [alt]="post.heroImage.alt ?? post.title"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    width="400"
                    height="225"
                  />
                  <cp-post-image-pill [pill]="post.pill" />
                </div>
              }
            </a>
            <div class="p-3">
              @if (showCategory && post.primaryCategory) {
                <a
                  [routerLink]="['/category', post.primaryCategory.slug]"
                  class="uppercase tracking-wider mb-1 inline-block text-gray-600 hover:text-gray-800 transition-colors"
                  style="font-size: var(--module-category-font-size, 12px); font-weight: var(--module-category-font-weight, 700); color: var(--module-category-color, currentColor);"
                >
                  {{ post.primaryCategory.name }}
                </a>
              }
              <h3
                class="font-heading leading-tight text-secondary line-clamp-3"
                style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
              >
                <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
                  {{ post.title }}
                </a>
              </h3>
              @if (showSummary && post.excerpt) {
                <p
                  class="text-gray-600 mt-2 news-summary-clamp"
                  style="font-size: var(--news-summary-font-size, 14px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
                >
                  {{ cleanExcerpt(post) }}
                </p>
              }
              @if (canShowMeta(item, post)) {
                <div
                  class="flex items-center gap-1.5 mt-2 text-gray-500"
                  style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                >
                  @if (canShowDate(item, post)) {
                    <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                  }
                  @if (
                    canShowDate(item, post) && (canShowAuthor(item, post) || canShowViews(post))
                  ) {
                    <span class="text-gray-300">•</span>
                  }
                  @if (canShowAuthor(item, post) && displayAuthor(post); as authorName) {
                    <span class="font-medium">{{ authorName }}</span>
                  }
                  @if (canShowAuthor(item, post) && canShowViews(post)) {
                    <span class="text-gray-300">•</span>
                  }
                  @if (canShowViews(post)) {
                    <cp-post-view-count [count]="post.viewCount!" />
                  }
                </div>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class ModuleHeroTopListComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() items: ResolvedModule['posts'] = [];
  /** Show the primary category label (overlay + secondary cards). */
  @Input() showCategory = true;
  /** Show excerpt text on the hero overlay and secondary cards. */
  @Input() showSummary = true;

  cleanExcerpt(post: PostSummary): string {
    return cleanExcerptText(post.excerpt);
  }

  get mainItem(): ResolvedModule['posts'][number] | null {
    return this.items[0] ?? null;
  }

  get secondaryItems(): ResolvedModule['posts'] {
    return this.items.slice(1, 4);
  }

  displayAuthor(post: PostSummary): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(item: ResolvedModule['posts'][number], post: PostSummary): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(item: ResolvedModule['posts'][number], post: PostSummary): boolean {
    return item.showAuthor && post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: PostSummary): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowMeta(item: ResolvedModule['posts'][number], post: PostSummary): boolean {
    return (
      this.canShowAuthor(item, post) || this.canShowDate(item, post) || this.canShowViews(post)
    );
  }

  formatDate(dateStr: string): string {
    return formatPostDateForList(dateStr);
  }
}
