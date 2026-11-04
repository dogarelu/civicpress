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
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { ModuleHeroComponent } from './module-hero.component';
import { ModuleHeroListComponent } from './module-hero-list.component';
import { ModuleHeroList6Component } from './module-hero-list-6.component';
import { ModuleHeroListCenterComponent } from './module-hero-list-center.component';
import { ModuleGridComponent } from './module-grid.component';
import { ModuleListComponent } from './module-list.component';
import { ModuleRows3Component } from './module-rows-3.component';
import { ModuleRows4Component } from './module-rows-4.component';
import { ModuleRows4SmComponent } from './module-rows-4-sm.component';
import { ModuleRows5Component } from './module-rows-5.component';
import { ModulePictures7Component } from './module-pictures-7.component';
import { ModuleCategoryColumnsComponent } from './module-category-columns.component';
import { ModuleSlideshowComponent } from './module-slideshow.component';
import { ModuleHeroTopListComponent } from './module-hero-top-list.component';
import { ModuleVideoListComponent } from './module-video-list.component';
import { ModuleArticleListComponent } from './module-article-list.component';
import { ModuleSplitComponent } from './module-split.component';
import { LayoutSidebarComponent } from './layout-sidebar.component';
import { MobileOrderedLayoutComponent } from './mobile-ordered-layout.component';
import { MobileModulesLayoutComponent } from './mobile-modules-layout.component';
import { ApiService } from '../../services/api.service';
import type {
  MobileLayoutUnit,
  PostSummary,
  ResolvedMobileModule,
  ResolvedModule,
  ResolvedSidebar,
  SidebarMode,
} from '@civicpress/shared';
import {
  buildModuleBackgroundCss,
  buildModuleTypographyCss,
  buildSummaryDisplayCss,
  combineInlineStyles,
  moduleTitleUsesCategoryPill,
  normalizeCategoryColor,
  isFullWidthModuleType,
  isStickyUntilBottom,
  normalizeStickyBlocks,
  resolveStickyRanges,
  splitModulesByStickyRanges,
} from '@civicpress/shared';

const LOAD_MORE_COUNT = 10;

