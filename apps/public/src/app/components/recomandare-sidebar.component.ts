import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  hasModuleMedia,
  type LayoutDisplaySlot,
  type PostDateFormat,
  type PostSummary,
  type ResolvedModule,
} from '@civicpress/shared';
import { CategoryLabelComponent } from './category-label.component';
import { PostImagePillsComponent } from './post-image-pills.component';
import { PostSubtitleComponent } from './post-subtitle.component';
import { PostViewCountComponent } from './post-view-count.component';
import { PostReadingTimeComponent } from './post-reading-time.component';
import { PostModuleMediaComponent } from './post-module-media.component';
import { SiteSettingsService } from '../services/site-settings.service';

@Component({
  selector: 'cp-recomandare-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CategoryLabelComponent,
    PostImagePillsComponent,
    PostSubtitleComponent,
    PostViewCountComponent,
    PostReadingTimeComponent,
    PostModuleMediaComponent,
  ],
  template: `
    <div
      [class]="
        fillHeight ? 'h-full flex flex-col divide-y divide-gray-400' : 'divide-y divide-gray-400'
      "
    >
      @for (item of normalizedItems; track item.post.id) {
        @let post = item.post;
        <article class="group py-3 flex flex-col" [class.flex-1]="fillHeight">
          <div class="flex gap-2">
            <div class="flex-1 min-w-0">
              <h4
                class="leading-tight text-secondary"
                style="font-size: var(--sidebar-title-font-size, 13px); font-weight: var(--sidebar-title-font-weight, 600); color: var(--sidebar-title-color, currentColor);"
              >
                <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
                  {{ post.title }}
                </a>
              </h4>
            </div>
            @if (hasModuleMedia(post)) {
              <div class="relative w-[90px] h-[60px] overflow-hidden bg-muted flex-shrink-0">
                <cp-post-module-media [post]="post" playMode="overlay" playButton="sm">
                  <cp-post-image-pills [pills]="post.pills" size="sm" />
                </cp-post-module-media>
              </div>
            }
          </div>
          <cp-post-subtitle
            [show]="showSummary"
            [showBumbi]="showBumbi"
            [bulbi]="post.bulbi ?? []"
            [excerpt]="post.excerpt"
            listClass="mt-1 text-gray-600"
            textClass="mt-1 text-gray-600"
          />
          @if (canShowMeta(item, post)) {
            <div
              class="flex items-center justify-between gap-2 mt-auto pt-1 text-gray-500"
              style="font-size: var(--module-meta-font-size, 11px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
            >
              <div class="flex items-center gap-1 min-w-0">
                @if (canShowDate(item, post)) {
                  <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                }
                @if (canShowDate(item, post) && canShowReadingTime(post)) {
                  <span class="text-gray-300">•</span>
                }
                @if (canShowReadingTime(post)) {
                  <cp-post-reading-time [seconds]="post.readingTimeSeconds!" />
                }
                @if (
                  (canShowDate(item, post) || canShowReadingTime(post)) &&
                  (canShowAuthor(item, post) || canShowViews(post))
                ) {
                  <span class="text-gray-300">•</span>
                }
                @if (canShowAuthor(item, post) && displayAuthor(post); as authorName) {
                  <span>{{ authorName }}</span>
                }
                @if (canShowAuthor(item, post) && canShowViews(post)) {
                  <span class="text-gray-300">•</span>
                }
                @if (canShowViews(post)) {
                  <cp-post-view-count [count]="post.viewCount!" />
                }
              </div>
              @if (canShowCategory(post)) {
                <cp-category-label
                  [name]="post.primaryCategory!.name"
                  [slug]="post.primaryCategory!.slug"
                  extraClass="shrink-0"
                />
              }
            </div>
          }
        </article>
      }
    </div>
  `,
})
export class RecomandateSidebarComponent {
  private siteSettings = inject(SiteSettingsService);
  readonly hasModuleMedia = hasModuleMedia;

  @Input() posts: PostSummary[] = [];
  @Input() items: ResolvedModule['posts'] | null = null;
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  /** Stretch items evenly so the list fills the full height of its container. */
  @Input() fillHeight = false;
  /** Show each item's primary category label on the meta row (beside the date). */
  @Input() showCategory = true;
  /** Show excerpt text under each item. */
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  /** Per-module date format override. Null = inherit site setting. */
  @Input() dateFormat: PostDateFormat | null = null;
  /** When true, show reading time next to the date. */
  @Input() showReadingTime = false;

  get normalizedItems(): ResolvedModule['posts'] {
    if (this.items && this.items.length > 0) return this.items;
    return this.posts.map((post, index) => ({
      post,
      showDate: this.displaySlots[index]?.showDate ?? true,
      showAuthor: this.displaySlots[index]?.showAuthor ?? true,
    }));
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

  canShowReadingTime(post: PostSummary): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowCategory(post: PostSummary): boolean {
    return this.showCategory && !!post.primaryCategory;
  }

  canShowMeta(item: ResolvedModule['posts'][number], post: PostSummary): boolean {
    return (
      this.canShowAuthor(item, post) ||
      this.canShowDate(item, post) ||
      this.canShowReadingTime(post) ||
      this.canShowViews(post) ||
      this.canShowCategory(post)
    );
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
