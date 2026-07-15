import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { ResolvedModule } from '@civicpress/shared';
import { cleanExcerptText } from '@civicpress/shared';
import { PostImagePillComponent } from '../post-image-pill.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import { formatPostDateForList } from '../../utils/post-date-display';

/** Module: full-width image slideshow with title and date overlay. */
@Component({
  selector: 'cp-module-slideshow',
  standalone: true,
  imports: [CommonModule, RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    @if (items.length > 0) {
      <div class="relative overflow-hidden rounded-sm shadow-sm bg-muted">
        <div class="relative aspect-[16/9] max-h-[440px]">
          @for (item of items; track item.post.id; let i = $index) {
            <article
              class="absolute inset-0 transition-opacity duration-500"
              [class.opacity-100]="i === activeIndex"
              [class.opacity-0]="i !== activeIndex"
              [class.pointer-events-none]="i !== activeIndex"
            >
              <a [routerLink]="'/' + item.post.slug" class="block h-full">
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
                <div
                  class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 sm:px-6 py-4 sm:py-6"
                >
                  @if (showCategory && item.post.primaryCategory) {
                    <span
                      class="uppercase tracking-wider mb-2 inline-block px-2 py-0.5 rounded-sm bg-white/20 text-white"
                      style="font-size: var(--module-category-font-size, 12px); font-weight: var(--module-category-font-weight, 700); color: var(--module-category-color, currentColor);"
                    >
                      {{ item.post.primaryCategory.name }}
                    </span>
                  }
                  <h2
                    class="font-heading text-white leading-tight line-clamp-3"
                    style="font-size: var(--hero-title-font-size, 28px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
                  >
                    {{ item.post.title }}
                  </h2>
                  @if (showSummary && item.post.excerpt) {
                    <p
                      class="mt-2 news-summary-clamp text-white/85"
                      style="font-size: var(--news-summary-font-size, 14px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
                    >
                      {{ cleanExcerpt(item.post) }}
                    </p>
                  }
                  @if (canShowDate(item, item.post) || canShowViews(item.post)) {
                    <div
                      class="mt-2 text-white/85 flex items-center gap-2"
                      style="font-size: var(--module-meta-font-size, 14px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                    >
                      @if (canShowDate(item, item.post)) {
                        <time [dateTime]="item.post.publishedAt">
                          {{ formatDate(item.post.publishedAt) }}
                        </time>
                      }
                      @if (canShowDate(item, item.post) && canShowViews(item.post)) {
                        <span>•</span>
                      }
                      @if (canShowViews(item.post)) {
                        <cp-post-view-count [count]="item.post.viewCount!" />
                      }
                    </div>
                  }
                </div>
              </a>
              <div class="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
                <cp-post-image-pill [pill]="item.post.pill" size="lg" [floating]="false" />
              </div>
            </article>
          }
        </div>

        @if (items.length > 1) {
          <button
            type="button"
            (click)="prev()"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors"
            aria-label="Slide anterior"
          >
            ‹
          </button>
          <button
            type="button"
            (click)="next()"
            class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors"
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

  activeIndex = 0;

  cleanExcerpt(post: ResolvedModule['posts'][number]['post']): string {
    return cleanExcerptText(post.excerpt);
  }

  prev() {
    if (this.items.length === 0) return;
    this.activeIndex = (this.activeIndex - 1 + this.items.length) % this.items.length;
  }

  next() {
    if (this.items.length === 0) return;
    this.activeIndex = (this.activeIndex + 1) % this.items.length;
  }

  goTo(index: number) {
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

  formatDate(dateStr: string | null): string {
    return formatPostDateForList(dateStr);
  }
}
