import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { ResolvedModule, PostDateFormat } from '@civicpress/shared';
import { CategoryLabelComponent } from '../category-label.component';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { PostModuleMediaComponent } from '../post-module-media.component';
import { SiteSettingsService } from '../../services/site-settings.service';

/** Module: full-width image slideshow with title and date overlay. */
@Component({
  selector: 'cp-module-slideshow',
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
    @if (items.length > 0) {
      <div class="relative overflow-hidden rounded-sm shadow-sm bg-muted">
        <div class="relative w-full overflow-hidden aspect-[16/9] max-h-[440px]">
          @for (item of items; track item.post.id; let i = $index) {
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
                <cp-post-image-pills [pills]="item.post.pills" size="lg" />
              </cp-post-module-media>
              @if (!(i === activeIndex && slidePlaying)) {
                <a
                  [routerLink]="'/' + item.post.slug"
                  class="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 sm:px-6 py-4 sm:py-6"
                >
                  @if (showCategory && item.post.primaryCategory) {
                    <cp-category-label
                      variant="hero"
                      [onImage]="true"
                      [link]="false"
                      [name]="item.post.primaryCategory.name"
                      [slug]="item.post.primaryCategory.slug"
                      extraClass="tracking-wider mb-2"
                    />
                  }
                  <h2
                    class="font-heading text-white leading-tight"
                    style="font-size: var(--hero-title-font-size, 28px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
                  >
                    {{ item.post.title }}
                  </h2>
                  <cp-post-subtitle
                    [show]="showSummary"
                    [showBumbi]="showBumbi"
                    [bulbi]="item.post.bulbi ?? []"
                    [excerpt]="item.post.excerpt"
                    variant="hero"
                    listClass="mt-2 text-white/85"
                    textClass="mt-2 text-white/85"
                  />
                  @if (
                    canShowDate(item, item.post) ||
                    canShowReadingTime(item.post) ||
                    canShowViews(item.post)
                  ) {
                    <div
                      class="mt-2 text-white/85 flex items-center gap-2"
                      style="font-size: var(--hero-meta-font-size, var(--module-meta-font-size, 14px)); font-weight: var(--hero-meta-font-weight, var(--module-meta-font-weight, 400)); color: var(--hero-meta-color, var(--module-meta-color, currentColor));"
                    >
                      @if (canShowDate(item, item.post)) {
                        <time [dateTime]="item.post.publishedAt">
                          {{ formatDate(item.post.publishedAt) }}
                        </time>
                      }
                      @if (canShowDate(item, item.post) && canShowReadingTime(item.post)) {
                        <span>•</span>
                      }
                      @if (canShowReadingTime(item.post)) {
                        <cp-post-reading-time [seconds]="item.post.readingTimeSeconds!" />
                      }
                      @if (
                        (canShowDate(item, item.post) || canShowReadingTime(item.post)) &&
                        canShowViews(item.post)
                      ) {
                        <span>•</span>
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

        @if (items.length > 1) {
          <button
            type="button"
            (click)="prev()"
            class="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors"
            aria-label="Slide anterior"
          >
            ‹
          </button>
          <button
            type="button"
            (click)="next()"
            class="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors"
            aria-label="Slide următor"
          >
            ›
          </button>
          <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            @for (item of items; track item.post.id; let i = $index) {
              <button
                type="button"
                (click)="goTo(i)"
                class="w-2.5 h-2.5 rounded-full transition-colors"
                [ngClass]="i === activeIndex ? 'bg-white' : 'bg-white/45'"
                [attr.aria-label]="'Slide ' + (i + 1)"
              ></button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class ModuleSlideshowComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() items: ResolvedModule['posts'] = [];
  /** Show the primary category label in the slide overlay. */
  @Input() showCategory = false;
  /** Show excerpt text in the slide overlay. */
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  activeIndex = 0;
  slidePlaying = false;

  onPlayingChange(playing: boolean, index: number): void {
    if (index === this.activeIndex) this.slidePlaying = playing;
  }

  prev() {
    if (this.items.length === 0) return;
    this.slidePlaying = false;
    this.activeIndex = (this.activeIndex - 1 + this.items.length) % this.items.length;
  }

  next() {
    if (this.items.length === 0) return;
    this.slidePlaying = false;
    this.activeIndex = (this.activeIndex + 1) % this.items.length;
  }

  goTo(index: number) {
    this.slidePlaying = false;
    this.activeIndex = index;
  }

  canShowDate(
    item: ResolvedModule['posts'][number],
    post: ResolvedModule['posts'][number]['post'],
  ): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowViews(post: ResolvedModule['posts'][number]['post']): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(post: ResolvedModule['posts'][number]['post']): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  formatDate(dateStr: string | null): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
