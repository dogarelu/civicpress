import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT,
  type LayoutDisplaySlot,
  type PostDateFormat,
  type PostSummary,
} from '@civicpress/shared';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { PostModuleMediaComponent } from '../post-module-media.component';
import { SiteSettingsService } from '../../services/site-settings.service';

/** Sidebar block: vertical list of articles with title overlaid on image. */
@Component({
  selector: 'cp-sidebar-overlay-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PostImagePillsComponent,
    PostViewCountComponent,
    PostReadingTimeComponent,
    PostModuleMediaComponent,
  ],
  template: `
    @if (normalizedItems.length > 0) {
      <aside class="bg-white border border-border rounded-sm shadow-sm">
        <header class="px-3 py-2 text-center cp-row-header-bar border-b border-border rounded-t-sm">
          <span
            class="uppercase tracking-wider"
            style="font-size: var(--row-header-font-size, 12px); font-weight: var(--row-header-font-weight, 700); color: var(--row-header-color, #1f2937);"
          >
            {{ title }}
          </span>
        </header>
        <div class="p-3">
          @for (item of normalizedItems; track item.post.id; let last = $last) {
            <article
              class="group border border-border rounded-sm shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow duration-200"
            >
              <div class="relative aspect-[16/10] overflow-hidden bg-muted">
                <cp-post-module-media
                  [post]="item.post"
                  playMode="inline"
                  (playingChange)="setPlaying(item.post.id, $event)"
                >
                  <cp-post-image-pills [pills]="item.post.pills" size="sm" />
                </cp-post-module-media>
                @if (!isPlaying(item.post.id)) {
                  <a
                    [routerLink]="'/' + item.post.slug"
                    class="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-3 py-2.5"
                  >
                    <h4
                      class="text-white leading-tight"
                      style="font-size: var(--sidebar-title-font-size, 13px); font-weight: var(--sidebar-title-font-weight, 600); color: var(--sidebar-title-color, currentColor);"
                    >
                      {{ item.post.title }}
                    </h4>
                    @if (canShowMeta(item, item.post)) {
                      <div
                        class="mt-1 text-white/90"
                        style="font-size: var(--module-meta-font-size, 11px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                      >
                        @if (canShowDate(item, item.post)) {
                          <time [dateTime]="item.post.publishedAt">
                            {{ formatDate(item.post.publishedAt) }}
                          </time>
                        }
                        @if (canShowDate(item, item.post) && canShowReadingTime(item.post)) {
                          <span class="mx-1 text-white/70">•</span>
                        }
                        @if (canShowReadingTime(item.post)) {
                          <cp-post-reading-time [seconds]="item.post.readingTimeSeconds!" />
                        }
                        @if (
                          (canShowDate(item, item.post) || canShowReadingTime(item.post)) &&
                          canShowViews(item.post)
                        ) {
                          <span class="mx-1 text-white/70">•</span>
                        }
                        @if (canShowViews(item.post)) {
                          <cp-post-view-count [count]="item.post.viewCount!" />
                        }
                      </div>
                    }
                  </a>
                }
              </div>
            </article>
            @if (!last) {
              <div class="h-px w-full bg-gray-400 my-4" aria-hidden="true"></div>
            }
          }
        </div>
      </aside>
    }
  `,
})
export class SidebarOverlayListComponent {
  private siteSettings = inject(SiteSettingsService);
  playingIds: Record<string, boolean> = {};

  isPlaying(id: string): boolean {
    return !!this.playingIds[id];
  }

  setPlaying(id: string, playing: boolean): void {
    this.playingIds = { ...this.playingIds, [id]: playing };
  }

  @Input() posts: PostSummary[] = [];
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  @Input() title = SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  get normalizedItems(): Array<{ post: PostSummary; showDate: boolean; showAuthor: boolean }> {
    return this.posts.map((post, index) => ({
      post,
      showDate: this.displaySlots[index]?.showDate ?? true,
      showAuthor: this.displaySlots[index]?.showAuthor ?? true,
    }));
  }

  canShowDate(item: { showDate: boolean }, post: PostSummary): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowViews(post: PostSummary): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(post: PostSummary): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowMeta(item: { showDate: boolean }, post: PostSummary): boolean {
    return this.canShowDate(item, post) || this.canShowReadingTime(post) || this.canShowViews(post);
  }

  formatDate(dateStr: string | null): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
