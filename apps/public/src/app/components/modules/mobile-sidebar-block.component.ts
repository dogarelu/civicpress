import { Component, Input } from '@angular/core';
import { HomeListItemComponent } from '../home-list-item.component';
import type { PostSummary, ResolvedSidebar, ResolvedSidebarBlock } from '@civicpress/shared';
import {
  SIDEBAR_LATEST_TITLE_DEFAULT,
  SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
  SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT,
} from '@civicpress/shared';

/** Mobile article page: one sidebar block as a headed list section. */
@Component({
  selector: 'cp-mobile-sidebar-block',
  standalone: true,
  imports: [HomeListItemComponent],
  template: `
    @if (posts.length > 0) {
      <aside class="mt-6">
        @if (title.trim().length > 0) {
          <header class="px-3 py-2 bg-gray-100 border border-border rounded-t-sm">
            <span class="text-gray-800 text-xs font-bold uppercase tracking-wider">{{
              title
            }}</span>
          </header>
        }
        <div
          class="border border-border divide-y divide-border px-2"
          [class.border-t-0]="title.trim().length > 0"
          [class.rounded-b-sm]="title.trim().length > 0"
          [class.rounded-sm]="title.trim().length === 0"
        >
          @for (post of posts; track post.id) {
            <cp-home-list-item [post]="post" [showSummary]="false" />
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
      default:
        return 'Articole';
    }
  }
}
