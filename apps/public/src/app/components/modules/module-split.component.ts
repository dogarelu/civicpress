import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { hasModuleMedia, type PostDateFormat, type ResolvedModule } from '@civicpress/shared';
import { CategoryLabelComponent } from '../category-label.component';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { PostModuleMediaComponent } from '../post-module-media.component';
import { SiteSettingsService } from '../../services/site-settings.service';

/** Module: one article in a two-column split (media | title/meta). */
@Component({
  selector: 'cp-module-split',
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
  styles: [
    `
      @media (min-width: 768px) {
        .split-grid {
          grid-template-columns: 3fr 2fr;
        }
        .split-grid.split-grid-reverse {
          grid-template-columns: 2fr 3fr;
        }
      }
    `,
  ],
  template: `
    @if (item?.post; as post) {
      <article class="group">
        <div
          class="grid grid-cols-1 gap-6 md:gap-0 items-start"
          [class.split-grid]="hasModuleMedia(post)"
          [class.split-grid-reverse]="splitReverse"
        >
          @if (hasModuleMedia(post)) {
            <div
              class="block pb-4 border-b border-gray-400 md:pb-0 md:border-b-0"
              [class.md:order-2]="splitReverse"
              [class.md:pr-4]="!splitReverse"
              [class.md:pl-4]="splitReverse"
            >
              <div
                class="relative w-full overflow-hidden bg-muted aspect-[16/9] rounded-sm shadow-sm group-hover:shadow-lg transition-shadow duration-300"
              >
                <cp-post-module-media [post]="post" playMode="inline">
                  <cp-post-image-pills [pills]="post.pills" size="lg" />
                </cp-post-module-media>
              </div>
            </div>
          }
          <div
            [class.md:order-1]="splitReverse"
            [class.md:pl-4]="hasModuleMedia(post) && !splitReverse"
            [class.md:pr-4]="splitReverse"
            [class.pt-4]="hasModuleMedia(post)"
            [class.md:pt-0]="hasModuleMedia(post)"
          >
            @if (showCategory && post.primaryCategory; as cat) {
              <cp-category-label
                [name]="cat.name"
                [slug]="cat.slug"
                extraClass="mb-3 inline-block"
              />
            }
            @if (post.kicker) {
              <p
                class="italic mb-2"
                style="font-size: var(--article-kicker-font-size, 16px); font-weight: var(--article-kicker-font-weight, 400); color: var(--article-kicker-color, #4b5563);"
              >
                {{ post.kicker }}
              </p>
            }
            <h2
              class="font-heading leading-tight text-secondary mb-4"
              style="font-size: var(--hero-title-font-size, 28px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
            >
              <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
                {{ post.title }}
              </a>
            </h2>
            <cp-post-subtitle
              [show]="showSummary"
              [showBumbi]="showBumbi"
              [bulbi]="post.bulbi ?? []"
              [excerpt]="post.excerpt"
              variant="hero"
              listClass="text-gray-700 leading-snug mb-4"
              textClass="text-gray-700 leading-relaxed mb-4"
            />
            @if (canShowMeta()) {
              <div
                class="flex flex-wrap items-center gap-3 text-gray-500"
                style="font-size: var(--hero-meta-font-size, var(--module-meta-font-size, 12px)); font-weight: var(--hero-meta-font-weight, var(--module-meta-font-weight, 400)); color: var(--hero-meta-color, var(--module-meta-color, currentColor));"
              >
                @if (canShowAuthor() && displayAuthor(); as authorName) {
                  <span class="font-medium">{{ authorName }}</span>
                }
                @if (canShowAuthor() && (canShowDate() || canShowReadingTime() || canShowViews())) {
                  <span class="text-gray-300">·</span>
                }
                @if (canShowDate()) {
                  <time [dateTime]="post.publishedAt!">{{ formatDate(post.publishedAt!) }}</time>
                }
                @if (canShowDate() && canShowReadingTime()) {
                  <span class="text-gray-300">·</span>
                }
                @if (canShowReadingTime()) {
                  <cp-post-reading-time [seconds]="post.readingTimeSeconds!" />
                }
                @if ((canShowDate() || canShowReadingTime()) && canShowViews()) {
                  <span class="text-gray-300">·</span>
                }
                @if (canShowViews()) {
                  <cp-post-view-count [count]="post.viewCount!" />
                }
              </div>
            }
          </div>
        </div>
      </article>
    }
  `,
})
export class ModuleSplitComponent {
  private siteSettings = inject(SiteSettingsService);
  readonly hasModuleMedia = hasModuleMedia;

  @Input() item: ResolvedModule['posts'][number] | null = null;
  @Input() splitReverse = false;
  @Input() showCategory = true;
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  displayAuthor(): string | null {
    const post = this.item?.post;
    if (!post) return null;
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(): boolean {
    const post = this.item?.post;
    if (!post) return false;
    return (this.item?.showDate ?? true) && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(): boolean {
    return (
      (this.item?.showAuthor ?? true) &&
      this.item?.post?.showAuthor !== false &&
      !!this.displayAuthor()
    );
  }

  canShowViews(): boolean {
    const post = this.item?.post;
    return !!post && this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(): boolean {
    const post = this.item?.post;
    return !!post && this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowMeta(): boolean {
    return (
      this.canShowAuthor() || this.canShowDate() || this.canShowReadingTime() || this.canShowViews()
    );
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr, this.dateFormat);
  }
}
