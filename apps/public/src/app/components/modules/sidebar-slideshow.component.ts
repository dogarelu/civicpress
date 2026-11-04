import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type {
  PostDateFormat,
  LayoutDisplaySlot,
  PostSummary,
  SidebarSlideshowTextPosition,
} from '@civicpress/shared';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { PostModuleMediaComponent } from '../post-module-media.component';
import { SiteSettingsService } from '../../services/site-settings.service';

@Component({
  selector: 'cp-sidebar-slideshow',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PostImagePillsComponent,
    PostSubtitleComponent,
    PostViewCountComponent,
    PostReadingTimeComponent,
    PostModuleMediaComponent,
  ],
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
                <cp-post-module-media
                  [post]="item.post"
                  playMode="inline"
                  [active]="i === activeIndex"
                  [eager]="i === 0"
                  (playingChange)="onPlayingChange($event, i)"
                >
                  <cp-post-image-pills [pills]="item.post.pills" size="sm" />
                </cp-post-module-media>
                @if (textPosition === 'on-image' && !(i === activeIndex && slidePlaying)) {
                  <a
                    [routerLink]="'/' + item.post.slug"
                    class="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-3 py-3"
                  >
                    <h4
                      class="text-white leading-tight"
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
              </article>
            }
          </div>

          @if (textPosition === 'below-image') {
            @let item = normalizedItems[activeIndex];
            @if (item) {
              <div class="px-3 py-3 border-t border-black/40 bg-black/90">
                <h4
                  class="leading-tight text-white"
                  style="font-size: var(--sidebar-title-font-size, 13px); font-weight: var(--sidebar-title-font-weight, 600); color: var(--sidebar-title-color, #ffffff);"
                >
                  <a
                    [routerLink]="'/' + item.post.slug"
                    class="hover:text-white/90 transition-colors"
                  >
                    {{ item.post.title }}
                  </a>
                </h4>
                <cp-post-subtitle
                  [show]="showSummary"
                  [showBumbi]="showBumbi"
                  [bulbi]="item.post.bulbi ?? []"
                  [excerpt]="item.post.excerpt"
                  listClass="mt-1 text-white/85"
                  textClass="mt-1 text-white/85"
                />
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
                    @if (canShowDate(item, item.post) && canShowReadingTime(item.post)) {
                      <span class="mx-1 text-white/60">•</span>
                    }
                    @if (canShowReadingTime(item.post)) {
                      <cp-post-reading-time [seconds]="item.post.readingTimeSeconds!" />
                    }
                    @if (
                      (canShowDate(item, item.post) || canShowReadingTime(item.post)) &&
                      canShowViews(item.post)
                    ) {
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
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  activeIndex = 0;
  slidePlaying = false;

  onPlayingChange(playing: boolean, index: number): void {
    if (index === this.activeIndex) this.slidePlaying = playing;
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
    this.slidePlaying = false;
    this.activeIndex =
      (this.activeIndex - 1 + this.normalizedItems.length) % this.normalizedItems.length;
  }

  next() {
    if (this.normalizedItems.length === 0) return;
    this.slidePlaying = false;
    this.activeIndex = (this.activeIndex + 1) % this.normalizedItems.length;
  }

  goTo(index: number) {
    this.slidePlaying = false;
    this.activeIndex = index;
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
