import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { hasModuleMedia, type PostDateFormat, type PostSummary } from '@civicpress/shared';
import { CategoryLabelComponent } from './category-label.component';
import { PostImagePillsComponent } from './post-image-pills.component';
import { PostSubtitleComponent } from './post-subtitle.component';
import { PostViewCountComponent } from './post-view-count.component';
import { PostReadingTimeComponent } from './post-reading-time.component';
import { PostModuleMediaComponent } from './post-module-media.component';
import { SiteSettingsService } from '../services/site-settings.service';

@Component({
  selector: 'cp-recomandare-hero',
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
      <article class="group">
        <div class="mt-3 px-1">
          <h2
            class="font-heading leading-tight text-secondary"
            style="font-size: var(--hero-title-font-size, 28px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
          >
            <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
              {{ post.title }}
            </a>
          </h2>
        </div>
        @if (hasModuleMedia(post)) {
          <div
            class="relative w-full overflow-hidden bg-muted aspect-[16/9] max-h-[440px] rounded-sm shadow-sm group-hover:shadow-lg transition-shadow duration-300"
          >
            <cp-post-module-media [post]="post" playMode="inline" [eager]="true">
              <cp-post-image-pills [pills]="post.pills" size="lg" />
            </cp-post-module-media>
          </div>
        }
        <div class="mt-3 px-1">
          @if (canShowMeta(post)) {
            <div
              class="flex items-center justify-between gap-2 mt-3 text-gray-500"
              style="font-size: var(--hero-meta-font-size, var(--module-meta-font-size, 12px)); font-weight: var(--hero-meta-font-weight, var(--module-meta-font-weight, 400)); color: var(--hero-meta-color, var(--module-meta-color, currentColor));"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                @if (canShowDate(post)) {
                  <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                }
                @if (canShowDate(post) && canShowReadingTime(post)) {
                  <span class="text-gray-300">•</span>
                }
                @if (canShowReadingTime(post)) {
                  <cp-post-reading-time [seconds]="post.readingTimeSeconds!" />
                }
                @if (
                  (canShowDate(post) || canShowReadingTime(post)) &&
                  (canShowAuthor(post) || canShowViews(post))
                ) {
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
              @if (canShowCategory(post)) {
                <cp-category-label
                  variant="hero"
                  [name]="post.primaryCategory!.name"
                  [slug]="post.primaryCategory!.slug"
                  extraClass="shrink-0"
                />
              }
            </div>
          }
          <cp-post-subtitle
            [show]="showSummary"
            [showBumbi]="showBumbi"
            [bulbi]="post.bulbi ?? []"
            [excerpt]="post.excerpt"
            variant="hero"
            listClass="text-gray-600 mt-2"
            textClass="text-gray-600 mt-2"
          />
        </div>
      </article>
    }
  `,
})
export class RecomandareHeroComponent {
  private siteSettings = inject(SiteSettingsService);
  readonly hasModuleMedia = hasModuleMedia;

  @Input() post: PostSummary | null = null;
  @Input() showDate = true;
  @Input() showAuthor = true;
  /** Show the primary category label on the meta row (beside the date). */
  @Input() showCategory = true;
  /** Show the excerpt text under the image. */
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  /** Per-module date format override. Null = inherit site setting. */
  @Input() dateFormat: PostDateFormat | null = null;
  /** When true, show reading time next to the date. */
  @Input() showReadingTime = false;

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
