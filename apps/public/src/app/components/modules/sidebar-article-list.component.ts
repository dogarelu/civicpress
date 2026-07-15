import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import type { LayoutDisplaySlot, PostSummary } from '@civicpress/shared';
import { cleanExcerptText } from '@civicpress/shared';
import { PostImagePillComponent } from '../post-image-pill.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import { formatPostDateForList } from '../../utils/post-date-display';

/** Sidebar block: vertical list of article cards styled like rows-3/4 modules. */
@Component({
  selector: 'cp-sidebar-article-list',
  standalone: true,
  imports: [RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    @if (normalizedItems.length > 0) {
      <div class="space-y-4">
        @if (title.trim().length > 0) {
          <header class="px-3 py-2 bg-gray-100 border border-border rounded-sm">
            <span class="text-gray-800 text-xs font-bold uppercase tracking-wider">{{
              title
            }}</span>
          </header>
        }
        @for (item of normalizedItems; track item.post.id) {
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
                <a [routerLink]="'/' + item.post.slug" class="hover:text-primary transition-colors">
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
                  class="flex items-center gap-1.5 mt-auto pt-2 text-gray-500"
                  style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                >
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
                  @if (canShowAuthor(item, item.post) && displayAuthor(item.post); as authorName) {
                    <span class="font-medium">{{ authorName }}</span>
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
          </article>
        }
      </div>
    }
  `,
})
export class SidebarArticleListComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() posts: PostSummary[] = [];
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  @Input() title = '';
  @Input() showSummary = true;

  get normalizedItems(): Array<{ post: PostSummary; showDate: boolean; showAuthor: boolean }> {
    return this.posts.map((post, index) => ({
      post,
      showDate: this.displaySlots[index]?.showDate ?? true,
      showAuthor: this.displaySlots[index]?.showAuthor ?? true,
    }));
  }

  cleanExcerpt(post: PostSummary): string {
    return cleanExcerptText(post.excerpt);
  }

  displayAuthor(post: PostSummary): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(item: { showDate: boolean }, post: PostSummary): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(item: { showAuthor: boolean }, post: PostSummary): boolean {
    return item.showAuthor && post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: PostSummary): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowMeta(item: { showDate: boolean; showAuthor: boolean }, post: PostSummary): boolean {
    return (
      this.canShowAuthor(item, post) || this.canShowDate(item, post) || this.canShowViews(post)
    );
  }

  formatDate(dateStr: string): string {
    return formatPostDateForList(dateStr);
  }
}
