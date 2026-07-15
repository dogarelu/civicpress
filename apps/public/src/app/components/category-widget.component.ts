import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { CategoryStrip, LayoutDisplaySlot } from '@civicpress/shared';
import { cleanExcerptText } from '@civicpress/shared';
import { PostImagePillComponent } from './post-image-pill.component';
import { PostViewCountComponent } from './post-view-count.component';
import { SiteSettingsService } from '../services/site-settings.service';
import { formatPostDateForList } from '../utils/post-date-display';

@Component({
  selector: 'cp-category-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    @if (strip) {
      <aside class="bg-white border border-border rounded-sm shadow-sm overflow-hidden">
        <header
          class="px-3 py-2 flex items-center justify-between bg-gray-100 border-b border-border"
        >
          <a
            [routerLink]="['/category', strip.category.slug]"
            class="text-gray-800 text-xs font-bold uppercase tracking-wider hover:text-gray-900 transition-colors"
            >{{ strip.category.name }}</a
          >
          <a
            [routerLink]="['/category', strip.category.slug]"
            class="text-gray-500 text-[10px] hover:text-gray-700 transition-colors uppercase tracking-wide"
            >Mai mult »</a
          >
        </header>
        <ul class="divide-y divide-border">
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
                    @if (canShowMeta(i, post)) {
                      <div class="text-[10px] text-gray-400 mt-1">
                        @if (canShowDate(i, post)) {
                          <time [dateTime]="post.publishedAt">{{
                            formatDate(post.publishedAt)
                          }}</time>
                        }
                        @if (
                          canShowDate(i, post) && (canShowAuthor(i, post) || canShowViews(post))
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
                        <cp-post-image-pill [pill]="post.pill" size="sm" />
                      </div>
                    </a>
                  }
                </div>
                @if (showSummary && post.excerpt) {
                  <p
                    class="mt-1 news-summary-clamp text-gray-600"
                    style="font-size: var(--news-summary-font-size, 12px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
                  >
                    {{ cleanExcerpt(post) }}
                  </p>
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

  cleanExcerpt(post: CategoryStrip['posts'][number]): string {
    return cleanExcerptText(post.excerpt);
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

  canShowMeta(index: number, post: CategoryStrip['posts'][number]): boolean {
    return (
      this.canShowAuthor(index, post) || this.canShowDate(index, post) || this.canShowViews(post)
    );
  }

  slotShowDate(index: number): boolean {
    return this.displaySlots[index]?.showDate ?? true;
  }

  slotShowAuthor(index: number): boolean {
    return this.displaySlots[index]?.showAuthor ?? true;
  }

  formatDate(dateStr: string): string {
    return formatPostDateForList(dateStr);
  }
}
