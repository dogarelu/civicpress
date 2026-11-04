import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CategoryLabelComponent } from '../category-label.component';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import {
  hasModuleMedia,
  type PostSummary,
  type ResolvedModule,
  type PostDateFormat,
} from '@civicpress/shared';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostModuleMediaComponent } from '../post-module-media.component';

/** Module: one full-width hero with overlay text + three secondary items in a row below. */
@Component({
  selector: 'cp-module-hero-top-list',
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
    @if (mainItem; as item) {
      @let post = item.post;
      <article class="group">
        <div class="relative overflow-hidden bg-muted aspect-[16/9] rounded-sm">
          <cp-post-module-media
            [post]="post"
            playMode="inline"
            [eager]="true"
            (playingChange)="heroPlaying = $event"
          >
            <cp-post-image-pills [pills]="post.pills" size="lg" />
          </cp-post-module-media>
          @if (!heroPlaying) {
            <a
              [routerLink]="'/' + post.slug"
              class="absolute inset-x-0 bottom-0 z-20 p-4 md:p-6 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent"
            >
              <h2
                class="font-heading leading-tight text-white"
                style="font-size: var(--hero-title-font-size, 28px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
              >
                {{ post.title }}
              </h2>
              <cp-post-subtitle
                [show]="showSummary"
                [showBumbi]="showBumbi"
                [bulbi]="post.bulbi ?? []"
                [excerpt]="post.excerpt"
                variant="hero"
                listClass="mt-2 text-white/85"
                textClass="mt-2 text-white/85"
              />
              @if (canShowMeta(item, post)) {
                <div
                  class="flex items-center justify-between gap-2 mt-2 text-white/90"
                  style="font-size: var(--hero-meta-font-size, var(--module-meta-font-size, 14px)); font-weight: var(--hero-meta-font-weight, var(--module-meta-font-weight, 400)); color: var(--hero-meta-color, var(--module-meta-color, currentColor));"
                >
                  <div class="flex items-center gap-1.5 min-w-0">
                    @if (canShowDate(item, post)) {
                      <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                    }
                    @if (canShowDate(item, post) && canShowReadingTime(post)) {
                      <span class="text-white/60">•</span>
                    }
                    @if (canShowReadingTime(post)) {
                      <cp-post-reading-time [seconds]="post.readingTimeSeconds!" />
                    }
                    @if (
                      (canShowDate(item, post) || canShowReadingTime(post)) &&
                      (canShowAuthor(item, post) || canShowViews(post))
                    ) {
                      <span class="text-white/60">•</span>
                    }
                    @if (canShowAuthor(item, post) && displayAuthor(post); as authorName) {
                      <span class="font-medium">{{ authorName }}</span>
                    }
                    @if (canShowAuthor(item, post) && canShowViews(post)) {
                      <span class="text-white/60">•</span>
                    }
                    @if (canShowViews(post)) {
                      <cp-post-view-count [count]="post.viewCount!" />
                    }
                  </div>
                  @if (canShowCategory(post)) {
                    <cp-category-label
                      variant="hero"
                      [onImage]="true"
                      [name]="post.primaryCategory!.name"
                      [slug]="post.primaryCategory!.slug"
                      extraClass="shrink-0"
                    />
                  }
                </div>
              }
            </a>
          }
        </div>
      </article>
    }

    @if (secondaryItems.length > 0) {
      <div class="cp-stack-rule" aria-hidden="true"></div>
      <div
        class="grid grid-cols-1 gap-px bg-gray-400"
        [class.md:grid-cols-1]="secondaryItems.length === 1"
        [class.md:grid-cols-2]="secondaryItems.length === 2"
        [class.md:grid-cols-3]="secondaryItems.length >= 3"
      >
        @for (item of secondaryItems; track item.post.id) {
          @let post = item.post;
          <article class="group bg-background px-4 pt-3 pb-3">
            @if (hasModuleMedia(post)) {
              <div class="relative overflow-hidden bg-muted aspect-[16/9]">
                <cp-post-module-media [post]="post" playMode="inline">
                  <cp-post-image-pills [pills]="post.pills" />
                </cp-post-module-media>
              </div>
            }
            <div class="pt-3">
              <h3
                class="font-heading leading-tight text-secondary"
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
                listClass="text-gray-600 mt-2"
                textClass="text-gray-600 mt-2"
              />
              @if (canShowMeta(item, post)) {
                <div
                  class="flex items-center justify-between gap-2 mt-2 text-gray-500"
                  style="font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);"
                >
                  <div class="flex items-center gap-1.5 min-w-0">
                    @if (canShowDate(item, post)) {
                      <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                    }
                    @if (canShowDate(item, post) && canShowReadingTime(post)) {
                      <span class="text-gray-300">•</span>
                    }
                    @if (canShowReadingTime(post)) {
                      <cp-post-reading-time [seconds]="post.readingTimeSeconds!" />
                    }
                    @if (
                      (canShowDate(item, post) || canShowReadingTime(post)) &&
                      (canShowAuthor(item, post) || canShowViews(post))
                    ) {
                      <span class="text-gray-300">•</span>
                    }
                    @if (canShowAuthor(item, post) && displayAuthor(post); as authorName) {
                      <span class="font-medium">{{ authorName }}</span>
                    }
                    @if (canShowAuthor(item, post) && canShowViews(post)) {
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
      </div>
    }
  `,
})
export class ModuleHeroTopListComponent {
  private siteSettings = inject(SiteSettingsService);
  readonly hasModuleMedia = hasModuleMedia;
  heroPlaying = false;

  @Input() items: ResolvedModule['posts'] = [];
  /** Number of secondary cards below the hero (1–3). */
  @Input() sideCount = 3;
  /** Show the primary category label on the meta row (beside the date). */
  @Input() showCategory = true;
  /** Show excerpt text on the hero overlay and secondary cards. */
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  get mainItem(): ResolvedModule['posts'][number] | null {
    return this.items[0] ?? null;
  }

  get secondaryItems(): ResolvedModule['posts'] {
    const n = Math.max(1, Math.min(3, this.sideCount || 3));
    return this.items.slice(1, 1 + n);
  }

  displayAuthor(post: PostSummary): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(item: ResolvedModule['posts'][number], post: PostSummary): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(item: ResolvedModule['posts'][number], post: PostSummary): boolean {
    return item.showAuthor && post.showAuthor !== false && !!this.displayAuthor(post);
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

  canShowMeta(item: ResolvedModule['posts'][number], post: PostSummary): boolean {
    return (
      this.canShowAuthor(item, post) ||
      this.canShowDate(item, post) ||
      this.canShowReadingTime(post) ||
      this.canShowViews(post) ||
      this.canShowCategory(post)
    );
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
