import { Component, Input } from '@angular/core';
import { HomeListItemComponent } from '../home-list-item.component';
import { MobileSidebarBlockComponent } from './mobile-sidebar-block.component';
import type {
  MobileLayoutUnit,
  PostSummary,
  ResolvedModule,
  ResolvedModulePost,
  ResolvedSidebar,
  SidebarMode,
} from '@civicpress/shared';
import {
  buildModuleBackgroundCss,
  buildModuleTypographyCss,
  combineInlineStyles,
  moduleTitleUsesCategoryPill,
  normalizeCategoryColor,
  sidebarBlockBackgroundColor,
  sidebarBlockSummarySettings,
  sidebarBlockTypography,
  type PostDateFormat,
} from '@civicpress/shared';
import { collectMobileUnitPosts, resolveMobileOrderFromApi } from './mobile-post-list';
import type { ResolvedSidebarBlock } from '@civicpress/shared';
import { findSidebarBlockForRef } from './mobile-sidebar-utils';

export interface MobileLayoutExtras {
  moduleExtras?: Record<string, ResolvedModulePost[]>;
  sidebarExtraPostsByMode?: Partial<Record<SidebarMode, PostSummary[]>>;
}

/**
 * Renders mobile layout units in admin-configured order.
 * Home/category: single flat list. Article: modules as flat rows, sidebar as headed blocks.
 */
@Component({
  selector: 'cp-mobile-ordered-layout',
  standalone: true,
  imports: [HomeListItemComponent, MobileSidebarBlockComponent],
  template: `
    @if (variant === 'flat') {
      <div class="divide-y divide-gray-400">
        @for (unit of units; track unitTrack(unit)) {
          @if (unit.kind === 'module') {
            @if (modulePosts(unit).length > 0) {
              <div
                class="py-4"
                [class.cp-module-bg]="!!moduleForUnit(unit)?.backgroundColor"
                [attr.style]="unitBackgroundStyle(unit)"
              >
                @if (moduleTitle(unit); as title) {
                  <h2
                    class="font-heading uppercase tracking-wide relative mb-2 px-0"
                    [class.cp-module-section-title--cat-pill]="titleUsesCategoryPill(unit)"
                    [style.--category-color]="categoryColor(unit)"
                    style="font-size: var(--row-header-font-size, var(--news-title-font-size, 18px)); font-weight: var(--row-header-font-weight, var(--news-title-font-weight, 800)); color: var(--row-header-color, var(--news-title-color, currentColor));"
                  >
                    <span class="cp-module-section-title-text">{{ title }}</span>
                    <span class="cp-module-section-title-rule" aria-hidden="true"></span>
                  </h2>
                }
                <div class="divide-y divide-gray-400">
                  @for (post of modulePosts(unit); track post.id) {
                    <cp-home-list-item
                      class="block"
                      [post]="post"
                      [showCategory]="moduleArticleShowCategory(unit)"
                      [showSummary]="false"
                      [dateFormat]="moduleDateFormat(unit)"
                      [showReadingTime]="moduleShowReadingTime(unit)"
                    />
                  }
                </div>
              </div>
            }
          } @else {
            @for (section of sidebarSections(unit); track section.title) {
              <div
                class="divide-y divide-gray-400 py-4"
                [class.cp-module-bg]="!!sidebarSectionBackgroundColor(section.block)"
                [attr.style]="sidebarSectionBackgroundStyle(section.block)"
              >
                @for (post of section.posts; track post.id) {
                  <cp-home-list-item
                    class="block"
                    [post]="post"
                    [showSummary]="false"
                    [dateFormat]="sidebarDateFormat(section.block)"
                    [showReadingTime]="sidebarShowReadingTime(section.block)"
                  />
                }
              </div>
            }
          }
        }
      </div>
    } @else {
      <div class="divide-y divide-gray-400">
        @for (unit of units; track unitTrack(unit)) {
          @if (unit.kind === 'module') {
            @if (modulePosts(unit).length > 0) {
              <div
                class="divide-y divide-gray-400 py-3"
                [class.cp-module-bg]="!!moduleForUnit(unit)?.backgroundColor"
                [attr.style]="unitBackgroundStyle(unit)"
              >
                @if (moduleTitle(unit); as title) {
                  <h2
                    class="font-heading uppercase tracking-wide relative mb-2 pt-3"
                    [class.cp-module-section-title--cat-pill]="titleUsesCategoryPill(unit)"
                    [style.--category-color]="categoryColor(unit)"
                    style="font-size: var(--row-header-font-size, var(--news-title-font-size, 18px)); font-weight: var(--row-header-font-weight, var(--news-title-font-weight, 800)); color: var(--row-header-color, var(--news-title-color, currentColor));"
                  >
                    <span class="cp-module-section-title-text">{{ title }}</span>
                    <span class="cp-module-section-title-rule" aria-hidden="true"></span>
                  </h2>
                }
                @for (post of modulePosts(unit); track post.id) {
                  <cp-home-list-item
                    class="block"
                    [post]="post"
                    [showCategory]="moduleArticleShowCategory(unit)"
                    [showSummary]="false"
                    [dateFormat]="moduleDateFormat(unit)"
                    [showReadingTime]="moduleShowReadingTime(unit)"
                  />
                }
              </div>
            }
          } @else {
            @for (section of sidebarSections(unit); track section.title) {
              <div
                class="py-3"
                [class.cp-module-bg]="!!sidebarSectionBackgroundColor(section.block)"
                [attr.style]="sidebarSectionBackgroundStyle(section.block)"
              >
                <cp-mobile-sidebar-block
                  [block]="section.block"
                  [posts]="section.posts"
                  [titleOverride]="section.title"
                  [dateFormat]="sidebarDateFormat(section.block)"
                  [showReadingTime]="sidebarShowReadingTime(section.block)"
                />
              </div>
            }
          }
        }
      </div>
    }
  `,
})
export class MobileOrderedLayoutComponent {
  @Input() mobileOrder: MobileLayoutUnit[] = [];
  @Input() modules: ResolvedModule[] = [];
  @Input() sidebar: ResolvedSidebar | null = null;
  @Input() variant: 'flat' | 'article' = 'flat';
  @Input() extras: MobileLayoutExtras = {};
  /** Set on category pages so mobile feed stays category-specific. */
  @Input() categorySlug: string | null = null;

