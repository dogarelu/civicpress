import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  hasModuleMedia,
  type LayoutDisplaySlot,
  type PostSummary,
  type PostDateFormat,
} from '@civicpress/shared';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { PostModuleMediaComponent } from '../post-module-media.component';
import { SiteSettingsService } from '../../services/site-settings.service';

/** Sidebar block: vertical list of articles with dividers, matching rows-3/4 modules. */
@Component({
  selector: 'cp-sidebar-article-list',
  standalone: true,
  imports: [
    RouterModule,
    PostImagePillsComponent,
    PostSubtitleComponent,
    PostViewCountComponent,
    PostReadingTimeComponent,
    PostModuleMediaComponent,
  ],
  template: `
    @if (normalizedItems.length > 0) {
      <div>
        @if (title.trim().length > 0) {
          <header
            class="px-3 py-2 text-center cp-row-header-bar border border-border rounded-sm mb-3"
          >
            <span
              class="uppercase tracking-wider"
              style="font-size: var(--row-header-font-size, 12px); font-weight: var(--row-header-font-weight, 700); color: var(--row-header-color, #1f2937);"
              >{{ title }}</span
            >
          </header>
        }
        <div class="divide-y divide-gray-400">
          @for (item of normalizedItems; track item.post.id) {
            <article class="group flex flex-col py-4">
              @if (hasModuleMedia(item.post)) {
                <div class="relative overflow-hidden bg-muted aspect-[16/9]">
                  <cp-post-module-media [post]="item.post" playMode="inline">
                    <cp-post-image-pills [pills]="item.post.pills" />
                  </cp-post-module-media>
                </div>
              }
              <div class="pt-3 flex flex-col flex-1">
                @if (item.post.kicker) {
                  <p
                    class="italic mb-1.5"
                    style="font-size: var(--article-kicker-font-size, 16px); font-weight: var(--article-kicker-font-weight, 400); color: var(--article-kicker-color, #4b5563);"
                  >
                    {{ item.post.kicker }}
                  </p>
                }
                <h3
                  class="font-heading leading-tight text-secondary"
                  style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
                >
                  <a
                    [routerLink]="'/' + item.post.slug"
                    class="hover:text-primary transition-colors"
                  >
                    {{ item.post.title }}
                  </a>
                </h3>
                <cp-post-subtitle
                  [show]="showSummary"
                  [showBumbi]="showBumbi"
                  [bulbi]="item.post.bulbi ?? []"
                  [excerpt]="item.post.excerpt"
                  listClass="text-gray-600 mt-2"
                  textClass="text-gray-600 mt-2"
                />
                @if (canShowMeta(item, item.post)) {
                  <div
                    class="flex items-center gap-1.5 mt-auto pt-2 text-gray-500"
                    style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                  >
                    @if (canShowDate(item, item.post)) {
                      <time [dateTime]="item.post.publishedAt">{{
                        formatDate(item.post.publishedAt)
                      }}</time>
                    }
                    @if (canShowDate(item, item.post) && canShowReadingTime(item.post)) {
                      <span class="text-gray-300">•</span>
                    }
                    @if (canShowReadingTime(item.post)) {
                      <cp-post-reading-time [seconds]="item.post.readingTimeSeconds!" />
                    }
                    @if (
                      (canShowDate(item, item.post) || canShowReadingTime(item.post)) &&
                      (canShowAuthor(item, item.post) || canShowViews(item.post))
                    ) {
                      <span class="text-gray-300">•</span>
                    }
                    @if (
                      canShowAuthor(item, item.post) && displayAuthor(item.post);
                      as authorName
                    ) {
                      <span class="font-medium">{{ authorName }}</span>
                    }
                    @if (canShowAuthor(item, item.post) && canShowViews(item.post)) {
                      <span class="text-gray-300">•</span>
                    }
                    @if (canShowViews(item.post)) {
                      <cp-post-view-count [count]="item.post.viewCount!" />
                    }
                  </div>
                }
              </div>
            </article>
          }
        </div>
      </div>
    }
  `,
})
export class SidebarArticleListComponent {
  private siteSettings = inject(SiteSettingsService);
  readonly hasModuleMedia = hasModuleMedia;

  @Input() posts: PostSummary[] = [];
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  @Input() title = '';
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  get normalizedItems(): Array<{ post: PostSummary; showDate: boolean; showAuthor: boolean }> {
    return this.posts.map((post, index) => ({
      post,
      showDate: this.displaySlots[index]?.showDate ?? true,
      showAuthor: this.displaySlots[index]?.showAuthor ?? true,
    }));
  }

  displayAuthor(post: PostSummary): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(item: { showDate: boolean }, post: PostSummary): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(item: { showAuthor: boolean }, post: PostSummary): boolean {
    return item.showAuthor && post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: PostSummary): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(post: PostSummary): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowMeta(item: { showDate: boolean; showAuthor: boolean }, post: PostSummary): boolean {
    return (
      this.canShowAuthor(item, post) ||
      this.canShowDate(item, post) ||
      this.canShowReadingTime(post) ||
      this.canShowViews(post)
    );
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
