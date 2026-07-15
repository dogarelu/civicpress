import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import type { ResolvedRows3Row } from '@civicpress/shared';
import { cleanExcerptText } from '@civicpress/shared';
import { PostImagePillComponent } from '../post-image-pill.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import { formatPostDateForList } from '../../utils/post-date-display';

/** Module: one or more rows of three articles (category or custom). */
@Component({
  selector: 'cp-module-rows-3',
  standalone: true,
  imports: [RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    <div class="space-y-8">
      @for (row of rows; track row.id) {
        @if (row.posts.length > 0) {
          <section>
            @if (row.title || row.category) {
              <div class="flex items-center justify-between mb-3">
                @if (row.title) {
                  <h2
                    class="font-heading uppercase tracking-wide relative"
                    style="font-size: var(--row-header-font-size, var(--news-title-font-size, 18px)); font-weight: var(--row-header-font-weight, var(--news-title-font-weight, 800)); color: var(--row-header-color, var(--news-title-color, currentColor));"
                  >
                    <span class="relative z-10 pr-3 bg-background text-gray-800">{{
                      row.title
                    }}</span>
                    <span class="absolute bottom-0 left-0 w-full h-[3px] bg-gray-300"></span>
                  </h2>
                }
                @if (row.category) {
                  <a
                    [routerLink]="['/category', row.category.slug]"
                    class="text-xs text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-wide"
                    [class.ml-auto]="!row.title"
                  >
                    Mai mult »
                  </a>
                }
              </div>
            }

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (item of row.posts; track item.post.id) {
                <article
                  class="group flex flex-col h-full bg-white border border-border rounded-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  <a [routerLink]="'/' + item.post.slug" class="block">
                    @if (item.post.heroImage) {
                      <div class="relative overflow-hidden bg-muted aspect-[16/9]">
                        <img
                          [src]="item.post.heroImage.url"
                          [alt]="item.post.heroImage.alt ?? item.post.title"
                          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          width="400"
                          height="225"
                        />
                        <cp-post-image-pill [pill]="item.post.pill" />
                      </div>
                    }
                  </a>
                  <div class="p-3 flex flex-col flex-1">
                    <h3
                      class="font-heading leading-tight text-secondary line-clamp-3"
                      style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
                    >
                      <a
                        [routerLink]="'/' + item.post.slug"
                        class="hover:text-primary transition-colors"
                      >
                        {{ item.post.title }}
                      </a>
                    </h3>
                    @if (showSummary && item.post.excerpt) {
                      <p
                        class="text-gray-600 mt-2 news-summary-clamp"
                        style="font-size: var(--news-summary-font-size, 14px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
                      >
                        {{ cleanExcerpt(item.post) }}
                      </p>
                    }
                    @if (canShowMeta(item, item.post)) {
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
                          @if (
                            canShowDate(item, item.post) &&
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
                        @if (canShowCategory(item.post)) {
                          <a
                            [routerLink]="['/category', item.post.primaryCategory!.slug]"
                            class="shrink-0 uppercase tracking-wide text-gray-500 hover:text-gray-700 transition-colors"
                            style="font-size: var(--module-category-font-size, 12px); font-weight: var(--module-category-font-weight, 400); color: var(--module-category-color, currentColor);"
                          >
                            {{ item.post.primaryCategory!.name }}
                          </a>
                        }
                      </div>
                    }
                  </div>
                </article>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
})
export class ModuleRows3Component {
  private siteSettings = inject(SiteSettingsService);

  @Input() rows: ResolvedRows3Row[] = [];
  @Input() showCategory = false;
  /** Show excerpt text under card titles. */
  @Input() showSummary = true;

  cleanExcerpt(post: ResolvedRows3Row['posts'][number]['post']): string {
    return cleanExcerptText(post.excerpt);
  }

  displayAuthor(post: ResolvedRows3Row['posts'][number]['post']): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(
    item: ResolvedRows3Row['posts'][number],
    post: ResolvedRows3Row['posts'][number]['post'],
  ): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(
    item: ResolvedRows3Row['posts'][number],
    post: ResolvedRows3Row['posts'][number]['post'],
  ): boolean {
    return item.showAuthor && post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: ResolvedRows3Row['posts'][number]['post']): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowCategory(post: ResolvedRows3Row['posts'][number]['post']): boolean {
    return this.showCategory && !!post.primaryCategory;
  }

  canShowMeta(
    item: ResolvedRows3Row['posts'][number],
    post: ResolvedRows3Row['posts'][number]['post'],
  ): boolean {
    return (
      this.canShowAuthor(item, post) ||
      this.canShowDate(item, post) ||
      this.canShowViews(post) ||
      this.canShowCategory(post)
    );
  }

  formatDate(dateStr: string): string {
    return formatPostDateForList(dateStr);
  }
}
