import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PostSummary } from '@civicpress/shared';
import { cleanExcerptText } from '@civicpress/shared';
import { PostImagePillComponent } from './post-image-pill.component';
import { PostViewCountComponent } from './post-view-count.component';
import { SiteSettingsService } from '../services/site-settings.service';
import { formatPostDateForList } from '../utils/post-date-display';

@Component({
  selector: 'cp-recomandare-hero',
  standalone: true,
  imports: [CommonModule, RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    @if (post) {
      <article class="group">
        <div class="mt-3 px-1">
          @if (showCategory && post.primaryCategory) {
            <a
              [routerLink]="['/category', post.primaryCategory.slug]"
              class="uppercase tracking-wider mb-2 inline-block px-2 py-0.5 rounded-sm text-gray-700 bg-gray-100 transition-colors hover:text-gray-900"
              style="font-size: var(--module-category-font-size, 14px); font-weight: var(--module-category-font-weight, 700); color: var(--module-category-color, currentColor);"
              >{{ post.primaryCategory.name }}</a
            >
          }
          <h2
            class="font-heading leading-tight text-secondary"
            style="font-size: var(--hero-title-font-size, 28px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
          >
            <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
              {{ post.title }}
            </a>
          </h2>
        </div>
        <a [routerLink]="'/' + post.slug" class="block w-full">
          @if (post.heroImage) {
            <div
              class="relative w-full overflow-hidden bg-muted aspect-[16/9] max-h-[440px] rounded-sm shadow-sm group-hover:shadow-lg transition-shadow duration-300"
            >
              <img
                [src]="post.heroImage.url"
                [alt]="post.heroImage.alt ?? post.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="eager"
                style="width: 100%; height: 100%; object-fit: cover;"
              />
              <cp-post-image-pill [pill]="post.pill" size="lg" />
            </div>
          }
        </a>
        <div class="mt-3 px-1">
          @if (canShowMeta(post)) {
            <div
              class="flex items-center gap-1.5 mt-3 text-gray-500"
              style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
            >
              @if (canShowDate(post)) {
                <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
              }
              @if (canShowDate(post) && (canShowAuthor(post) || canShowViews(post))) {
                <span class="text-gray-300">•</span>
              }
              @if (canShowAuthor(post) && displayAuthor(post); as authorName) {
                <span class="font-medium">{{ authorName }}</span>
              }
              @if (canShowAuthor(post) && canShowViews(post)) {
                <span class="text-gray-300">•</span>
              }
              @if (canShowViews(post)) {
                <cp-post-view-count [count]="post.viewCount!" />
              }
            </div>
          }
          @if (showSummary && post.excerpt) {
            <p
              class="text-gray-600 mt-2 news-summary-clamp"
              style="font-size: var(--news-summary-font-size, 14px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
            >
              {{ cleanExcerpt(post) }}
            </p>
          }
        </div>
      </article>
    }
  `,
})
export class RecomandareHeroComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() post: PostSummary | null = null;
  @Input() showDate = true;
  @Input() showAuthor = true;
  /** Show the primary category label above the title. */
  @Input() showCategory = true;
  /** Show the excerpt text under the image. */
  @Input() showSummary = true;

  displayAuthor(post: PostSummary): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(post: PostSummary): boolean {
    return this.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(post: PostSummary): boolean {
    return this.showAuthor && post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: PostSummary): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowMeta(post: PostSummary): boolean {
    return this.canShowAuthor(post) || this.canShowDate(post) || this.canShowViews(post);
  }

  cleanExcerpt(post: PostSummary): string {
    return cleanExcerptText(post.excerpt);
  }

  formatDate(dateStr: string): string {
    return formatPostDateForList(dateStr);
  }
}
