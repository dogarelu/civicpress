import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT,
  type LayoutDisplaySlot,
  type PostSummary,
} from '@civicpress/shared';
import { PostImagePillComponent } from '../post-image-pill.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import { formatPostDateForList } from '../../utils/post-date-display';

/** Sidebar block: vertical list of articles with title overlaid on image. */
@Component({
  selector: 'cp-sidebar-overlay-list',
  standalone: true,
  imports: [CommonModule, RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    @if (normalizedItems.length > 0) {
      <aside class="bg-white border border-border rounded-sm shadow-sm">
        <header class="px-3 py-2 bg-gray-100 border-b border-border rounded-t-sm">
          <span class="text-gray-800 text-xs font-bold uppercase tracking-wider">
            {{ title }}
          </span>
        </header>
        <div class="p-3 space-y-4">
          @for (item of normalizedItems; track item.post.id) {
            <article
              class="group border border-border rounded-sm shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow duration-200"
            >
              <a
                [routerLink]="'/' + item.post.slug"
                class="block relative aspect-[16/10] overflow-hidden bg-muted"
              >
                @if (item.post.heroImage) {
                  <img
                    [src]="item.post.heroImage.url"
                    [alt]="item.post.heroImage.alt ?? item.post.title"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                } @else {
                  <div class="w-full h-full bg-gray-200"></div>
                }
                <div
                  class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-3 py-2.5"
                >
                  <h4
                    class="text-white leading-tight line-clamp-3"
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
                      @if (canShowDate(item, item.post) && canShowViews(item.post)) {
                        <span class="mx-1 text-white/70">•</span>
                      }
                      @if (canShowViews(item.post)) {
                        <cp-post-view-count [count]="item.post.viewCount!" />
                      }
                    </div>
                  }
                </div>
                <div class="absolute top-2 right-2 z-10">
                  <cp-post-image-pill [pill]="item.post.pill" size="sm" [floating]="false" />
                </div>
              </a>
            </article>
          }
        </div>
      </aside>
    }
  `,
})
export class SidebarOverlayListComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() posts: PostSummary[] = [];
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  @Input() title = SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT;

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

  canShowMeta(item: { showDate: boolean }, post: PostSummary): boolean {
    return this.canShowDate(item, post) || this.canShowViews(post);
  }

  formatDate(dateStr: string | null): string {
    return formatPostDateForList(dateStr);
  }
}
