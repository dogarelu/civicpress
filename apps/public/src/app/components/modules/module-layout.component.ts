import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  QueryList,
  SimpleChanges,
  ViewChildren,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ModuleHeroComponent } from './module-hero.component';
import { ModuleHeroListComponent } from './module-hero-list.component';
import { ModuleHeroList6Component } from './module-hero-list-6.component';
import { ModuleGridComponent } from './module-grid.component';
import { ModuleListComponent } from './module-list.component';
import { ModuleRows3Component } from './module-rows-3.component';
import { ModuleRows4Component } from './module-rows-4.component';
import { ModuleRows4SmComponent } from './module-rows-4-sm.component';
import { ModuleSlideshowComponent } from './module-slideshow.component';
import { ModuleHeroTopListComponent } from './module-hero-top-list.component';
import { LayoutSidebarComponent } from './layout-sidebar.component';
import { HomeListItemComponent } from '../home-list-item.component';
import { MobileOrderedLayoutComponent } from './mobile-ordered-layout.component';
import { ApiService } from '../../services/api.service';
import type {
  MobileLayoutUnit,
  PostSummary,
  ResolvedModule,
  ResolvedSidebar,
  SidebarMode,
} from '@civicpress/shared';
import {
  buildModuleTypographyCss,
  buildSummaryDisplayCss,
  combineInlineStyles,
  isFullWidthModuleType,
} from '@civicpress/shared';

const LOAD_MORE_COUNT = 10;

const ROWS_MODULE_TYPES = new Set(['rows-3', 'rows-4', 'rows-4-sm']);

type WithSidebarSection = {
  kind: 'with-sidebar';
  sectionIndex: number;
  modules: ResolvedModule[];
};

type FullWidthSection = {
  kind: 'full-width';
  mod: ResolvedModule;
};

type LayoutSection = WithSidebarSection | FullWidthSection;

