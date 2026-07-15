import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type {
  LayoutDisplaySlot,
  PostSummary,
  SidebarSlideshowTextPosition,
} from '@civicpress/shared';
import { cleanExcerptText } from '@civicpress/shared';
import { PostImagePillComponent } from '../post-image-pill.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import { formatPostDateForList } from '../../utils/post-date-display';

@Component({
  selector: 'cp-sidebar-slideshow',
  standalone: true,
  imports: [CommonModule, RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    @if (normalizedItems.length > 0) {
      <aside class="bg-white border border-border rounded-sm shadow-sm overflow-hidden">
        <div class="relative">
          <div class="relative aspect-[4/3] bg-muted overflow-hidden">
            @for (item of normalizedItems; track item.post.id; let i = $index) {
              <article
                class="absolute inset-0 transition-opacity duration-500"
                [class.opacity-100]="i === activeIndex"
                [class.opacity-0]="i !== activeIndex"
                [class.pointer-events-none]="i !== activeIndex"
              >
                <a [routerLink]="'/' + item.post.slug" class="block h-full relative">
                  @if (item.post.heroImage) {
                    <img
                      [src]="item.post.heroImage.url"
                      [alt]="item.post.heroImage.alt ?? item.post.title"
                      class="w-full h-full object-cover"
                      [loading]="i === 0 ? 'eager' : 'lazy'"
                    />
                  } @else {
                    <div class="w-full h-full bg-gray-200"></div>
                  }

                  @if (textPosition === 'on-image') {
                    <div
                      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-3 py-3"
                    >
                      <h4
                        class="text-white leading-tight line-clamp-3"
                        style="font-size: var(--sidebar-title-font-size, 13px); font-weight: var(--sidebar-title-font-weight, 600); color: var(--sidebar-title-color, currentColor);"
                      >
                        {{ item.post.title }}
                      </h4>
                      @if (canShowMeta(item, item.post)) {
                        <div
                          class="mt-1.5 text-white/90"
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
                  }
                </a>

                <div class="absolute top-2 right-2 z-10 flex flex-col items-end gap-1.5">
                  <cp-post-image-pill [pill]="item.post.pill" size="sm" [floating]="false" />
                </div>
              </article>
            }
          </div>

          @if (textPosition === 'below-image') {
            @let item = normalizedItems[activeIndex];
            @if (item) {
              <div class="px-3 py-3 border-t border-black/40 bg-black/90">
                <h4
                  class="leading-tight line-clamp-3 text-white"
                  style="font-size: var(--sidebar-title-font-size, 13px); font-weight: var(--sidebar-title-font-weight, 600); color: var(--sidebar-title-color, #ffffff);"
                >
                  <a
                    [routerLink]="'/' + item.post.slug"
                    class="hover:text-white/90 transition-colors"
                  >
                    {{ item.post.title }}
                  </a>
                </h4>
                @if (showSummary && item.post.excerpt) {
                  <p
                    class="mt-1 news-summary-clamp text-white/85"
                    style="font-size: var(--news-summary-font-size, 12px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, rgba(255,255,255,0.85));"
                  >
                    {{ cleanExcerpt(item.post) }}
                  </p>
                }
                @if (canShowMeta(item, item.post)) {
                  <div
                    class="mt-1.5 text-white/85"
                    style="font-size: var(--module-meta-font-size, 11px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                  >
                    @if (canShowDate(item, item.post)) {
                      <time [dateTime]="item.post.publishedAt">{{
                        formatDate(item.post.publishedAt)
                      }}</time>
                    }
                    @if (canShowDate(item, item.post) && canShowViews(item.post)) {
                      <span class="mx-1 text-white/60">•</span>
                    }
                    @if (canShowViews(item.post)) {
                      <cp-post-view-count [count]="item.post.viewCount!" />
                    }
                  </div>
                }
              </div>
            }
          }

          @if (normalizedItems.length > 1) {
            <button
              type="button"
              (click)="prev()"
              class="absolute left-2 top-[40%] -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors"
              aria-label="Slide anterior"
            >
              ‹
            </button>
            <button
              type="button"
              (click)="next()"
              class="absolute right-2 top-[40%] -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors"
              aria-label="Slide următor"
            >
              ›
            </button>
            <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              @for (item of normalizedItems; track item.post.id; let i = $index) {
                <button
                  type="button"
                  (click)="goTo(i)"
                  class="w-2 h-2 rounded-full transition-colors"
                  [ngClass]="i === activeIndex ? 'bg-white' : 'bg-white/45'"
                  [attr.aria-label]="'Slide ' + (i + 1)"
                ></button>
              }
            </div>
          }
        </div>
      </aside>
    }
  `,
})
export class SidebarSlideshowComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() posts: PostSummary[] = [];
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  @Input() textPosition: SidebarSlideshowTextPosition = 'on-image';
  @Input() showSummary = true;

  activeIndex = 0;

  cleanExcerpt(post: PostSummary): string {
    return cleanExcerptText(post.excerpt);
  }

  get normalizedItems(): Array<{ post: PostSummary; showDate: boolean; showAuthor: boolean }> {
    return this.posts.map((post, index) => ({
      post,
      showDate: this.displaySlots[index]?.showDate ?? true,
      showAuthor: this.displaySlots[index]?.showAuthor ?? true,
    }));
  }

  prev() {
    if (this.normalizedItems.length === 0) return;
    this.activeIndex =
      (this.activeIndex - 1 + this.normalizedItems.length) % this.normalizedItems.length;
  }

  next() {
    if (this.normalizedItems.length === 0) return;
    this.activeIndex = (this.activeIndex + 1) % this.normalizedItems.length;
  }

  goTo(index: number) {
    this.activeIndex = index;
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
