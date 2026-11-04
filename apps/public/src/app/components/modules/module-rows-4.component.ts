import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  hasModuleMedia,
  normalizeCategoryColor,
  type PostDateFormat,
  type ResolvedRows4Row,
} from '@civicpress/shared';
import { CategoryLabelComponent } from '../category-label.component';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { PostModuleMediaComponent } from '../post-module-media.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import { groupRowsByHeader } from './rows-module-groups';

/** Module: one or more rows of four articles (category or custom). */
@Component({
  selector: 'cp-module-rows-4',
  standalone: true,
  imports: [
    RouterModule,
    CategoryLabelComponent,
    PostImagePillsComponent,
    PostSubtitleComponent,
    PostViewCountComponent,
    PostReadingTimeComponent,
    PostModuleMediaComponent,
  ],
  template: `
    <div>
      @for (group of rowGroups; track group.key; let last = $last) {
        <section>
          @if (showGroupHeader(group.header)) {
            <div class="flex items-center justify-between mb-3">
              @if (group.header.title) {
                <h2
                  class="font-heading uppercase tracking-wide relative"
                  [class.cp-module-section-title--cat-pill]="!!rowCategoryColor(group.header)"
                  [style.--category-color]="rowCategoryColor(group.header)"
                  style="font-size: var(--row-header-font-size, var(--news-title-font-size, 18px)); font-weight: var(--row-header-font-weight, var(--news-title-font-weight, 800)); color: var(--row-header-color, var(--news-title-color, currentColor));"
                >
                  <span class="cp-module-section-title-text">{{ group.header.title }}</span>
                  <span class="cp-module-section-title-rule" aria-hidden="true"></span>
                </h2>
              }
              @if (group.header.category) {
                <a
                  [routerLink]="['/category', group.header.category.slug]"
                  class="text-xs text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-wide"
                  [class.ml-auto]="!group.header.title"
                >
                  Mai mult »
                </a>
              }
            </div>
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-400 md:-mx-4">
            @for (item of group.posts; track item.post.id) {
              <article class="group flex flex-col h-full bg-background px-4 pt-3 pb-3">
                @if (hasModuleMedia(item.post)) {
                  <div class="relative overflow-hidden bg-muted aspect-[16/9]">
                    <cp-post-module-media [post]="item.post" playMode="inline">
                      <cp-post-image-pills [pills]="item.post.pills" />
                    </cp-post-module-media>
                  </div>
                }
                <div class="pt-3 flex flex-col flex-1">
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
                  @if (canShowMeta(group.header, item, item.post)) {
                    <div
                      class="flex items-center justify-between gap-2 mt-auto pt-2 text-gray-500"
                      style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                    >
                      <div class="flex items-center gap-1.5 min-w-0">
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
                      @if (canShowCategory(group.header, item.post)) {
                        <cp-category-label
                          [name]="item.post.primaryCategory!.name"
                          [slug]="item.post.primaryCategory!.slug"
                          extraClass="shrink-0"
                        />
                      }
                    </div>
                  }
                </div>
              </article>
            }
          </div>
        </section>
        @if (!last) {
          <div class="cp-stack-rule" aria-hidden="true"></div>
        }
      }
    </div>
  `,
})
export class ModuleRows4Component {
  private siteSettings = inject(SiteSettingsService);
  readonly hasModuleMedia = hasModuleMedia;

  @Input() rows: ResolvedRows4Row[] = [];
  @Input() showCategory = false;
  /** Show excerpt text under titles. */
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  get rowGroups() {
    return groupRowsByHeader(this.rows, 4);
  }

  showGroupHeader(row: ResolvedRows4Row): boolean {
    return !!row.title || !!row.category;
  }

  rowCategoryColor(row: ResolvedRows4Row): string | null {
    return normalizeCategoryColor(row.category?.color) ?? null;
  }

  displayAuthor(post: ResolvedRows4Row['posts'][number]['post']): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(
    item: ResolvedRows4Row['posts'][number],
    post: ResolvedRows4Row['posts'][number]['post'],
  ): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(
    item: ResolvedRows4Row['posts'][number],
    post: ResolvedRows4Row['posts'][number]['post'],
  ): boolean {
    return item.showAuthor && post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: ResolvedRows4Row['posts'][number]['post']): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(post: ResolvedRows4Row['posts'][number]['post']): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowCategory(row: ResolvedRows4Row, post: ResolvedRows4Row['posts'][number]['post']): boolean {
    if (row.category) return false;
    return this.showCategory && !!post.primaryCategory;
  }

  canShowMeta(
    row: ResolvedRows4Row,
    item: ResolvedRows4Row['posts'][number],
    post: ResolvedRows4Row['posts'][number]['post'],
  ): boolean {
    return (
      this.canShowAuthor(item, post) ||
      this.canShowDate(item, post) ||
      this.canShowReadingTime(post) ||
      this.canShowViews(post) ||
      this.canShowCategory(row, post)
    );
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