/** Renders a resolved page layout: stacked modules + optional second column. */
@Component({
  selector: 'cp-module-layout',
  standalone: true,
  imports: [
    ModuleHeroComponent,
    ModuleHeroListComponent,
    ModuleHeroList6Component,
    ModuleGridComponent,
    ModuleListComponent,
    ModuleRows3Component,
    ModuleRows4Component,
    ModuleRows4SmComponent,
    ModuleSlideshowComponent,
    ModuleHeroTopListComponent,
    LayoutSidebarComponent,
    MobileOrderedLayoutComponent,
  ],
  template: `
    @if (showDesktop) {
      <!-- Desktop layout (hidden on mobile) -->
      <div class="hidden md:block space-y-6">
        @for (section of layoutSections; track sectionTrack(section, $index)) {
          @if (section.kind === 'with-sidebar') {
            <div class="grid grid-cols-1 gap-4" [class.lg:grid-cols-4]="!!sidebar">
              <div [class.lg:col-span-3]="!!sidebar">
                <div #mainColumn class="space-y-7">
                  @for (mod of section.modules; track mod.id; let last = $last) {
                    <section [attr.style]="moduleTypographyStyle(mod)">
                      @switch (mod.type) {
                        @case ('hero') {
                          <cp-module-hero
                            [item]="mod.posts[0] ?? null"
                            [showCategory]="mod.showCategory ?? true"
                            [showSummary]="mod.showSummary ?? true"
                          />
                        }
                        @case ('hero-list') {
                          <cp-module-hero-list
                            [items]="mod.posts.slice(0, 4)"
                            [showCategory]="mod.showCategory ?? true"
                            [showSummary]="mod.showSummary ?? true"
                          />
                        }
                        @case ('hero-top-list') {
                          <cp-module-hero-top-list
                            [items]="mod.posts.slice(0, 4)"
                            [showCategory]="mod.showCategory ?? true"
                            [showSummary]="mod.showSummary ?? true"
                          />
                        }
                        @case ('hero-slideshow') {
                          <cp-module-slideshow
                            [items]="mod.posts"
                            [showCategory]="mod.showCategory ?? false"
                            [showSummary]="mod.showSummary ?? true"
                          />
                        }
                        @case ('grid') {
                          <cp-module-grid
                            [items]="mod.posts"
                            [showCategory]="mod.showCategory ?? true"
                            [showSummary]="mod.showSummary ?? true"
                          />
                        }
                        @case ('list') {
                          <cp-module-list
                            [items]="listItems(mod)"
                            [hasMore]="listHasMore(mod)"
                            [loading]="loadingModuleId === mod.id"
                            [typography]="mod.typography"
                            [showCategory]="mod.showCategory ?? true"
                            [showSummary]="mod.showSummary ?? true"
                            (loadMore)="onLoadMore(mod)"
                          />
                        }
                        @case ('rows-3') {
                          <cp-module-rows-3
                            [rows]="mod.rows ?? []"
                            [showCategory]="mod.showCategory ?? false"
                            [showSummary]="mod.showSummary ?? true"
                          />
                        }
                        @case ('rows-4') {
                          <cp-module-rows-4
                            [rows]="mod.rows ?? []"
                            [showCategory]="mod.showCategory ?? false"
                            [showSummary]="mod.showSummary ?? true"
                          />
                        }
                        @case ('rows-4-sm') {
                          <cp-module-rows-4-sm
                            [rows]="mod.rows ?? []"
                            [showCategory]="mod.showCategory ?? false"
                            [showSummary]="mod.showSummary ?? true"
                          />
                        }
                        @case ('slideshow') {
                          <cp-module-slideshow
                            [items]="mod.posts"
                            [showCategory]="mod.showCategory ?? false"
                            [showSummary]="mod.showSummary ?? true"
                          />
                        }
                      }
                    </section>
                    @if (!last) {
                      <div class="flex items-center gap-0" aria-hidden="true">
                        <span class="h-[3px] w-12 bg-primary rounded-full"></span>
                        <span class="h-px flex-1 bg-border"></span>
                      </div>
                    }
                  }
                </div>
              </div>
              @if (sidebar) {
                <div class="lg:col-span-1">
                  <cp-layout-sidebar
                    [sidebar]="sidebar"
                    [streamStart]="streamStarts[section.sectionIndex] ?? 0"
                    [maxHeightPx]="sectionMaxHeights[section.sectionIndex] ?? null"
                    [extraPostsByMode]="sidebarExtraPostsByMode"
                    [hasMoreByMode]="sidebarHasMoreOverrideByMode"
                    [loadingByMode]="sidebarLoadingByMode"
                    (streamEndChange)="onStreamEnd(section.sectionIndex, $event)"
                    (loadMore)="onSidebarLoadMore($event)"
                  />
                </div>
              }
            </div>
          } @else {
            <section [attr.style]="moduleTypographyStyle(section.mod)">
              @switch (section.mod.type) {
                @case ('hero-list-6') {
                  <cp-module-hero-list-6
                    [items]="section.mod.posts.slice(0, 7)"
                    [showCategory]="section.mod.showCategory ?? true"
                    [showSummary]="section.mod.showSummary ?? true"
                  />
                }
                @default {
                  <cp-module-rows-4
                    [rows]="section.mod.rows ?? []"
                    [showCategory]="section.mod.showCategory ?? false"
                    [showSummary]="section.mod.showSummary ?? true"
                  />
                }
              }
            </section>
          }
        }
      </div>
    }

    @if (showMobile) {
      <!-- Mobile layout: flat list in configured unit order (visible only below md) -->
      <div class="md:hidden">
        <cp-mobile-ordered-layout
          [mobileOrder]="mobileOrder"
          [modules]="modules"
          [sidebar]="sidebar"
          [extras]="mobileExtras"
          [categorySlug]="categorySlug"
        />
      </div>
    }
  `,
})
export class ModuleLayoutComponent implements OnChanges, AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private resizeObserver?: ResizeObserver;

  @Input() modules: ResolvedModule[] = [];
  @Input() sidebar: ResolvedSidebar | null = null;
  @Input() mobileOrder: MobileLayoutUnit[] = [];
  @Input() showDesktop = true;
  @Input() showMobile = true;
  /** Set on category pages so extra loads only include that category. */
  @Input() categorySlug: string | null = null;

  @ViewChildren('mainColumn') mainColumns!: QueryList<ElementRef<HTMLElement>>;

  /** Extra posts keyed by module id. */
  private extraItems: Record<string, ResolvedModule['posts']> = {};
  /** Overrides the server-provided hasMore once a load-more response arrives. */
  private hasMoreOverride: Record<string, boolean> = {};
  loadingModuleId: string | null = null;

  /** Extra sidebar posts keyed by block mode. */
  sidebarExtraPostsByMode: Partial<Record<SidebarMode, PostSummary[]>> = {};
  sidebarHasMoreOverrideByMode: Partial<Record<SidebarMode, boolean>> = {};
  sidebarLoadingByMode: Partial<Record<SidebarMode, boolean>> = {};

  /** Stream start index per with-sidebar section. */
  streamStarts: number[] = [0];
  /** Measured main-column height per with-sidebar section. */
  sectionMaxHeights: Array<number | null> = [];
  private measuredHeightsKey = '';

  get mobileExtras() {
    return {
      moduleExtras: this.extraItems,
      sidebarExtraPostsByMode: this.sidebarExtraPostsByMode,
    };
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.streamStarts = [0];
    this.sectionMaxHeights = [];
    this.measuredHeightsKey = '';
    // Re-observe columns after content swaps (e.g. navigating between pages).
    queueMicrotask(() => this.setupResizeObserver());
  }

  /** Modules that actually have content; keeps separators from trailing after empty ones. */
  get visibleModules(): ResolvedModule[] {
    return this.modules.filter((mod) => {
      if (ROWS_MODULE_TYPES.has(mod.type)) {
        return (mod.rows ?? []).some((row) => row.posts.length > 0);
      }
      return mod.posts.length > 0;
    });
  }

  get layoutSections(): LayoutSection[] {
    const sections: LayoutSection[] = [];
    let current: ResolvedModule[] = [];
    let sectionIndex = 0;

    for (const mod of this.visibleModules) {
      if (isFullWidthModuleType(mod.type)) {
        if (current.length > 0) {
          sections.push({ kind: 'with-sidebar', sectionIndex: sectionIndex++, modules: current });
          current = [];
        }
        sections.push({ kind: 'full-width', mod });
      } else {
        current.push(mod);
      }
    }

    if (current.length > 0) {
      sections.push({ kind: 'with-sidebar', sectionIndex: sectionIndex++, modules: current });
    }

    return sections;
  }

  get withSidebarSectionCount(): number {
    return this.layoutSections.filter((section) => section.kind === 'with-sidebar').length;
  }

  sectionTrack(section: LayoutSection, index: number): string {
    if (section.kind === 'full-width') return `full:${section.mod.id}:${index}`;
    return `sidebar:${section.sectionIndex}:${section.modules.map((mod) => mod.id).join(',')}:${index}`;
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.setupResizeObserver();
    this.mainColumns.changes.subscribe(() => this.setupResizeObserver());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private setupResizeObserver(): void {
    if (!isPlatformBrowser(this.platformId) || typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.zone.run(() => this.measureSections()));
    for (const column of this.mainColumns?.toArray() ?? []) {
      this.resizeObserver.observe(column.nativeElement);
    }
    this.measureSections();
  }

  /**
   * Measures each with-sidebar section's main column so its sidebar can stop at the
   * full-width boundary. When the page is split by a full-width module every section
   * (including the last) is bounded so the sidebar never overruns the main column and
   * leaves a large blank. A page with a single section keeps an unbounded sidebar so
   * normal (un-split) pages behave as before.
   */
  private measureSections(): void {
    const sectionCount = this.withSidebarSectionCount;
    if (sectionCount === 0) return;

    const columns = this.mainColumns?.toArray() ?? [];
    if (columns.length !== sectionCount) return;

    const isSplit = sectionCount > 1;
    const nextHeights = columns.map((column) =>
      isSplit ? column.nativeElement.offsetHeight : null,
    );

    const key = nextHeights.map((h) => h ?? 'all').join('|');
    if (key === this.measuredHeightsKey) return;

    this.measuredHeightsKey = key;
    this.sectionMaxHeights = nextHeights;
  }

  onStreamEnd(sectionIndex: number, streamEnd: number): void {
    const nextStarts = [...this.streamStarts];
    nextStarts[sectionIndex + 1] = streamEnd;
    if (nextStarts.length <= sectionIndex + 1) {
      nextStarts.length = sectionIndex + 2;
    }
    if (nextStarts[sectionIndex + 1] !== this.streamStarts[sectionIndex + 1]) {
      this.streamStarts = nextStarts;
    }
  }

  listItems(mod: ResolvedModule): ResolvedModule['posts'] {
    const extras = this.extraItems[mod.id];
    return extras && extras.length > 0 ? [...mod.posts, ...extras] : mod.posts;
  }

  listHasMore(mod: ResolvedModule): boolean {
    return this.hasMoreOverride[mod.id] ?? mod.hasMore ?? false;
  }

  onLoadMore(mod: ResolvedModule): void {
    if (this.loadingModuleId !== null) return;
    this.loadingModuleId = mod.id;
    this.api
      .getMorePosts(this.visiblePostIds(), this.categorySlug ?? undefined, LOAD_MORE_COUNT)
      .subscribe({
        next: (res) => {
          const mapped = res.posts.map((post) => ({ post, showDate: true, showAuthor: true }));
          this.extraItems[mod.id] = [...(this.extraItems[mod.id] ?? []), ...mapped];
          this.hasMoreOverride[mod.id] = res.hasMore;
          this.loadingModuleId = null;
        },
        error: () => {
          this.loadingModuleId = null;
        },
      });
  }

  onSidebarLoadMore(mode: SidebarMode): void {
    if (this.sidebarLoadingByMode[mode]) return;
    this.sidebarLoadingByMode = { ...this.sidebarLoadingByMode, [mode]: true };
    const hasVideo = mode === 'video';
    this.api.getMorePosts(this.visiblePostIds(), undefined, LOAD_MORE_COUNT, hasVideo).subscribe({
      next: (res) => {
        this.sidebarExtraPostsByMode = {
          ...this.sidebarExtraPostsByMode,
          [mode]: [...(this.sidebarExtraPostsByMode[mode] ?? []), ...res.posts],
        };
        this.sidebarHasMoreOverrideByMode = {
          ...this.sidebarHasMoreOverrideByMode,
          [mode]: res.hasMore,
        };
        this.sidebarLoadingByMode = { ...this.sidebarLoadingByMode, [mode]: false };
      },
      error: () => {
        this.sidebarLoadingByMode = { ...this.sidebarLoadingByMode, [mode]: false };
      },
    });
  }

  private visiblePostIds(): string[] {
    const ids = new Set<string>();
    for (const mod of this.modules) {
      if (ROWS_MODULE_TYPES.has(mod.type)) {
        for (const row of mod.rows ?? []) {
          for (const entry of row.posts) ids.add(entry.post.id);
        }
        continue;
      }
      for (const entry of this.listItems(mod)) ids.add(entry.post.id);
    }
    if (this.sidebar) {
      for (const block of this.sidebar.blocks) {
        const blockPosts = [...block.posts, ...(this.sidebarExtraPostsByMode[block.mode] ?? [])];
        for (const post of blockPosts) ids.add(post.id);
        for (const strip of block.categoryStrips) {
          for (const post of strip.posts) ids.add(post.id);
        }
      }
    }
    return [...ids];
  }

  moduleTypographyStyle(mod: ResolvedModule): string | null {
    return combineInlineStyles(
      buildModuleTypographyCss(mod.typography),
      buildSummaryDisplayCss(mod.summaryTypography, mod.summaryRows),
    );
  }
}
