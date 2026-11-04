import { Component, Input } from '@angular/core';
import { HomeListItemComponent } from '../home-list-item.component';
import { SidebarVideoComponent } from './sidebar-video.component';
import { SidebarFeaturedPhotoComponent } from './sidebar-featured-photo.component';
import { SidebarFeaturedStackComponent } from './sidebar-featured-stack.component';
import {
  normalizeCategoryColor,
  SIDEBAR_LATEST_TITLE_DEFAULT,
  SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
  SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT,
  type PostDateFormat,
  type PostSummary,
  type ResolvedSidebarBlock,
} from '@civicpress/shared';

/** Mobile article page: one sidebar block as a headed list section. */
@Component({
  selector: 'cp-mobile-sidebar-block',
  standalone: true,
  imports: [
    HomeListItemComponent,
    SidebarVideoComponent,
    SidebarFeaturedPhotoComponent,
    SidebarFeaturedStackComponent,
  ],
  template: `
    @if (block.mode === 'featured-photo' && block.featuredPhotoUrl) {
      <cp-sidebar-featured-photo
        class="mt-6 block"
        [title]="title"
        [caption]="block.featuredPhotoCaption ?? ''"
        [imageUrl]="block.featuredPhotoUrl"
      />
    } @else if (block.mode === 'featured-video') {
      <div class="mt-6">
        <cp-sidebar-video [posts]="posts" [videoItems]="block.videoItems" [sectionTitle]="title" />
      </div>
    } @else if (block.mode === 'featured-stack' && posts.length > 0) {
      <div class="mt-6">
        <cp-sidebar-featured-stack
          [posts]="posts"
          [displaySlots]="block.latestSlots"
          [title]="title"
          [secondaryCount]="block.featuredSecondaryCount ?? 3"
        />
      </div>
    } @else if (posts.length > 0) {
      <aside class="mt-6">
        @if (title.trim().length > 0) {
          <header
            class="px-3 py-2 text-center cp-row-header-bar border border-border rounded-t-sm"
            [style.--category-color]="headerCategoryColor"
          >
            <span
              class="uppercase tracking-wider"
              style="font-size: var(--row-header-font-size, 12px); font-weight: var(--row-header-font-weight, 700); color: var(--row-header-color, #1f2937);"
              >{{ title }}</span
            >
          </header>
        }
        <div
          class="border border-border divide-y divide-border px-2"
          [class.border-t-0]="title.trim().length > 0"
          [class.rounded-b-sm]="title.trim().length > 0"
          [class.rounded-sm]="title.trim().length === 0"
        >
          @for (post of posts; track post.id) {
            <cp-home-list-item
              [post]="post"
              [showSummary]="false"
              [showCategory]="articleShowCategory"
              [dateFormat]="dateFormat"
              [showReadingTime]="showReadingTime"
            />
          }
        </div>
      </aside>
    }
  `,
})
export class MobileSidebarBlockComponent {
  @Input() block!: ResolvedSidebarBlock;
  @Input() posts: PostSummary[] = [];
  @Input() titleOverride = '';
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  get articleShowCategory(): boolean {
    if (this.block.mode === 'single-category' || this.block.mode === 'categories') {
      return false;
    }
    if (this.block.mode === 'most-viewed') {
      return this.block.mostViewedShowCategory ?? true;
    }
    if (this.block.mode === 'latest') {
      return this.block.latestShowCategory ?? true;
    }
    return true;
  }

  get headerCategoryColor(): string | null {
    if (this.block.mode !== 'single-category' && this.block.mode !== 'categories') {
      return null;
    }
    return normalizeCategoryColor(this.block.categoryStrips[0]?.category.color) ?? null;
  }

  get title(): string {
    if (this.titleOverride) return this.titleOverride;
    switch (this.block.mode) {
      case 'latest':
        return this.block.latestTitle ?? SIDEBAR_LATEST_TITLE_DEFAULT;
      case 'overlay-list':
        return this.block.overlayListTitle || SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT;
      case 'video':
        return 'Video';
      case 'slideshow':
        return 'Slideshow';
      case 'article-list':
        return this.block.articleListTitle || 'Articole';
      case 'most-viewed':
        return this.block.mostViewedTitle || SIDEBAR_MOST_VIEWED_TITLE_DEFAULT;
      case 'single-category':
        return this.block.categoryStrips[0]?.category.name ?? 'Categorie';
      case 'categories':
        return this.block.categoryStrips[0]?.category.name ?? 'Categorie';
      case 'featured-video':
      case 'featured-article':
      case 'featured-photo':
      case 'featured-stack':
        return this.block.featuredTitle ?? '';
      default:
        return 'Articole';
    }
  }
}
