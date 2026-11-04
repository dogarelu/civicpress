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

/** Module: four articles in a 2x2 square. */
@Component({
  selector: 'cp-module-grid',
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
    <div class="grid grid-cols-2 gap-px bg-gray-400 md:-mx-4">
      @for (item of items; track item.post.id) {
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
  `,
})
export class ModuleGridComponent {
  private siteSettings = inject(SiteSettingsService);
  readonly hasModuleMedia = hasModuleMedia;

  @Input() items: ResolvedModule['posts'] = [];
  /** Show each card's primary category label on the meta row (beside the date). */
  @Input() showCategory = true;
  /** Show excerpt text under titles. */
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  displayAuthor(post: ResolvedModule['posts'][number]['post']): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(
    item: ResolvedModule['posts'][number],
    post: ResolvedModule['posts'][number]['post'],
  ): boolean {
    return item.showDate && post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(
    item: ResolvedModule['posts'][number],
    post: ResolvedModule['posts'][number]['post'],
  ): boolean {
    return item.showAuthor && post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: ResolvedModule['posts'][number]['post']): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(post: ResolvedModule['posts'][number]['post']): boolean {
    return this.showReadingTime && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowCategory(post: ResolvedModule['posts'][number]['post']): boolean {
    return this.showCategory && !!post.primaryCategory;
  }

  canShowMeta(
    item: ResolvedModule['posts'][number],
    post: ResolvedModule['posts'][number]['post'],
  ): boolean {
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
