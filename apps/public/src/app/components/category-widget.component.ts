import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  normalizeCategoryColor,
  type CategoryStrip,
  type LayoutDisplaySlot,
  type PostDateFormat,
} from '@civicpress/shared';
import { PostImagePillsComponent } from './post-image-pills.component';
import { PostSubtitleComponent } from './post-subtitle.component';
import { PostViewCountComponent } from './post-view-count.component';
import { PostReadingTimeComponent } from './post-reading-time.component';
import { SiteSettingsService } from '../services/site-settings.service';

@Component({
  selector: 'cp-category-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PostImagePillsComponent,
    PostSubtitleComponent,
    PostViewCountComponent,
    PostReadingTimeComponent,
  ],
  template: `
    @if (strip) {
      <aside class="bg-white border border-border rounded-sm shadow-sm overflow-hidden">
        <header
          class="relative px-3 py-2 text-center cp-row-header-bar border-b border-border"
          [style.--category-color]="stripCategoryColor"
        >
          <a
            [routerLink]="['/category', strip.category.slug]"
            class="uppercase tracking-wider hover:opacity-80 transition-opacity"
            style="font-size: var(--row-header-font-size, 12px); font-weight: var(--row-header-font-weight, 700); color: var(--row-header-color, #1f2937);"
            >{{ strip.category.name }}</a
          >
          <a
            [routerLink]="['/category', strip.category.slug]"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] hover:text-gray-700 transition-colors uppercase tracking-wide"
            >Mai mult »</a
          >
        </header>
        <ul class="divide-y divide-gray-400">
          @for (post of strip.posts.slice(0, maxPosts); track post.id; let i = $index) {
            <li class="hover:bg-muted transition-colors">
              <article class="p-3 group">
                <div class="flex gap-3">
                  <div class="flex-1 min-w-0">
                    <h4
                      class="leading-tight text-secondary line-clamp-3"
                      style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
                    >
                      <a
                        [routerLink]="'/' + post.slug"
                        class="hover:text-gray-700 transition-colors"
                      >
                        {{ post.title }}
                      </a>
                    </h4>
                  </div>
                  @if (post.heroImage) {
                    <a [routerLink]="'/' + post.slug" class="flex-shrink-0">
                      <div class="relative w-[72px] h-[54px] overflow-hidden bg-muted rounded-sm">
                        <img
                          [src]="post.heroImage.url"
                          [alt]="post.heroImage.alt ?? post.title"
                          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                          width="72"
                          height="54"
                        />
                        <cp-post-image-pills [pills]="post.pills" size="sm" />
                      </div>
                    </a>
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
                @if (canShowMeta(i, post)) {
                  <div class="text-[10px] text-gray-400 mt-1">
                    @if (canShowDate(i, post)) {
                      <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                    }
                    @if (canShowDate(i, post) && canShowReadingTime(post)) {
                      <span class="mx-1 text-gray-300">•</span>
                    }
                    @if (canShowReadingTime(post)) {
                      <cp-post-reading-time [seconds]="post.readingTimeSeconds!" />
                    }
                    @if (
                      (canShowDate(i, post) || canShowReadingTime(post)) &&
                      (canShowAuthor(i, post) || canShowViews(post))
                    ) {
                      <span class="mx-1 text-gray-300">•</span>
                    }
                    @if (canShowAuthor(i, post) && displayAuthor(post); as authorName) {
                      <span>{{ authorName }}</span>
                    }
                    @if (canShowAuthor(i, post) && canShowViews(post)) {
                      <span class="mx-1 text-gray-300">•</span>
                    }
                    @if (canShowViews(post)) {
                      <cp-post-view-count [count]="post.viewCount!" />
                    }
                  </div>
                }
              </article>
            </li>
          }
        </ul>
      </aside>
    }
  `,
})
export class CategoryWidgetComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() strip: CategoryStrip | null = null;
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  /** Max posts to show; defaults to 4 for multi-category sidebar strips. */
  @Input() maxPosts = 4;
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  /** Per-module date format override. Null = inherit site setting. */
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  get stripCategoryColor(): string | null {
    return normalizeCategoryColor(this.strip?.category.color) ?? null;
  }

  displayAuthor(post: CategoryStrip['posts'][number]): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(index: number, post: CategoryStrip['posts'][number]): boolean {
    return this.slotShowDate(index) && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(index: number, post: CategoryStrip['posts'][number]): boolean {
    return this.slotShowAuthor(index) && post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: CategoryStrip['posts'][number]): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(post: CategoryStrip['posts'][number]): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowMeta(index: number, post: CategoryStrip['posts'][number]): boolean {
    return (
      this.canShowAuthor(index, post) ||
      this.canShowDate(index, post) ||
      this.canShowReadingTime(post) ||
      this.canShowViews(post)
    );
  }

  slotShowDate(index: number): boolean {
    return this.displaySlots[index]?.showDate ?? true;
  }

  slotShowAuthor(index: number): boolean {
    return this.displaySlots[index]?.showAuthor ?? true;
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
