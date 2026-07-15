import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { LayoutDisplaySlot, PostSummary, ResolvedModule } from '@civicpress/shared';
import { cleanExcerptText } from '@civicpress/shared';
import { PostImagePillComponent } from './post-image-pill.component';
import { PostViewCountComponent } from './post-view-count.component';
import { SiteSettingsService } from '../services/site-settings.service';
import { formatPostDateForList } from '../utils/post-date-display';

@Component({
  selector: 'cp-recomandare-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    <div [class]="fillHeight ? 'h-full flex flex-col gap-4' : 'space-y-4'">
      @for (item of normalizedItems; track item.post.id) {
        @let post = item.post;
        <article
          class="group border-b border-border pb-4 last:border-0 last:pb-0"
          [class.flex-1]="fillHeight"
        >
          <div class="flex gap-2">
            <div class="flex-1 min-w-0">
              @if (showCategory && post.primaryCategory) {
                <span
                  class="uppercase tracking-wider mb-0.5 block text-gray-600"
                  style="font-size: var(--module-category-font-size, 10px); font-weight: var(--module-category-font-weight, 700); color: var(--module-category-color, currentColor);"
                >
                  {{ post.primaryCategory.name }}
                </span>
              }
              <h4
                class="leading-tight text-secondary"
                style="font-size: var(--sidebar-title-font-size, 13px); font-weight: var(--sidebar-title-font-weight, 600); color: var(--sidebar-title-color, currentColor);"
              >
                <a
                  [routerLink]="'/' + post.slug"
                  class="hover:text-primary transition-colors line-clamp-3"
                >
                  {{ post.title }}
                </a>
              </h4>
              @if (canShowMeta(item, post)) {
                <div
                  class="mt-1 text-gray-500"
                  style="font-size: var(--module-meta-font-size, 11px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                >
                  @if (canShowDate(item, post)) {
                    <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                  }
                  @if (
                    canShowDate(item, post) && (canShowAuthor(item, post) || canShowViews(post))
                  ) {
                    <span class="mx-1 text-gray-300">•</span>
                  }
                  @if (canShowAuthor(item, post) && displayAuthor(post); as authorName) {
                    <span>{{ authorName }}</span>
                  }
                  @if (canShowAuthor(item, post) && canShowViews(post)) {
                    <span class="mx-1 text-gray-300">•</span>
                  }
                  @if (canShowViews(post)) {
                    <cp-post-view-count [count]="post.viewCount!" />
                  }
                </div>
              }
            </div>
            @if (post.heroImage) {
              <a [routerLink]="'/' + post.slug" class="flex-shrink-0">
                <div class="relative w-[90px] h-[60px] overflow-hidden bg-muted">
                  <img
                    [src]="post.heroImage.url"
                    [alt]="post.heroImage.alt ?? post.title"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                    width="90"
                    height="60"
                  />
                  <cp-post-image-pill [pill]="post.pill" size="sm" />
                </div>
              </a>
            }
          </div>
          @if (showSummary && post.excerpt) {
            <p
              class="mt-1 news-summary-clamp text-gray-600"
              style="font-size: var(--news-summary-font-size, 12px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
            >
              {{ cleanExcerpt(post) }}
            </p>
          }
        </article>
      }
    </div>
  `,
})
export class RecomandateSidebarComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() posts: PostSummary[] = [];
  @Input() items: ResolvedModule['posts'] | null = null;
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  /** Stretch items evenly so the list fills the full height of its container. */
  @Input() fillHeight = false;
  /** Show each item's primary category label above the title. */
  @Input() showCategory = true;
  /** Show excerpt text under each item. */
  @Input() showSummary = true;

  get normalizedItems(): ResolvedModule['posts'] {
    if (this.items && this.items.length > 0) return this.items;
    return this.posts.map((post, index) => ({
      post,
      showDate: this.displaySlots[index]?.showDate ?? true,
      showAuthor: this.displaySlots[index]?.showAuthor ?? true,
    }));
  }

  cleanExcerpt(post: PostSummary): string {
    return cleanExcerptText(post.excerpt);
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
