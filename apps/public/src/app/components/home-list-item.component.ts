import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { ModuleTypography, PostDateFormat, PostSummary } from '@civicpress/shared';
import { buildModuleTypographyCss, hasModuleMedia } from '@civicpress/shared';
import { CategoryLabelComponent } from './category-label.component';
import { PostImagePillsComponent } from './post-image-pills.component';
import { PostSubtitleComponent } from './post-subtitle.component';
import { PostViewCountComponent } from './post-view-count.component';
import { PostReadingTimeComponent } from './post-reading-time.component';
import { PostModuleMediaComponent } from './post-module-media.component';
import { SiteSettingsService } from '../services/site-settings.service';

@Component({
  selector: 'cp-home-list-item',
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
    @if (post) {
      <article
        class="flex gap-3 py-4 group md:flex-row"
        [class.flex-row-reverse]="imageSide === 'right'"
        [class.flex-row]="imageSide === 'left'"
        [class.md:gap-5]="imageSize === 'wide'"
        [class.md:gap-4]="imageSize !== 'wide'"
        [attr.style]="typographyStyle()"
      >
        @if (hasModuleMedia(post)) {
          <div
            class="shrink-0 self-start"
            [class]="imageSize === 'wide' ? 'w-[140px] md:w-[240px]' : 'w-[120px]'"
          >
            <div class="relative w-full aspect-[16/9] overflow-hidden bg-muted rounded-sm">
              <cp-post-module-media [post]="post" playMode="inline" playButton="sm">
                <cp-post-image-pills [pills]="post.pills" size="sm" />
              </cp-post-module-media>
            </div>
          </div>
        }
        <div class="flex-1 min-w-0 flex flex-col">
          <h3
            class="font-heading leading-snug text-secondary"
            style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
          >
            <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
              {{ post.title }}
            </a>
          </h3>
          <cp-post-subtitle
            [show]="showSummary"
            [showBumbi]="showBumbi"
            [bulbi]="post.bulbi ?? []"
            [excerpt]="post.excerpt"
            listClass="mt-2 leading-snug text-gray-700"
            textClass="mt-2 leading-relaxed text-gray-700"
          />
          @if (canShowMeta(post)) {
            <div
              class="flex items-center justify-between gap-2 mt-auto pt-2 text-gray-500"
              style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                @if (canShowAuthor(post) && displayAuthor(post); as authorName) {
                  <span>{{ authorName }}</span>
                }
                @if (
                  canShowAuthor(post) &&
                  (canShowDate(post) || canShowReadingTime(post) || canShowViews(post))
                ) {
                  <span class="text-gray-300">•</span>
                }
                @if (canShowDate(post)) {
                  <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                }
                @if (canShowDate(post) && canShowReadingTime(post)) {
                  <span class="text-gray-300">•</span>
                }
                @if (canShowReadingTime(post)) {
                  <cp-post-reading-time [seconds]="post.readingTimeSeconds!" />
                }
                @if ((canShowDate(post) || canShowReadingTime(post)) && canShowViews(post)) {
                  <span class="text-gray-300">•</span>
                }
                @if (canShowViews(post)) {
                  <cp-post-view-count [count]="post.viewCount!" />
                }
              </div>
              @if (canShowCategory(post)) {
                <cp-category-label
                  [name]="post.primaryCategory!.name"
                  [slug]="post.primaryCategory!.slug"
                  extraClass="shrink-0"
                />
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
  readonly hasModuleMedia = hasModuleMedia;

  @Input() post: PostSummary | null = null;
  @Input() showDate = true;
  @Input() showAuthor = true;
  /** Show the primary category label on the meta row (beside the date). */
  @Input() showCategory = true;
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() typography: ModuleTypography | null = null;
  /** Per-module date format override. Null = inherit site setting. */
  @Input() dateFormat: PostDateFormat | null = null;
  /** When true, show reading time next to the date. */
  @Input() showReadingTime = false;
  /** compact = 120 wide; wide = 240 wide on desktop (list module). Always 16:9 landscape. */
  @Input() imageSize: 'compact' | 'wide' = 'compact';
  /**
   * Image side on mobile. `right` = title left / photo right (default).
   * `left` = photo left / title right. Desktop (`md+`) always uses image left.
   */
  @Input() imageSide: 'left' | 'right' = 'right';

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

  canShowReadingTime(post: PostSummary): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowCategory(post: PostSummary): boolean {
    return this.showCategory && !!post.primaryCategory;
  }

  canShowMeta(post: PostSummary): boolean {
    return (
      this.canShowAuthor(post) ||
      this.canShowDate(post) ||
      this.canShowReadingTime(post) ||
      this.canShowViews(post) ||
      this.canShowCategory(post)
    );
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
