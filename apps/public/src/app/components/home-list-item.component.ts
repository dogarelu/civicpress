import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { ModuleTypography, PostSummary } from '@civicpress/shared';
import { buildModuleTypographyCss, cleanExcerptText } from '@civicpress/shared';
import { PostImagePillComponent } from './post-image-pill.component';
import { PostViewCountComponent } from './post-view-count.component';
import { SiteSettingsService } from '../services/site-settings.service';
import { formatPostDateForList } from '../utils/post-date-display';

@Component({
  selector: 'cp-home-list-item',
  standalone: true,
  imports: [CommonModule, RouterModule, PostImagePillComponent, PostViewCountComponent],
  template: `
    @if (post) {
      <article
        class="flow-root py-4 group md:flex"
        [class.md:gap-5]="imageSize === 'wide'"
        [class.md:gap-4]="imageSize !== 'wide'"
        [attr.style]="typographyStyle()"
      >
        @if (post.heroImage) {
          <a
            [routerLink]="'/' + post.slug"
            class="float-right ml-3 mb-2 md:float-none md:ml-0 md:mb-0 md:flex-shrink-0"
          >
            <div
              class="relative overflow-hidden bg-muted rounded-sm"
              [class]="
                imageSize === 'wide'
                  ? 'w-[140px] h-[93px] md:w-[240px] md:h-[160px]'
                  : 'w-[120px] h-[80px] md:w-[120px] md:h-[80px]'
              "
            >
              <img
                [src]="post.heroImage.url"
                [alt]="post.heroImage.alt ?? post.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
                [attr.width]="imageSize === 'wide' ? 240 : 120"
                [attr.height]="imageSize === 'wide' ? 160 : 80"
              />
              <cp-post-image-pill [pill]="post.pill" size="sm" />
            </div>
          </a>
        }
        <div class="flex-1 min-w-0">
          @if (showCategory && post.primaryCategory) {
            <a
              [routerLink]="['/category', post.primaryCategory.slug]"
              class="uppercase tracking-wider mb-1 inline-block text-gray-600 hover:text-gray-800 transition-colors"
              style="font-size: var(--module-category-font-size, 12px); font-weight: var(--module-category-font-weight, 700); color: var(--module-category-color, currentColor);"
              >{{ post.primaryCategory.name }}</a
            >
          }
          <h3
            class="font-heading leading-snug text-secondary line-clamp-none md:line-clamp-2"
            style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
          >
            <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
              {{ post.title }}
            </a>
          </h3>
          @if (showSummary && post.excerpt) {
            <p
              class="mt-2 leading-relaxed text-gray-700 news-summary-clamp"
              style="font-size: var(--news-summary-font-size, 14px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
            >
              {{ cleanExcerpt(post) }}
            </p>
          }
          @if (canShowMeta(post)) {
            <div
              class="flex items-center gap-1.5 mt-1 text-gray-500"
              style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
            >
              @if (canShowAuthor(post) && displayAuthor(post); as authorName) {
                <span>{{ authorName }}</span>
              }
              @if (canShowAuthor(post) && (canShowDate(post) || canShowViews(post))) {
                <span class="text-gray-300">•</span>
              }
              @if (canShowDate(post)) {
                <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
              }
              @if (canShowDate(post) && canShowViews(post)) {
                <span class="text-gray-300">•</span>
              }
              @if (canShowViews(post)) {
                <cp-post-view-count [count]="post.viewCount!" />
              }
            </div>
          }
        </div>
      </article>
    }
  `,
})
export class HomeListItemComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() post: PostSummary | null = null;
  @Input() showDate = true;
  @Input() showAuthor = true;
  /** Show the primary category label above the title. */
  @Input() showCategory = true;
  @Input() showSummary = true;
  @Input() typography: ModuleTypography | null = null;
  /** compact = 120×80; wide = 240×160 on desktop (list module). */
  @Input() imageSize: 'compact' | 'wide' = 'compact';

  typographyStyle(): string | null {
    return buildModuleTypographyCss(this.typography);
  }

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
