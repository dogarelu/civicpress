import {
  Component,
  Input,
  OnDestroy,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { MobileTextPosition, ResolvedMobileModule, PostDateFormat } from '@civicpress/shared';
import { CategoryLabelComponent } from '../category-label.component';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { PostModuleMediaComponent } from '../post-module-media.component';
import { SiteSettingsService } from '../../services/site-settings.service';

const AUTOPLAY_MS = 5000;

/** Mobile slideshow with fixed 5s autoplay and on-image / below-image title. */
@Component({
  selector: 'cp-mobile-module-slideshow',
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
      <div class="relative overflow-hidden rounded-sm bg-muted">
        <div class="relative aspect-[16/9]">
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
                <cp-post-image-pills [pills]="item.post.pills" size="sm" />
              </cp-post-module-media>
              @if (textPosition === 'on-image' && !(i === activeIndex && slidePlaying)) {
                <a
                  [routerLink]="'/' + item.post.slug"
                  class="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 py-4"
                >
                  @if (showCategory && item.post.primaryCategory) {
                    <cp-category-label
                      [onImage]="true"
                      [link]="false"
                      [name]="item.post.primaryCategory.name"
                      [slug]="item.post.primaryCategory.slug"
                      extraClass="tracking-wider mb-1.5"
                    />
                  }
                  <h2
                    class="font-heading text-white leading-tight"
                    style="font-size: var(--hero-title-font-size, 22px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
                  >
                    {{ item.post.title }}
                  </h2>
                  <cp-post-subtitle
                    [show]="showSummary"
                    [showBumbi]="showBumbi"
                    [bulbi]="item.post.bulbi ?? []"
                    [excerpt]="item.post.excerpt"
                    listClass="mt-1.5 text-white/85"
                    textClass="mt-1.5 text-white/85"
                  />
                  @if (canShowMeta(item)) {
                    <div
                      class="mt-1.5 text-white/85 flex items-center gap-2"
                      style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400);"
                    >
                      @if (canShowDate(item)) {
                        <time [dateTime]="item.post.publishedAt">
                          {{ formatDate(item.post.publishedAt) }}
                        </time>
                      }
                      @if (canShowDate(item) && canShowReadingTime(item.post)) {
                        <span>•</span>
                      }
                      @if (canShowReadingTime(item.post)) {
                        <cp-post-reading-time [seconds]="item.post.readingTimeSeconds!" />
                      }
                      @if (
                        (canShowDate(item) || canShowReadingTime(item.post)) &&
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
          @if (items.length > 1) {
            <button
              type="button"
              class="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
              (click)="prev(); restartAutoplay()"
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
              (click)="next(); restartAutoplay()"
              aria-label="Următor"
            >
              ›
            </button>
          }
        </div>
        @if (textPosition === 'below-image') {
          @let item = items[activeIndex];
          @if (item) {
            <div class="pt-3 pb-1">
              @if (showCategory && item.post.primaryCategory) {
                <cp-category-label
                  [name]="item.post.primaryCategory.name"
                  [slug]="item.post.primaryCategory.slug"
                  extraClass=""
                />
              }
              <h2
                class="font-heading leading-tight text-secondary"
                style="font-size: var(--hero-title-font-size, 22px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
              >
                <a [routerLink]="'/' + item.post.slug" class="hover:text-primary transition-colors">
                  {{ item.post.title }}
                </a>
              </h2>
              <cp-post-subtitle
                [show]="showSummary"
                [showBumbi]="showBumbi"
                [bulbi]="item.post.bulbi ?? []"
                [excerpt]="item.post.excerpt"
                listClass="mt-1.5 text-gray-700"
                textClass="mt-1.5 text-gray-700"
              />
              @if (canShowMeta(item)) {
                <div
                  class="mt-1.5 text-gray-500 flex items-center gap-2"
                  style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                >
                  @if (canShowDate(item)) {
                    <time [dateTime]="item.post.publishedAt">
                      {{ formatDate(item.post.publishedAt) }}
                    </time>
                  }
                  @if (canShowDate(item) && canShowReadingTime(item.post)) {
                    <span class="text-gray-300">•</span>
                  }
                  @if (canShowReadingTime(item.post)) {
                    <cp-post-reading-time [seconds]="item.post.readingTimeSeconds!" />
                  }
                  @if (
                    (canShowDate(item) || canShowReadingTime(item.post)) && canShowViews(item.post)
                  ) {
                    <span class="text-gray-300">•</span>
                  }
                  @if (canShowViews(item.post)) {
                    <cp-post-view-count [count]="item.post.viewCount!" />
                  }
                </div>
              }
            </div>
          }
        }
        @if (items.length > 1) {
          <div class="flex justify-center gap-1.5 py-2">
            @for (item of items; track item.post.id; let i = $index) {
              <button
                type="button"
                class="w-2 h-2 rounded-full transition-colors"
                [class.bg-primary]="i === activeIndex"
                [class.bg-gray-300]="i !== activeIndex"
                (click)="goTo(i); restartAutoplay()"
                [attr.aria-label]="'Slide ' + (i + 1)"
              ></button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class MobileModuleSlideshowComponent implements OnInit, OnChanges, OnDestroy {
  private siteSettings = inject(SiteSettingsService);
  private timer: ReturnType<typeof setInterval> | null = null;

  @Input() items: ResolvedMobileModule['posts'] = [];
  @Input() textPosition: MobileTextPosition = 'on-image';
  @Input() showCategory = false;
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  activeIndex = 0;
  slidePlaying = false;

  ngOnInit(): void {
    this.restartAutoplay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] && !changes['items'].firstChange) {
      this.activeIndex = 0;
      this.restartAutoplay();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  onPlayingChange(playing: boolean, index: number): void {
    if (index !== this.activeIndex) return;
    this.slidePlaying = playing;
    if (playing) this.stopAutoplay();
    else this.restartAutoplay();
  }

  prev(): void {
    if (this.items.length === 0) return;
    this.slidePlaying = false;
    this.activeIndex = (this.activeIndex - 1 + this.items.length) % this.items.length;
  }

  next(): void {
    if (this.items.length === 0) return;
    this.slidePlaying = false;
    this.activeIndex = (this.activeIndex + 1) % this.items.length;
  }

  goTo(index: number): void {
    this.slidePlaying = false;
    this.activeIndex = index;
  }

  restartAutoplay(): void {
    this.stopAutoplay();
    if (this.slidePlaying || this.items.length <= 1) return;
    this.timer = setInterval(() => this.next(), AUTOPLAY_MS);
  }

  private stopAutoplay(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  canShowDate(item: ResolvedMobileModule['posts'][number]): boolean {
    return item.showDate && item.post.showDate !== false && !!item.post.publishedAt;
  }

  canShowViews(post: ResolvedMobileModule['posts'][number]['post']): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(post: ResolvedMobileModule['posts'][number]['post']): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowMeta(item: ResolvedMobileModule['posts'][number]): boolean {
    return (
      this.canShowDate(item) || this.canShowReadingTime(item.post) || this.canShowViews(item.post)
    );
  }

  formatDate(dateStr: string | null): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
