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
      <div class="divide-y divide-border">
        @for (post of flatPosts; track post.id) {
          <cp-home-list-item class="block" [post]="post" [showSummary]="false" />
        }
      </div>
    } @else {
      <div>
        @for (unit of units; track unitTrack(unit)) {
          @if (unit.kind === 'module') {
            @if (modulePosts(unit).length > 0) {
              <div class="divide-y divide-border">
                @for (post of modulePosts(unit); track post.id) {
                  <cp-home-list-item class="block" [post]="post" [showSummary]="false" />
                }
              </div>
            }
          } @else {
            @for (section of sidebarSections(unit); track section.title) {
              <cp-mobile-sidebar-block
                [block]="section.block"
                [posts]="section.posts"
                [titleOverride]="section.title"
              />
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

  get flatPosts(): PostSummary[] {
    const seen = new Set<string>();
    const posts: PostSummary[] = [];
    for (const unit of this.units) {
      for (const post of collectMobileUnitPosts(unit, this.modules, this.sidebar, this.extras)) {
        if (this.categorySlug && post.primaryCategory?.slug !== this.categorySlug) continue;
        if (seen.has(post.id)) continue;
        seen.add(post.id);
        posts.push(post);
      }
    }
    return posts;
  }

  unitTrack(unit: MobileLayoutUnit): string {
    return `${unit.kind}:${unit.ref}`;
  }

  modulePosts(unit: MobileLayoutUnit): PostSummary[] {
    return collectMobileUnitPosts(unit, this.modules, this.sidebar, this.extras);
  }

  sidebarPosts(unit: MobileLayoutUnit): PostSummary[] {
    return collectMobileUnitPosts(unit, this.modules, this.sidebar, this.extras);
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

    const posts = this.sidebarPosts(unit);
    if (posts.length === 0) return [];
    return [{ block, posts, title: '' }];
  }
}