  get units(): MobileLayoutUnit[] {
    return resolveMobileOrderFromApi(this.mobileOrder, this.modules, this.sidebar);
  }

  unitTrack(unit: MobileLayoutUnit): string {
    return `${unit.kind}:${unit.ref}`;
  }

  moduleForUnit(unit: MobileLayoutUnit): ResolvedModule | null {
    if (unit.kind !== 'module') return null;
    return this.modules.find((mod) => mod.id === unit.ref) ?? null;
  }

  moduleTitle(unit: MobileLayoutUnit): string | null {
    return this.moduleForUnit(unit)?.title ?? null;
  }

  titleUsesCategoryPill(unit: MobileLayoutUnit): boolean {
    const mod = this.moduleForUnit(unit);
    return mod ? moduleTitleUsesCategoryPill(mod) : false;
  }

  categoryColor(unit: MobileLayoutUnit): string | null {
    const mod = this.moduleForUnit(unit);
    return normalizeCategoryColor(mod?.category?.color) ?? null;
  }

  unitBackgroundStyle(unit: MobileLayoutUnit): string | null {
    return buildModuleBackgroundCss(this.moduleForUnit(unit)?.backgroundColor);
  }

  sidebarSectionBackgroundColor(block: ResolvedSidebarBlock): string | undefined {
    if (!this.sidebar) return undefined;
    return sidebarBlockBackgroundColor(
      this.sidebar.blockBackgroundColor,
      block.mode,
      block.blockId,
      this.sidebar.singleCategoryBlockBackgroundColor,
      this.sidebar.slideshowBlockBackgroundColor,
      {
        'featured-video': this.sidebar.featuredVideoBlockBackgroundColor,
        'featured-article': this.sidebar.featuredArticleBlockBackgroundColor,
        'featured-photo': this.sidebar.featuredPhotoBlockBackgroundColor,
        'featured-stack': this.sidebar.featuredStackBlockBackgroundColor,
      },
    );
  }

