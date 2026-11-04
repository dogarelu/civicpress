import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  hasModuleMedia,
  normalizeCategoryColor,
  type PostSummary,
  type ResolvedCategoryColumn,
  type ResolvedModulePost,
  type PostDateFormat,
} from '@civicpress/shared';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { PostModuleMediaComponent } from '../post-module-media.component';
import { SiteSettingsService } from '../../services/site-settings.service';

/** Full-width module: 3–5 category columns, each with 1 main + N small articles. */
@Component({
  selector: 'cp-module-category-columns',
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
    <div
      class="grid grid-cols-1 gap-6 md:gap-0 md:-mx-4"
      [class.md:grid-cols-3]="columnCount === 3"
      [class.md:grid-cols-4]="columnCount === 4"
      [class.md:grid-cols-5]="columnCount === 5"
    >
      @for (col of visibleColumns; track col.id; let first = $first; let last = $last) {
        <section
          class="min-w-0 md:px-4"
          [class.pt-6]="!first"
          [class.border-t]="!first"
          [class.border-gray-400]="!first"
          [class.md:pt-0]="!first"
          [class.md:border-t-0]="!first"
          [class.md:border-r]="!last"
          [class.md:border-gray-400]="!last"
        >
          @if (col.title) {
            <h2
              class="font-heading font-bold text-gray-900 relative mb-3"
              [class.cp-module-section-title--cat-pill]="!!columnCategoryColor(col)"
              [style.--category-color]="columnCategoryColor(col)"
              style="font-size: var(--row-header-font-size, 16px); font-weight: var(--row-header-font-weight, 700); color: var(--row-header-color, currentColor);"
            >
              @if (col.category) {
                <a
                  [routerLink]="['/category', col.category.slug]"
                  class="cp-module-section-title-text hover:text-primary transition-colors"
                >
                  {{ col.title }}
                </a>
              } @else {
                <span class="cp-module-section-title-text">{{ col.title }}</span>
              }
              <span class="cp-module-section-title-rule" aria-hidden="true"></span>
            </h2>
          }

          @if (mainItem(col); as main) {
            <article class="group">
              @if (hasModuleMedia(main.post)) {
                <div class="relative overflow-hidden bg-muted aspect-[16/9]">
                  <cp-post-module-media [post]="main.post" playMode="inline">
                    <cp-post-image-pills [pills]="main.post.pills" />
                  </cp-post-module-media>
                </div>
              }
              <h3
                class="font-heading leading-tight text-secondary mt-3"
                style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
              >
                <a [routerLink]="'/' + main.post.slug" class="hover:text-primary transition-colors">
                  {{ main.post.title }}
                </a>
              </h3>
              <cp-post-subtitle
                [show]="false"
                [showBumbi]="showBumbi"
                [bulbi]="main.post.bulbi ?? []"
                listClass="text-gray-600 mt-2"
                textClass="text-gray-600 mt-2"
              />
              @if (canShowMeta(main, main.post)) {
                <div
                  class="flex items-center gap-1.5 mt-1.5 text-gray-500 min-w-0"
                  style="font-size: var(--hero-meta-font-size, var(--module-meta-font-size, 12px)); font-weight: var(--hero-meta-font-weight, var(--module-meta-font-weight, 400)); color: var(--hero-meta-color, var(--module-meta-color, currentColor));"
                >
                  @if (canShowDate(main, main.post)) {
                    <time [dateTime]="main.post.publishedAt">{{
                      formatDate(main.post.publishedAt)
                    }}</time>
                  }
                  @if (canShowDate(main, main.post) && canShowReadingTime(main.post)) {
                    <span class="text-gray-300">•</span>
                  }
                  @if (canShowReadingTime(main.post)) {
                    <cp-post-reading-time [seconds]="main.post.readingTimeSeconds!" />
                  }
                  @if (
                    (canShowDate(main, main.post) || canShowReadingTime(main.post)) &&
                    (canShowAuthor(main, main.post) || canShowViews(main.post))
                  ) {
                    <span class="text-gray-300">•</span>
                  }
                  @if (canShowAuthor(main, main.post) && displayAuthor(main.post); as authorName) {
                    <span class="font-medium truncate">{{ authorName }}</span>
                  }
                  @if (canShowAuthor(main, main.post) && canShowViews(main.post)) {
                    <span class="text-gray-300">•</span>
                  }
                  @if (canShowViews(main.post)) {
                    <cp-post-view-count [count]="main.post.viewCount!" />
                  }
                </div>
              }
            </article>
          }

          @if (smallItems(col).length > 0) {
            <div class="mt-3 pt-3 border-t border-gray-400">
              @for (item of smallItems(col); track item.post.id) {
                <article class="group flex gap-2 py-3 border-b border-gray-400 last:border-0">
                  <div class="flex-1 min-w-0">
                    <h4
                      class="leading-tight text-secondary"
                      style="font-size: var(--sidebar-title-font-size, 14px); font-weight: var(--sidebar-title-font-weight, 600); color: var(--sidebar-title-color, currentColor);"
                    >
                      <a
                        [routerLink]="'/' + item.post.slug"
                        class="hover:text-primary transition-colors"
                      >
                        {{ item.post.title }}
                      </a>
                    </h4>
                    @if (canShowMeta(item, item.post)) {
                      <div
                        class="flex items-center gap-1 mt-1 text-gray-500 min-w-0"
                        style="font-size: var(--module-meta-font-size, 11px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
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
                          <span class="truncate">{{ authorName }}</span>
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
                  @if (hasModuleMedia(item.post)) {
                    <div class="relative w-[90px] h-[60px] overflow-hidden bg-muted flex-shrink-0">
                      <cp-post-module-media [post]="item.post" playMode="overlay" playButton="sm">
                        <cp-post-image-pills [pills]="item.post.pills" size="sm" />
                      </cp-post-module-media>
                    </div>
                  }
                </article>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class ModuleCategoryColumnsComponent {
  private siteSettings = inject(SiteSettingsService);
  readonly hasModuleMedia = hasModuleMedia;

  @Input() columns: ResolvedCategoryColumn[] = [];
  /** Small articles under the main one (1–5). */
  @Input() smallCount = 3;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;
  @Input() showBumbi = false;

  get visibleColumns(): ResolvedCategoryColumn[] {
    return this.columns.filter((col) => col.posts.length > 0);
  }

  get columnCount(): number {
    const n = this.visibleColumns.length;
    if (n <= 3) return 3;
    if (n >= 5) return 5;
    return 4;
  }

  columnCategoryColor(col: ResolvedCategoryColumn): string | null {
    return normalizeCategoryColor(col.category?.color) ?? null;
  }

  mainItem(col: ResolvedCategoryColumn): ResolvedModulePost | null {
    return col.posts[0] ?? null;
  }

  smallItems(col: ResolvedCategoryColumn): ResolvedModulePost[] {
    const n = Math.max(1, Math.min(5, this.smallCount || 3));
    return col.posts.slice(1, 1 + n);
  }

  displayAuthor(post: PostSummary): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(item: ResolvedModulePost, post: PostSummary): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(item: ResolvedModulePost, post: PostSummary): boolean {
    return item.showAuthor && post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: PostSummary): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(post: PostSummary): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowMeta(item: ResolvedModulePost, post: PostSummary): boolean {
    return (
      this.canShowAuthor(item, post) ||
      this.canShowDate(item, post) ||
      this.canShowReadingTime(post) ||
      this.canShowViews(post)
    );
  }

  formatDate(value: string | null | undefined): string {
    return this.siteSettings.formatPostDate(value, this.dateFormat);
  }
}