const ROWS_MODULE_TYPES = new Set(['rows-3', 'rows-4', 'rows-4-sm', 'rows-5']);

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
    NgTemplateOutlet,
    ModuleHeroComponent,
    ModuleHeroListComponent,
    ModuleHeroList6Component,
    ModuleHeroListCenterComponent,
    ModuleGridComponent,
    ModuleListComponent,
    ModuleRows3Component,
    ModuleRows4Component,
    ModuleRows4SmComponent,
    ModuleRows5Component,
    ModulePictures7Component,
    ModuleCategoryColumnsComponent,
    ModuleSlideshowComponent,
    ModuleHeroTopListComponent,
    ModuleVideoListComponent,
    ModuleArticleListComponent,
    ModuleSplitComponent,
    LayoutSidebarComponent,
    MobileOrderedLayoutComponent,
    MobileModulesLayoutComponent,
  ],
  template: `
    @if (showDesktop) {
      <!-- Desktop layout (hidden on mobile) -->
      <div class="hidden md:block">
        @for (
          section of layoutSections;
          track sectionTrack(section, $index);
          let lastSection = $last
        ) {
          @if (section.kind === 'with-sidebar') {
            <div
              class="grid grid-cols-1 gap-4"
              [class.md:grid-cols-4]="!!sidebar"
              [class.md:gap-0]="!!sidebar"
              [class.md:-mx-4]="!!sidebar"
            >
              <div
                [class.md:col-span-3]="!!sidebar"
                [class.md:px-4]="!!sidebar"
                [class.md:border-r]="!!sidebar"
                [class.md:border-gray-400]="!!sidebar"
              >
                <div #mainColumn>
                  @if (stickySplitForSection(section); as split) {
                    @for (range of split.ranges; track $index; let si = $index) {
                      @if (range.gap.length) {
                        <div #stickyGapMeasure [attr.data-sticky-gap]="si">
                          @for (mod of range.gap; track mod.id) {
                            <ng-container
                              *ngTemplateOutlet="
                                mainModuleTpl;
                                context: { $implicit: mod, last: false }
                              "
                            />
                          }
                        </div>
                      }
                      <div #stickyMeasure [attr.data-sticky-range]="si">
                        @for (mod of range.modules; track mod.id; let last = $last) {
                          <ng-container
                            *ngTemplateOutlet="
                              mainModuleTpl;
                              context: {
                                $implicit: mod,
                                last:
                                  last &&
                                  si === split.ranges.length - 1 &&
                                  split.afterModules.length === 0,
                              }
                            "
                          />
                        }
                      </div>
                    }
                    @for (mod of split.afterModules; track mod.id; let last = $last) {
                      <ng-container
                        *ngTemplateOutlet="mainModuleTpl; context: { $implicit: mod, last }"
                      />
                    }
                  } @else {
                    @for (mod of section.modules; track mod.id; let last = $last) {
                      <ng-container
                        *ngTemplateOutlet="mainModuleTpl; context: { $implicit: mod, last }"
                      />
                    }
                  }
                </div>
              </div>
              @if (sidebar) {
                <div class="md:col-span-1 md:px-4">
                  <cp-layout-sidebar
                    [sidebar]="sidebar"
                    [streamStart]="streamStarts[section.sectionIndex] ?? 0"
                    [maxHeightPx]="sectionMaxHeights[section.sectionIndex] ?? null"
                    [stickyTravelHeightsPx]="stickyTravelHeightsForSection(section)"
                    [stickyGapHeightsPx]="stickyGapHeightsForSection(section)"
                    [stickyUntilBottom]="stickyUntilBottom"
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
            <section
              [class.cp-module-bg]="!!section.mod.backgroundColor"
              [attr.style]="moduleTypographyStyle(section.mod)"
            >
              @if (section.mod.title) {
                <h2
                  class="font-heading uppercase tracking-wide relative mb-3"
                  [class.cp-module-section-title--cat-pill]="titleUsesCategoryPill(section.mod)"
                  [style.--category-color]="categoryColor(section.mod)"
                  style="font-size: var(--row-header-font-size, var(--news-title-font-size, 18px)); font-weight: var(--row-header-font-weight, var(--news-title-font-weight, 800)); color: var(--row-header-color, var(--news-title-color, currentColor));"
                >
                  <span class="cp-module-section-title-text">{{ section.mod.title }}</span>
                  <span class="cp-module-section-title-rule" aria-hidden="true"></span>
                </h2>
              }
              @switch (section.mod.type) {
                @case ('hero-list-6') {
                  <cp-module-hero-list-6
                    [items]="section.mod.posts"
                    [sideCount]="section.mod.sideCount ?? 3"
                    [showCategory]="articleShowCategory(section.mod)"
                    [showSummary]="section.mod.showSummary ?? true"
                    [showBumbi]="section.mod.showBumbi ?? section.mod.showSummary ?? true"
                    [dateFormat]="section.mod.dateFormat ?? null"
                    [showReadingTime]="section.mod.showReadingTime ?? false"
                  />
                }
                @case ('hero-list-center') {
                  <cp-module-hero-list-center
                    [items]="section.mod.posts"
                    [sideCount]="section.mod.sideCount ?? 3"
                    [showCategory]="articleShowCategory(section.mod)"
                    [showSummary]="section.mod.showSummary ?? true"
                    [showBumbi]="section.mod.showBumbi ?? section.mod.showSummary ?? true"
                    [dateFormat]="section.mod.dateFormat ?? null"
                    [showReadingTime]="section.mod.showReadingTime ?? false"
                  />
                }
                @case ('rows-5') {
                  <cp-module-rows-5
                    [rows]="section.mod.rows ?? []"
                    [showCategory]="section.mod.showCategory ?? false"
                    [showSummary]="section.mod.showSummary ?? true"
                    [showBumbi]="section.mod.showBumbi ?? section.mod.showSummary ?? true"
                    [dateFormat]="section.mod.dateFormat ?? null"
                    [showReadingTime]="section.mod.showReadingTime ?? false"
                  />
                }
                @case ('pictures-7') {
                  <cp-module-pictures-7
                    [items]="section.mod.posts"
                    [count]="section.mod.count ?? 7"
                    [showBumbi]="section.mod.showBumbi ?? false"
                  />
                }
                @case ('category-columns') {
                  <cp-module-category-columns
                    [columns]="section.mod.columns ?? []"
                    [smallCount]="section.mod.smallCount ?? 3"
                    [dateFormat]="section.mod.dateFormat ?? null"
                    [showReadingTime]="section.mod.showReadingTime ?? false"
                    [showBumbi]="section.mod.showBumbi ?? false"
                  />
                }
                @default {
                  <cp-module-rows-4
                    [rows]="section.mod.rows ?? []"
                    [showCategory]="section.mod.showCategory ?? false"
                    [showSummary]="section.mod.showSummary ?? true"
                    [showBumbi]="section.mod.showBumbi ?? section.mod.showSummary ?? true"
                    [dateFormat]="section.mod.dateFormat ?? null"
                    [showReadingTime]="section.mod.showReadingTime ?? false"
                  />
                }
              }
            </section>
          }
          @if (!lastSection) {
            <div class="cp-stack-rule" aria-hidden="true"></div>
          }
        }
      </div>
    }

    @if (showMobile) {
      <!-- Mobile: dedicated modules when configured; else legacy web-order fallback -->
      <div class="md:hidden">
        @if (mobileModules.length > 0) {
          <cp-mobile-modules-layout [modules]="mobileModules" />
        } @else {
          <cp-mobile-ordered-layout
            [mobileOrder]="mobileOrder"
            [modules]="modules"
            [sidebar]="sidebar"
            [extras]="mobileExtras"
            [categorySlug]="categorySlug"
          />
        }
      </div>
    }

    <ng-template #mainModuleTpl let-mod let-last="last">
      <section
        [class.cp-module-bg]="!!mod.backgroundColor"
        [attr.style]="moduleTypographyStyle(mod)"
      >
        @if (mod.title) {
          <h2
            class="font-heading uppercase tracking-wide relative mb-3"
            [class.cp-module-section-title--cat-pill]="titleUsesCategoryPill(mod)"
            [style.--category-color]="categoryColor(mod)"
            style="font-size: var(--row-header-font-size, var(--news-title-font-size, 18px)); font-weight: var(--row-header-font-weight, var(--news-title-font-weight, 800)); color: var(--row-header-color, var(--news-title-color, currentColor));"
          >
            <span class="cp-module-section-title-text">{{ mod.title }}</span>
            <span class="cp-module-section-title-rule" aria-hidden="true"></span>
          </h2>
        }
        @switch (mod.type) {
          @case ('hero') {
            <cp-module-hero
              [item]="mod.posts[0] ?? null"
              [showCategory]="articleShowCategory(mod)"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('hero-list') {
            <cp-module-hero-list
              [items]="mod.posts"
              [sideCount]="mod.sideCount ?? 3"
              [showCategory]="articleShowCategory(mod)"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('hero-top-list') {
            <cp-module-hero-top-list
              [items]="mod.posts"
              [sideCount]="mod.sideCount ?? 3"
              [showCategory]="articleShowCategory(mod)"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('hero-slideshow') {
            <cp-module-slideshow
              [items]="mod.posts"
              [showCategory]="articleShowCategory(mod)"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('grid') {
            <cp-module-grid
              [items]="mod.posts"
              [showCategory]="articleShowCategory(mod)"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('list') {
            <cp-module-list
              [items]="listItems(mod)"
              [hasMore]="listHasMore(mod)"
              [loading]="loadingModuleId === mod.id"
              [typography]="mod.typography"
              [showCategory]="articleShowCategory(mod)"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
              (loadMore)="onLoadMore(mod)"
            />
          }
          @case ('rows-3') {
            <cp-module-rows-3
              [rows]="mod.rows ?? []"
              [showCategory]="mod.showCategory ?? false"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('rows-4') {
            <cp-module-rows-4
              [rows]="mod.rows ?? []"
              [showCategory]="mod.showCategory ?? false"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('rows-4-sm') {
            <cp-module-rows-4-sm
              [rows]="mod.rows ?? []"
              [showCategory]="mod.showCategory ?? false"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('rows-5') {
            <cp-module-rows-5
              [rows]="mod.rows ?? []"
              [showCategory]="mod.showCategory ?? false"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('pictures-7') {
            <cp-module-pictures-7
              [items]="mod.posts"
              [count]="mod.count ?? 7"
              [showBumbi]="mod.showBumbi ?? false"
            />
          }
          @case ('category-columns') {
            <cp-module-category-columns
              [columns]="mod.columns ?? []"
              [smallCount]="mod.smallCount ?? 3"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
              [showBumbi]="mod.showBumbi ?? false"
            />
          }
          @case ('video-list') {
            <cp-module-video-list [items]="mod.posts" [showBumbi]="mod.showBumbi ?? false" />
          }
          @case ('article-list') {
            <cp-module-article-list
              [items]="mod.posts"
              [showCategory]="articleShowCategory(mod)"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('split') {
            <cp-module-split
              [item]="mod.posts[0] ?? null"
              [splitReverse]="mod.splitReverse ?? false"
              [showCategory]="articleShowCategory(mod)"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
          @case ('slideshow') {
            <cp-module-slideshow
              [items]="mod.posts"
              [showCategory]="articleShowCategory(mod)"
              [showSummary]="mod.showSummary ?? true"
              [showBumbi]="mod.showBumbi ?? mod.showSummary ?? true"
              [dateFormat]="mod.dateFormat ?? null"
              [showReadingTime]="mod.showReadingTime ?? false"
            />
          }
        }
      </section>
      @if (!last) {
        <div class="cp-stack-rule" aria-hidden="true"></div>
      }
    </ng-template>
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
  /** When non-empty, mobile uses these instead of the legacy mobileOrder fallback. */
  @Input() mobileModules: ResolvedMobileModule[] = [];
  @Input() showDesktop = true;
  @Input() showMobile = true;
  /** Set on category pages so extra loads only include that category. */
  @Input() categorySlug: string | null = null;

  @ViewChildren('mainColumn') mainColumns!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('stickyMeasure') stickyMeasures!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('stickyGapMeasure') stickyGapMeasures!: QueryList<ElementRef<HTMLElement>>;

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
  /** Measured sticky travel heights for section 0 (one per sticky sidebar block). */
  stickyTravelHeightsPx: number[] | null = null;
  /** Measured left-column gap heights before each sticky range. */
  stickyGapHeightsPx: number[] | null = null;
  private measuredStickyKey = '';

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
    this.stickyTravelHeightsPx = null;
    this.stickyGapHeightsPx = null;
    this.measuredStickyKey = '';
    // Re-observe columns after content swaps (e.g. navigating between pages).
    queueMicrotask(() => this.setupResizeObserver());
  }

  /**
   * When sticky is enabled, split the first with-sidebar section into sequential
   * left-column segments so each sticky sidebar block can relay (including later
   * blocks whose earlier neighbors are not sticky).
   * Category "until bottom" does not split — CSS sticky lasts through the column.
   */
  stickySplitForSection(section: WithSidebarSection): {
    ranges: { gap: ResolvedModule[]; modules: ResolvedModule[] }[];
    afterModules: ResolvedModule[];
  } | null {
    const stickyBlocks = this.sidebar
      ? normalizeStickyBlocks(this.sidebar, this.sidebar.blocks.length)
      : [];
    if (stickyBlocks.length === 0 || section.sectionIndex !== 0) return null;
    if (this.stickyUntilBottom) return null;
    if (section.modules.length === 0) return null;

    const ranges = resolveStickyRanges(
      stickyBlocks,
      section.modules.map((mod) => mod.id),
    );
    if (ranges.length === 0) return null;

    const split = splitModulesByStickyRanges(section.modules, ranges);
    return {
      ranges: split.ranges,
      afterModules: split.after,
    };
  }

  stickyTravelHeightsForSection(section: WithSidebarSection): number[] | null {
    const stickyBlocks = this.sidebar
      ? normalizeStickyBlocks(this.sidebar, this.sidebar.blocks.length)
      : [];
    if (stickyBlocks.length === 0 || section.sectionIndex !== 0) return null;
    if (this.stickyUntilBottom) return null;
    return this.stickyTravelHeightsPx;
  }

  stickyGapHeightsForSection(section: WithSidebarSection): number[] | null {
    const stickyBlocks = this.sidebar
      ? normalizeStickyBlocks(this.sidebar, this.sidebar.blocks.length)
      : [];
    if (stickyBlocks.length === 0 || section.sectionIndex !== 0) return null;
    if (this.stickyUntilBottom) return null;
    return this.stickyGapHeightsPx;
  }

  get stickyUntilBottom(): boolean {
    if (!this.sidebar) return false;
    const stickyBlocks = normalizeStickyBlocks(this.sidebar, this.sidebar.blocks.length);
    if (stickyBlocks.length === 0) return false;
    // Category pages always pin through the full left column (no until-module relay).
    return !!this.categorySlug || isStickyUntilBottom(stickyBlocks);
  }

  /** Modules that actually have content; keeps separators from trailing after empty ones. */
  get visibleModules(): ResolvedModule[] {
    return this.modules.filter((mod) => {
      if (ROWS_MODULE_TYPES.has(mod.type)) {
        return (mod.rows ?? []).some((row) => row.posts.length > 0);
      }
      if (mod.type === 'category-columns') {
        return (mod.columns ?? []).some((col) => col.posts.length > 0);
      }
      return mod.posts.length > 0;
    });
  }

  get layoutSections(): LayoutSection[] {
    const sections: LayoutSection[] = [];
    let current: ResolvedModule[] = [];
    let sectionIndex = 0;

    for (const mod of this.visibleModules) {
      if (isFullWidthModuleType(mod.type, { count: mod.count })) {
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
    this.stickyMeasures.changes.subscribe(() => this.setupResizeObserver());
    this.stickyGapMeasures.changes.subscribe(() => this.setupResizeObserver());
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
    for (const measure of this.stickyMeasures?.toArray() ?? []) {
      this.resizeObserver.observe(measure.nativeElement);
    }
    for (const measure of this.stickyGapMeasures?.toArray() ?? []) {
      this.resizeObserver.observe(measure.nativeElement);
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
    if (key !== this.measuredHeightsKey) {
      this.measuredHeightsKey = key;
      this.sectionMaxHeights = nextHeights;
    }

    const stickyBlocks = this.sidebar
      ? normalizeStickyBlocks(this.sidebar, this.sidebar.blocks.length)
      : [];
    if (stickyBlocks.length > 0 && !this.stickyUntilBottom) {
      const measures = this.stickyMeasures?.toArray() ?? [];
      const gapByIndex = new Map<number, number>();
      for (const measure of this.stickyGapMeasures?.toArray() ?? []) {
        const index = Number(measure.nativeElement.getAttribute('data-sticky-gap'));
        if (Number.isFinite(index)) {
          gapByIndex.set(index, measure.nativeElement.offsetHeight);
        }
      }
      const heights = measures.map((measure) => measure.nativeElement.offsetHeight);
      const gapHeights = heights.map((_, index) => gapByIndex.get(index) ?? 0);
      const stickyKey = `${heights.join('|')}::${gapHeights.join('|')}`;
      if (stickyKey !== this.measuredStickyKey) {
        this.measuredStickyKey = stickyKey;
        this.stickyTravelHeightsPx =
          heights.length > 0 && heights.some((h) => h > 0) ? heights : null;
        this.stickyGapHeightsPx = gapHeights.some((h) => h > 0) ? gapHeights : [];
      }
    } else if (this.stickyTravelHeightsPx != null || this.stickyGapHeightsPx != null) {
      this.measuredStickyKey = '';
      this.stickyTravelHeightsPx = null;
      this.stickyGapHeightsPx = null;
    }
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
    const categorySlug = mod.category?.slug ?? this.categorySlug ?? undefined;
    this.api.getMorePosts(this.visiblePostIds(), categorySlug, LOAD_MORE_COUNT).subscribe({
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

  titleUsesCategoryPill(mod: ResolvedModule): boolean {
    return moduleTitleUsesCategoryPill(mod);
  }

  categoryColor(mod: ResolvedModule): string | null {
    return normalizeCategoryColor(mod.category?.color) ?? null;
  }

  /**
   * Per-article category labels: respect the module toggle, but hide them when the
   * module itself is scoped to a category (the section title replaces the labels).
   */
  articleShowCategory(mod: ResolvedModule): boolean {
    if (mod.category) return false;
    if (mod.type === 'slideshow' || mod.type === 'hero-slideshow') {
      return mod.showCategory ?? false;
    }
    if (ROWS_MODULE_TYPES.has(mod.type)) {
      return mod.showCategory ?? false;
    }
    return mod.showCategory ?? true;
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
      buildModuleBackgroundCss(mod.backgroundColor),
      buildModuleTypographyCss(mod.typography),
      buildSummaryDisplayCss(mod.summaryTypography, mod.summaryRows, mod.heroSummaryTypography),
    );
  }
}