  sidebarSectionBackgroundStyle(block: ResolvedSidebarBlock): string | null {
    if (!this.sidebar) return buildModuleBackgroundCss(this.sidebarSectionBackgroundColor(block));
    const typography = sidebarBlockTypography(
      this.sidebar.blockTypography,
      block.mode,
      block.blockId,
      this.sidebar.singleCategoryBlockTypography,
      this.sidebar.slideshowBlockTypography,
      {
        'featured-video': this.sidebar.featuredVideoBlockTypography,
        'featured-article': this.sidebar.featuredArticleBlockTypography,
        'featured-photo': this.sidebar.featuredPhotoBlockTypography,
        'featured-stack': this.sidebar.featuredStackBlockTypography,
      },
    );
    return combineInlineStyles(
      buildModuleBackgroundCss(this.sidebarSectionBackgroundColor(block)),
      buildModuleTypographyCss(typography),
    );
  }

  moduleDateFormat(unit: MobileLayoutUnit): PostDateFormat | null {
    return this.moduleForUnit(unit)?.dateFormat ?? null;
  }

  sidebarDateFormat(block: ResolvedSidebarBlock): PostDateFormat | null {
    if (!this.sidebar) return null;
    const summary = sidebarBlockSummarySettings(
      this.sidebar.blockSummarySettings,
      block.mode,
      block.blockId,
      this.sidebar.singleCategoryBlockSummarySettings,
      this.sidebar.slideshowBlockSummarySettings,
      {
        'featured-article': this.sidebar.featuredArticleBlockSummarySettings,
        'featured-stack': this.sidebar.featuredStackBlockSummarySettings,
      },
    );
    return summary?.dateFormat ?? null;
  }

  moduleShowReadingTime(unit: MobileLayoutUnit): boolean {
    return this.moduleForUnit(unit)?.showReadingTime ?? false;
  }

  sidebarShowReadingTime(block: ResolvedSidebarBlock): boolean {
    if (!this.sidebar) return false;
    const summary = sidebarBlockSummarySettings(
      this.sidebar.blockSummarySettings,
      block.mode,
      block.blockId,
      this.sidebar.singleCategoryBlockSummarySettings,
      this.sidebar.slideshowBlockSummarySettings,
      {
        'featured-article': this.sidebar.featuredArticleBlockSummarySettings,
        'featured-stack': this.sidebar.featuredStackBlockSummarySettings,
      },
    );
    return summary?.showReadingTime === true;
  }

  moduleArticleShowCategory(unit: MobileLayoutUnit): boolean {
    const mod = this.moduleForUnit(unit);
    if (!mod) return true;
    if (mod.category) return false;
    return mod.showCategory ?? true;
  }

  modulePosts(unit: MobileLayoutUnit): PostSummary[] {
    // Desktop-only module — never render on mobile fallback order.
    if (this.moduleForUnit(unit)?.type === 'video-list') return [];
    const posts = collectMobileUnitPosts(unit, this.modules, this.sidebar, this.extras);
    if (!this.categorySlug) return posts;
    return posts.filter((post) => post.primaryCategory?.slug === this.categorySlug);
  }

  sidebarPosts(unit: MobileLayoutUnit): PostSummary[] {
    const posts = collectMobileUnitPosts(unit, this.modules, this.sidebar, this.extras);
    if (!this.categorySlug) return posts;
    return posts.filter((post) => post.primaryCategory?.slug === this.categorySlug);
  }

  sidebarSections(unit: MobileLayoutUnit): Array<{
    block: ResolvedSidebarBlock;
    posts: PostSummary[];
    title: string;
  }> {
    if (unit.kind !== 'sidebar' || !this.sidebar) return [];
    const block = findSidebarBlockForRef(this.sidebar, unit.ref);
    if (!block) return [];

    if (block.mode === 'categories' || block.mode === 'single-category') {
      return block.categoryStrips
        .filter((strip) => strip.posts.length > 0)
        .map((strip) => ({
          block,
          posts: strip.posts,
          title: strip.category.name,
        }));
    }

    if (block.mode === 'featured-photo' && block.featuredPhotoUrl) {
      return [{ block, posts: [], title: block.featuredTitle ?? '' }];
    }
    if (block.mode === 'featured-video') {
      const videoPosts = this.sidebarPosts(unit);
      const hasContent = block.videoItems.some((item) => !!item.url) || postsHaveVideo(videoPosts);
      if (!hasContent) return [];
      return [{ block, posts: videoPosts, title: block.featuredTitle ?? '' }];
    }

    const posts = this.sidebarPosts(unit);
    if (posts.length === 0) return [];
    return [{ block, posts, title: '' }];
  }
}

function postsHaveVideo(posts: PostSummary[]): boolean {
  return posts.some((post) => !!post.videoUrl);
}
