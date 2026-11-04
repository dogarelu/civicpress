import { Component, Input, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterModule } from '@angular/router';
import type {
  MobileTextPosition,
  ResolvedMobileModule,
  ResolvedModulePost,
} from '@civicpress/shared';
import {
  buildModuleBackgroundCss,
  buildModuleTypographyCss,
  buildSummaryDisplayCss,
  combineInlineStyles,
  moduleTitleUsesCategoryPill,
  normalizeCategoryColor,
} from '@civicpress/shared';
import { CategoryLabelComponent } from '../category-label.component';
import { HomeListItemComponent } from '../home-list-item.component';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostViewCountComponent } from '../post-view-count.component';
import { PostReadingTimeComponent } from '../post-reading-time.component';
import { PostModuleMediaComponent } from '../post-module-media.component';
import { MobileModuleSlideshowComponent } from './mobile-module-slideshow.component';
import { SiteSettingsService } from '../../services/site-settings.service';

/**
 * Renders dedicated mobile modules when configured.
 * Falls back is handled by the parent (legacy mobile-ordered-layout).
 */
@Component({
  selector: 'cp-mobile-modules-layout',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    RouterModule,
    CategoryLabelComponent,
    HomeListItemComponent,
    PostImagePillsComponent,
    PostSubtitleComponent,
    PostViewCountComponent,
    PostReadingTimeComponent,
    PostModuleMediaComponent,
    MobileModuleSlideshowComponent,
  ],
  template: `
    <div>
      @for (mod of visibleModules; track mod.id; let last = $last) {
        <section [class.cp-module-bg]="!!mod.backgroundColor" [attr.style]="moduleStyle(mod)">
          @if (mod.title) {
            <h2
              class="font-heading uppercase tracking-wide relative mb-2"
              [class.cp-module-section-title--cat-pill]="titleUsesCategoryPill(mod)"
              [style.--category-color]="categoryColor(mod)"
              style="font-size: var(--row-header-font-size, var(--news-title-font-size, 18px)); font-weight: var(--row-header-font-weight, var(--news-title-font-weight, 800)); color: var(--row-header-color, var(--news-title-color, currentColor));"
            >
              <span class="cp-module-section-title-text">{{ mod.title }}</span>
              <span class="cp-module-section-title-rule" aria-hidden="true"></span>
            </h2>
          }

          @switch (mod.type) {
            @case ('list-title-left') {
              <div class="divide-y divide-gray-400">
                @for (item of mod.posts; track item.post.id) {
                  <cp-home-list-item
                    class="block"
                    [post]="item.post"
                    [showDate]="item.showDate"
                    [showAuthor]="item.showAuthor"
                    [showCategory]="articleShowCategory(mod)"
                    [showSummary]="mod.showSummary ?? true"
                    [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
                    [dateFormat]="mod.dateFormat ?? null"
                    [showReadingTime]="mod.showReadingTime ?? false"
                    [typography]="mod.typography ?? null"
                    imageSide="right"
                  />
                }
              </div>
            }
            @case ('list-title-right') {
              <div class="divide-y divide-gray-400">
                @for (item of mod.posts; track item.post.id) {
                  <cp-home-list-item
                    class="block"
                    [post]="item.post"
                    [showDate]="item.showDate"
                    [showAuthor]="item.showAuthor"
                    [showCategory]="articleShowCategory(mod)"
                    [showSummary]="mod.showSummary ?? true"
                    [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
                    [dateFormat]="mod.dateFormat ?? null"
                    [showReadingTime]="mod.showReadingTime ?? false"
                    [typography]="mod.typography ?? null"
                    imageSide="left"
                  />
                }
              </div>
            }
            @case ('column') {
              <div class="divide-y divide-gray-400">
                @for (item of mod.posts; track item.post.id) {
                  <div class="py-4">
                    <ng-container
                      *ngTemplateOutlet="
                        cardTpl;
                        context: {
                          item: item,
                          mod: mod,
                          textPosition: mod.textPosition ?? 'below-image',
                          featured: false,
                        }
                      "
                    />
                  </div>
                }
              </div>
            }
            @case ('grid-2') {
              <div class="grid grid-cols-2 gap-px bg-gray-400" style="--cp-rule-inset: 0.5rem">
                @for (item of mod.posts; track item.post.id) {
                  <div class="bg-background p-2">
                    <ng-container
                      *ngTemplateOutlet="
                        cardTpl;
                        context: {
                          item: item,
                          mod: mod,
                          textPosition: mod.textPosition ?? 'below-image',
                          featured: false,
                        }
                      "
                    />
                  </div>
                }
              </div>
            }
            @case ('slideshow') {
              <cp-mobile-module-slideshow
                [items]="mod.posts"
                [textPosition]="mod.textPosition ?? 'on-image'"
                [showCategory]="articleShowCategory(mod)"
                [showSummary]="mod.showSummary ?? true"
                [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
                [dateFormat]="mod.dateFormat ?? null"
                [showReadingTime]="mod.showReadingTime ?? false"
              />
            }
            @case ('hero-list') {
              @if (mod.posts[0]; as hero) {
                <ng-container
                  *ngTemplateOutlet="
                    cardTpl;
                    context: {
                      item: hero,
                      mod: mod,
                      textPosition: mod.textPosition ?? 'below-image',
                      featured: true,
                    }
                  "
                />
              }
              @if (mod.posts.length > 1) {
                <div class="cp-stack-rule" aria-hidden="true"></div>
                <div class="divide-y divide-gray-400">
                  @for (item of mod.posts.slice(1); track item.post.id) {
                    <cp-home-list-item
                      class="block"
                      [post]="item.post"
                      [showDate]="item.showDate"
                      [showAuthor]="item.showAuthor"
                      [showCategory]="articleShowCategory(mod)"
                      [showSummary]="mod.showSummary ?? true"
                      [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
                      [dateFormat]="mod.dateFormat ?? null"
                      [showReadingTime]="mod.showReadingTime ?? false"
                      [typography]="mod.typography ?? null"
                      imageSide="right"
                    />
                  }
                </div>
              }
            }
          }
        </section>
        @if (!last) {
          <div class="cp-stack-rule" aria-hidden="true"></div>
        }
      }
    </div>

    <ng-template
      #cardTpl
      let-item="item"
      let-mod="mod"
      let-textPosition="textPosition"
      let-featured="featured"
    >
      <article class="group">
        <div
          class="relative overflow-hidden rounded-sm bg-muted"
          [class]="wideImage(featured, mod) ? 'aspect-[16/9]' : 'aspect-[4/3]'"
        >
          <cp-post-module-media [post]="item.post" playMode="inline">
            <cp-post-image-pills [pills]="item.post.pills" size="sm" />
          </cp-post-module-media>
          @if (textPosition === 'on-image') {
            <a
              [routerLink]="'/' + item.post.slug"
              class="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 py-3"
            >
              @if (articleShowCategory(mod) && item.post.primaryCategory) {
                <cp-category-label
                  [link]="false"
                  [onImage]="true"
                  [variant]="featured ? 'hero' : 'default'"
                  [name]="item.post.primaryCategory.name"
                  [slug]="item.post.primaryCategory.slug"
                  extraClass="tracking-wider mb-1"
                />
              }
              <h3
                class="font-heading text-white leading-tight"
                [style.font-size]="
                  featured
                    ? 'var(--hero-title-font-size, 22px)'
                    : 'var(--news-title-font-size, 16px)'
                "
                [style.font-weight]="
                  featured
                    ? 'var(--hero-title-font-weight, 800)'
                    : 'var(--news-title-font-weight, 700)'
                "
                style="color: var(--hero-title-color, currentColor);"
              >
                {{ item.post.title }}
              </h3>
              <cp-post-subtitle
                [show]="mod.showSummary ?? true"
                [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
                [bulbi]="item.post.bulbi ?? []"
                [excerpt]="item.post.excerpt"
                [variant]="featured ? 'hero' : 'default'"
                listClass="mt-1 text-white/85"
                textClass="mt-1 text-white/85"
              />
            </a>
          }
        </div>
        @if (textPosition === 'below-image') {
          <div class="pt-2">
            @if (articleShowCategory(mod) && item.post.primaryCategory) {
              <cp-category-label
                [variant]="featured ? 'hero' : 'default'"
                [name]="item.post.primaryCategory.name"
                [slug]="item.post.primaryCategory.slug"
                extraClass=""
              />
            }
            <h3
              class="font-heading leading-tight text-secondary"
              [style.font-size]="
                featured ? 'var(--hero-title-font-size, 22px)' : 'var(--news-title-font-size, 16px)'
              "
              [style.font-weight]="
                featured
                  ? 'var(--hero-title-font-weight, 800)'
                  : 'var(--news-title-font-weight, 700)'
              "
              [style.color]="
                featured
                  ? 'var(--hero-title-color, currentColor)'
                  : 'var(--news-title-color, currentColor)'
              "
            >
              <a [routerLink]="'/' + item.post.slug" class="hover:text-primary transition-colors">
                {{ item.post.title }}
              </a>
            </h3>
            <cp-post-subtitle
              [show]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [bulbi]="item.post.bulbi ?? []"
              [excerpt]="item.post.excerpt"
              [variant]="featured ? 'hero' : 'default'"
              listClass="mt-1 text-gray-700"
              textClass="mt-1 text-gray-700"
            />
            @if (canShowMeta(item, mod)) {
              <div
                class="mt-1.5 text-gray-500 flex items-center gap-1.5"
                [attr.style]="
                  featured
                    ? 'font-size: var(--hero-meta-font-size, var(--module-meta-font-size, 12px)); font-weight: var(--hero-meta-font-weight, var(--module-meta-font-weight, 400)); color: var(--hero-meta-color, var(--module-meta-color, currentColor));'
                    : 'font-size: var(--module-meta-font-size, 12px); font-weight: var(--module-meta-font-weight, 400); color: var(--module-meta-color, currentColor);'
                "
              >
                @if (canShowDate(item)) {
                  <time [dateTime]="item.post.publishedAt">
                    {{ formatDate(item.post.publishedAt, mod) }}
                  </time>
                }
                @if (canShowDate(item) && canShowReadingTime(item.post, mod)) {
                  <span class="text-gray-300">•</span>
                }
                @if (canShowReadingTime(item.post, mod)) {
                  <cp-post-reading-time [seconds]="item.post.readingTimeSeconds!" />
                }
                @if (
                  (canShowDate(item) || canShowReadingTime(item.post, mod)) &&
                  canShowViews(item.post)
                ) {
                  <span class="text-gray-300">•</span>
                }
                @if (canShowViews(item.post)) {
                  <cp-post-view-count [count]="item.post.viewCount!" />
                }
              </div>
            }
          </div>
        }
      </article>
    </ng-template>
  `,
})
export class MobileModulesLayoutComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() modules: ResolvedMobileModule[] = [];

  get visibleModules(): ResolvedMobileModule[] {
    return this.modules.filter((mod) => mod.posts.length > 0);
  }

  titleUsesCategoryPill(mod: ResolvedMobileModule): boolean {
    return moduleTitleUsesCategoryPill(mod);
  }

  categoryColor(mod: ResolvedMobileModule): string | null {
    return normalizeCategoryColor(mod.category?.color) ?? null;
  }

  moduleStyle(mod: ResolvedMobileModule): string | null {
    return combineInlineStyles(
      buildModuleBackgroundCss(mod.backgroundColor),
      buildModuleTypographyCss(mod.typography),
      buildSummaryDisplayCss(mod.summaryTypography, mod.summaryRows, mod.heroSummaryTypography),
    );
  }

  /** Full-width column cards match the hero-list featured image (16/9), not the taller 4/3 crop. */
  wideImage(featured: boolean, mod: ResolvedMobileModule): boolean {
    return featured || mod.type === 'column';
  }

  articleShowCategory(mod: ResolvedMobileModule): boolean {
    if (mod.category) return false;
    return mod.showCategory ?? true;
  }

  canShowDate(item: ResolvedModulePost): boolean {
    return item.showDate && item.post.showDate !== false && !!item.post.publishedAt;
  }

  canShowViews(post: ResolvedModulePost['post']): boolean {
    return this.siteSettings.canShowViews(post);
  }

  canShowReadingTime(post: ResolvedModulePost['post'], mod: ResolvedMobileModule): boolean {
    return (mod.showReadingTime ?? false) && (post.readingTimeSeconds ?? 0) > 0;
  }

  canShowMeta(item: ResolvedModulePost, mod: ResolvedMobileModule): boolean {
    return (
      this.canShowDate(item) ||
      this.canShowReadingTime(item.post, mod) ||
      this.canShowViews(item.post)
    );
  }

  formatDate(dateStr: string | null, mod?: ResolvedMobileModule): string {
    return this.siteSettings.formatPostDate(dateStr, mod?.dateFormat);
  }

  /** Used by template typing for textPosition context. */
  asTextPosition(value: MobileTextPosition | undefined): MobileTextPosition {
    return value ?? 'below-image';
  }
}
