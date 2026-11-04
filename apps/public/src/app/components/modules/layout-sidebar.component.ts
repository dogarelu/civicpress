import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  PLATFORM_ID,
  QueryList,
  SimpleChanges,
  ViewChildren,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RecomandateSidebarComponent } from '../recomandare-sidebar.component';
import { CategoryWidgetComponent } from '../category-widget.component';
import { SidebarSlideshowComponent } from './sidebar-slideshow.component';
import { SidebarVideoComponent } from './sidebar-video.component';
import { SidebarOverlayListComponent } from './sidebar-overlay-list.component';
import { SidebarArticleListComponent } from './sidebar-article-list.component';
import { SidebarFeaturedPhotoComponent } from './sidebar-featured-photo.component';
import { SidebarFeaturedStackComponent } from './sidebar-featured-stack.component';
import {
  buildBumbiDisplayCss,
  buildModuleBackgroundCss,
  buildSummaryDisplayCss,
  combineInlineStyles,
  buildModuleTypographyCss,
  resolveShowBumbi,
  normalizeStickyBlocks,
  type SidebarStickyBlock,
  sidebarBlockBackgroundColor,
  sidebarBlockSummarySettings,
  sidebarBlockTypography,
  type ModuleTypographyStyle,
  type PostDateFormat,
  type PostSummary,
  type ResolvedSidebar,
  type SidebarMode,
} from '@civicpress/shared';
import { buildSidebarStream, type SidebarStreamUnit } from './sidebar-stream';

/** Vertical gap between sidebar units (matches `space-y-6` = 1.5rem). */
const SIDEBAR_UNIT_GAP_PX = 24;

/** Fallback when a sidebar block has summary enabled but no typography saved. */
const SIDEBAR_SUMMARY_FALLBACK: ModuleTypographyStyle = {
  fontSize: 16,
  fontWeight: 400,
  color: '#374151',
};

/** Second column: ordered sidebar blocks with optional height-based continuation. */
@Component({
  selector: 'cp-layout-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RecomandateSidebarComponent,
    CategoryWidgetComponent,
    SidebarSlideshowComponent,
    SidebarVideoComponent,
    SidebarOverlayListComponent,
    SidebarArticleListComponent,
    SidebarFeaturedPhotoComponent,
    SidebarFeaturedStackComponent,
  ],
  template: `
    <ng-container *ngIf="sidebar as sb">
      <div class="space-y-6">
        <ng-container *ngIf="stickyActive; else plainUnits">
          <ng-container *ngIf="stickyUntilBottom; else relaySticky">
            <div
              *ngFor="let unit of leadingUnits; trackBy: trackByUnit"
              #unitEl
              class="lg:mx-0"
              [class.cp-sb-latest]="unit.kind === 'latest-item'"
              [class.cp-sb-article]="unit.kind === 'featured-article-block'"
              [attr.data-sb-stack]="unitStackGroup(unit)"
              [class.cp-module-bg]="unitHasBackground(unit)"
              [attr.style]="blockTypographyStyle(unit)"
            >
              <ng-container
                *ngTemplateOutlet="unitTpl; context: { $implicit: unit }"
              ></ng-container>
            </div>
            <div
              class="lg:sticky cp-sidebar-sticky space-y-6"
              style="top: var(--cp-sticky-header-height, 0px)"
            >
              <div
                *ngFor="let unit of stickyPrefixUnits; trackBy: trackByUnit"
                #unitEl
                class="lg:mx-0"
                [class.cp-sb-latest]="unit.kind === 'latest-item'"
                [class.cp-sb-article]="unit.kind === 'featured-article-block'"
                [attr.data-sb-stack]="unitStackGroup(unit)"
                [class.cp-module-bg]="unitHasBackground(unit)"
                [attr.style]="blockTypographyStyle(unit)"
              >
                <ng-container
                  *ngTemplateOutlet="unitTpl; context: { $implicit: unit }"
                ></ng-container>
              </div>
            </div>
          </ng-container>
          <ng-template #relaySticky>
            <div
              *ngFor="let segment of stickySegments; let si = index; trackBy: trackByStickySegment"
            >
              <div
                *ngIf="stickyGapUnits(si).length || stickyGapHeight(si) > 0"
                class="space-y-6"
                [class.pointer-events-none]="stickyGapUnits(si).length === 0"
                [style.min-height.px]="stickyGapHeight(si) > 0 ? stickyGapHeight(si) : null"
              >
                <div
                  *ngFor="let unit of stickyGapUnits(si); trackBy: trackByUnit"
                  #unitEl
                  class="lg:mx-0"
                  [class.cp-sb-latest]="unit.kind === 'latest-item'"
                  [class.cp-sb-article]="unit.kind === 'featured-article-block'"
                  [attr.data-sb-stack]="unitStackGroup(unit)"
                  [class.cp-module-bg]="unitHasBackground(unit)"
                  [attr.style]="blockTypographyStyle(unit)"
                >
                  <ng-container
                    *ngTemplateOutlet="unitTpl; context: { $implicit: unit }"
                  ></ng-container>
                </div>
              </div>
              <div
                class="relative"
                [class.cp-sb-rule-top]="stickyGapUnits(si).length > 0"
                [style.height.px]="stickyRegionHeightsPx[si] ?? null"
                [class.mb-0]="si === stickySegments.length - 1 && restUnits.length === 0"
              >
                <div
                  #stickyContent
                  class="lg:sticky cp-sidebar-sticky space-y-6"
                  style="top: var(--cp-sticky-header-height, 0px)"
                >
                  <div
                    *ngFor="let unit of segment; trackBy: trackByUnit"
                    #unitEl
                    class="lg:mx-0"
                    [class.cp-sb-latest]="unit.kind === 'latest-item'"
                    [class.cp-sb-article]="unit.kind === 'featured-article-block'"
                    [attr.data-sb-stack]="unitStackGroup(unit)"
                    [class.cp-module-bg]="unitHasBackground(unit)"
                    [attr.style]="blockTypographyStyle(unit)"
                  >
                    <ng-container
                      *ngTemplateOutlet="unitTpl; context: { $implicit: unit }"
                    ></ng-container>
                  </div>
                </div>
              </div>
            </div>
          </ng-template>
          <div
            *ngFor="let unit of restUnits; trackBy: trackByUnit"
            #unitEl
            class="lg:mx-0"
            [class.cp-sb-latest]="unit.kind === 'latest-item'"
            [class.cp-sb-article]="unit.kind === 'featured-article-block'"
            [attr.data-sb-stack]="unitStackGroup(unit)"
            [class.cp-module-bg]="unitHasBackground(unit)"
            [attr.style]="blockTypographyStyle(unit)"
          >
            <ng-container *ngTemplateOutlet="unitTpl; context: { $implicit: unit }"></ng-container>
          </div>
        </ng-container>

        <ng-template #plainUnits>
          <div
            *ngFor="let unit of renderUnits; trackBy: trackByUnit"
            #unitEl
            class="lg:mx-0"
            [class.cp-sb-latest]="unit.kind === 'latest-item'"
            [class.cp-sb-article]="unit.kind === 'featured-article-block'"
            [attr.data-sb-stack]="unitStackGroup(unit)"
            [class.cp-module-bg]="unitHasBackground(unit)"
            [attr.style]="blockTypographyStyle(unit)"
          >
            <ng-container *ngTemplateOutlet="unitTpl; context: { $implicit: unit }"></ng-container>
          </div>
        </ng-template>
      </div>

      <ng-template #unitTpl let-unit>
        <ng-container [ngSwitch]="unit.kind">
          <header
            *ngSwitchCase="'latest-header'"
            class="px-3 py-2 text-center cp-row-header-bar border border-border rounded-sm"
          >
            <span
              class="uppercase tracking-wider"
              style="font-size: var(--row-header-font-size, 12px); font-weight: var(--row-header-font-weight, 700); color: var(--row-header-color, #1f2937);"
            >
              {{ unit.block.latestTitle }}
            </span>
          </header>

          <cp-recomandare-sidebar
            *ngSwitchCase="'latest-item'"
            [posts]="unit.posts"
            [displaySlots]="unit.displaySlots"
            [showCategory]="unit.block.latestShowCategory ?? true"
            [showSummary]="summaryVisible(unit)"
            [showBumbi]="bumbiVisible(unit)"
            [dateFormat]="dateFormatFor(unit)"
            [showReadingTime]="showReadingTimeFor(unit)"
          />

          <cp-sidebar-slideshow
            *ngSwitchCase="'slideshow-block'"
            [posts]="unit.posts"
            [displaySlots]="unit.displaySlots"
            [textPosition]="unit.block.slideshowTextPosition"
            [showSummary]="summaryVisible(unit)"
            [showBumbi]="bumbiVisible(unit)"
            [dateFormat]="dateFormatFor(unit)"
            [showReadingTime]="showReadingTimeFor(unit)"
          />

          <cp-sidebar-video
            *ngSwitchCase="'video-block'"
            [posts]="unit.posts"
            [videoItems]="unit.videoItems"
            [displaySlots]="unit.displaySlots"
          />

          <cp-sidebar-overlay-list
            *ngSwitchCase="'overlay-list-block'"
            [posts]="unit.posts"
            [displaySlots]="unit.displaySlots"
            [title]="unit.block.overlayListTitle"
            [dateFormat]="dateFormatFor(unit)"
            [showReadingTime]="showReadingTimeFor(unit)"
          />

          <cp-sidebar-article-list
            *ngSwitchCase="'article-list-block'"
            [posts]="unit.posts"
            [displaySlots]="unit.displaySlots"
            [title]="unit.block.articleListTitle"
            [showSummary]="summaryVisible(unit)"
            [showBumbi]="bumbiVisible(unit)"
            [dateFormat]="dateFormatFor(unit)"
            [showReadingTime]="showReadingTimeFor(unit)"
          />

          <ng-container *ngSwitchCase="'most-viewed-block'">
            <div class="space-y-4">
              <header
                *ngIf="unit.block.mostViewedTitle.trim().length > 0"
                class="px-3 py-2 text-center cp-row-header-bar border border-border rounded-sm"
              >
                <span
                  class="uppercase tracking-wider"
                  style="font-size: var(--row-header-font-size, 12px); font-weight: var(--row-header-font-weight, 700); color: var(--row-header-color, #1f2937);"
                >
                  {{ unit.block.mostViewedTitle }}
                </span>
              </header>
              <cp-recomandare-sidebar
                class="block"
                [posts]="unit.posts"
                [displaySlots]="unit.displaySlots"
                [showCategory]="unit.block.mostViewedShowCategory ?? true"
                [showSummary]="summaryVisible(unit)"
                [showBumbi]="bumbiVisible(unit)"
                [dateFormat]="dateFormatFor(unit)"
                [showReadingTime]="showReadingTimeFor(unit)"
              />
            </div>
          </ng-container>

          <cp-category-widget
            *ngSwitchCase="'single-category-block'"
            [strip]="unit.strip"
            [displaySlots]="unit.displaySlots"
            [maxPosts]="unit.maxPosts ?? 4"
            [showSummary]="summaryVisible(unit)"
            [showBumbi]="bumbiVisible(unit)"
            [dateFormat]="dateFormatFor(unit)"
            [showReadingTime]="showReadingTimeFor(unit)"
          />

          <cp-category-widget
            *ngSwitchCase="'category-strip'"
            [strip]="unit.strip"
            [displaySlots]="unit.displaySlots"
            [dateFormat]="dateFormatFor(unit)"
            [showReadingTime]="showReadingTimeFor(unit)"
          />

          <cp-sidebar-video
            *ngSwitchCase="'featured-video-block'"
            [posts]="unit.posts"
            [videoItems]="unit.videoItems"
            [displaySlots]="unit.displaySlots"
            [sectionTitle]="unit.block.featuredTitle ?? ''"
          />

          <cp-sidebar-article-list
            *ngSwitchCase="'featured-article-block'"
            [posts]="unit.posts"
            [displaySlots]="unit.displaySlots"
            [title]="unit.block.featuredTitle ?? ''"
            [showSummary]="summaryVisible(unit)"
            [showBumbi]="bumbiVisible(unit)"
            [dateFormat]="dateFormatFor(unit)"
            [showReadingTime]="showReadingTimeFor(unit)"
          />

          <cp-sidebar-featured-photo
            *ngSwitchCase="'featured-photo-block'"
            [title]="unit.block.featuredTitle ?? ''"
            [caption]="unit.block.featuredPhotoCaption ?? ''"
            [imageUrl]="unit.block.featuredPhotoUrl ?? null"
          />

          <cp-sidebar-featured-stack
            *ngSwitchCase="'featured-stack-block'"
            [posts]="unit.posts"
            [displaySlots]="unit.displaySlots"
            [title]="unit.block.featuredTitle ?? ''"
            [secondaryCount]="unit.block.featuredSecondaryCount ?? 3"
            [showBumbi]="bumbiVisible(unit)"
          />
        </ng-container>
      </ng-template>
    </ng-container>
  `,
})
export class LayoutSidebarComponent implements OnChanges, AfterViewChecked {
  private platformId = inject(PLATFORM_ID);

  @ViewChildren('unitEl') unitEls!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('stickyContent') stickyContents!: QueryList<ElementRef<HTMLElement>>;

  @Input() sidebar: ResolvedSidebar | null = null;
  /** Index into the flattened sidebar stream where this section starts. */
  @Input() streamStart = 0;
  /** Max sidebar height allowed for this section; null shows all remaining units. */
  @Input() maxHeightPx: number | null = null;
  /**
   * Measured heights of left-column sticky segments (one per sticky sidebar block).
   * When set, those blocks stick in relay within their segment ranges.
   */
  @Input() stickyTravelHeightsPx: number[] | null = null;
  /** Measured left-column heights before each sticky range (start offset). */
  @Input() stickyGapHeightsPx: number[] | null = null;
  /**
   * Stick the sticky blocks through the whole left column (no until-module relay).
   * Used on category pages.
   */
  @Input() stickyUntilBottom = false;
  /** Extra posts appended per sidebar block mode. */
  @Input() extraPostsByMode: Partial<Record<SidebarMode, PostSummary[]>> = {};
  @Input() hasMoreByMode: Partial<Record<SidebarMode, boolean>> = {};
  @Input() loadingByMode: Partial<Record<SidebarMode, boolean>> = {};
  @Output() streamEndChange = new EventEmitter<number>();
  @Output() loadMore = new EventEmitter<SidebarMode>();

  private allUnits: SidebarStreamUnit[] = [];
  /** Units to keep in this section once measured (-1 = render all remaining). */
  private fitCount = -1;
  private lastEmittedEnd = -1;
  private lastFitKey = '';
  private lastStickyRegionKey = '';
  stickyRegionHeightsPx: number[] = [];

  ngOnChanges(_changes: SimpleChanges): void {
    this.allUnits = this.sidebar ? buildSidebarStream(this.sidebar, this.extraPostsByMode) : [];
    // Reset measurement so a changed height/start re-fits from the full remainder.
    this.fitCount = -1;
    this.lastFitKey = '';
    this.lastStickyRegionKey = '';
    this.stickyRegionHeightsPx = [...(this.stickyTravelHeightsPx ?? [])];
  }

  private get stickyEntries(): SidebarStickyBlock[] {
    if (!this.sidebar) return [];
    return normalizeStickyBlocks(this.sidebar, this.sidebar.blocks.length);
  }

  private get firstStickyBlockIndex(): number {
    return this.stickyEntries[0]?.blockIndex ?? -1;
  }

  private get lastStickyBlockIndex(): number {
    const entries = this.stickyEntries;
    return entries[entries.length - 1]?.blockIndex ?? -1;
  }

  get stickyActive(): boolean {
    if (this.streamStart !== 0 || this.stickyEntries.length === 0) return false;
    if (this.stickyUntilBottom) {
      return this.stickyPrefixUnits.length > 0;
    }
    const heights = this.stickyTravelHeightsPx;
    return (
      !!heights &&
      heights.length > 0 &&
      heights.some((h) => h > 0) &&
      this.stickySegments.some((segment) => segment.length > 0)
    );
  }

  /** Units before the first sticky block (until-bottom mode). */
  get leadingUnits(): SidebarStreamUnit[] {
    const first = this.firstStickyBlockIndex;
    if (first < 0 || this.streamStart !== 0) return [];
    return this.renderUnits.filter((unit) => unit.blockIndex < first);
  }

  /**
   * Until-bottom sticky group: first sticky through last sticky (keeps order
   * when a later block is sticky and an earlier one is not).
   */
  get stickyPrefixUnits(): SidebarStreamUnit[] {
    const first = this.firstStickyBlockIndex;
    const last = this.lastStickyBlockIndex;
    if (first < 0 || this.streamStart !== 0) return [];
    return this.renderUnits.filter((unit) => unit.blockIndex >= first && unit.blockIndex <= last);
  }

  /** One unit group per sticky entry, in blockIndex order (relay). */
  get stickySegments(): SidebarStreamUnit[][] {
    const entries = this.stickyEntries;
    if (entries.length === 0 || this.streamStart !== 0) return [];
    const remaining = this.renderUnits;
    return entries.map((entry) => remaining.filter((unit) => unit.blockIndex === entry.blockIndex));
  }

  /** Non-sticky units between the previous sticky block and this one. */
  stickyGapUnits(index: number): SidebarStreamUnit[] {
    const entries = this.stickyEntries;
    const current = entries[index]?.blockIndex;
    if (current == null) return [];
    const prev = index === 0 ? -1 : (entries[index - 1]?.blockIndex ?? -1);
    return this.renderUnits.filter((unit) => unit.blockIndex > prev && unit.blockIndex < current);
  }

  get restUnits(): SidebarStreamUnit[] {
    if (!this.stickyActive) return [];
    const last = this.lastStickyBlockIndex;
    if (last < 0) return [];
    return this.renderUnits.filter((unit) => unit.blockIndex > last);
  }

  /** Units rendered in this section (all remaining while measuring, then trimmed). */
  get renderUnits(): SidebarStreamUnit[] {
    const remaining = this.allUnits.slice(this.streamStart);
    if (this.fitCount < 0) return remaining;
    return remaining.slice(0, this.fitCount);
  }

  ngAfterViewChecked(): void {
    if (!this.sidebar) {
      this.emitStreamEnd(this.streamStart);
      return;
    }

    if (this.stickyActive && !this.stickyUntilBottom) {
      this.syncStickyRegionHeights();
    }

    const remainingCount = this.allUnits.length - this.streamStart;

    // Last section (or SSR): show everything remaining.
    if (this.maxHeightPx == null || !isPlatformBrowser(this.platformId)) {
      this.fitCount = -1;
      this.emitStreamEnd(this.allUnits.length);
      return;
    }

    const fitKey = `${this.streamStart}:${this.maxHeightPx}:${this.allUnits.length}`;
    if (fitKey === this.lastFitKey) return;

    // Only measure while the full remainder is rendered.
    const els = this.unitEls?.toArray() ?? [];
    if (els.length !== remainingCount) return;

    let total = 0;
    let k = 0;
    for (let i = 0; i < els.length; i++) {
      const h = els[i].nativeElement.offsetHeight;
      const stack = els[i].nativeElement.dataset['sbStack'] ?? '';
      const prevStack = i > 0 ? (els[i - 1].nativeElement.dataset['sbStack'] ?? '') : '';
      const sameStack = stack.length > 0 && stack === prevStack;
      const add = i === 0 || sameStack ? h : SIDEBAR_UNIT_GAP_PX + h;
      if (total + add <= this.maxHeightPx) {
        total += add;
        k++;
      } else {
        break;
      }
    }

    // Always show at least one unit so the column is never blank next to content.
    k = Math.min(remainingCount, Math.max(1, k));

    this.lastFitKey = fitKey;
    this.fitCount = k >= remainingCount ? -1 : k;
    this.emitStreamEnd(this.streamStart + k);
  }

  trackByUnit(_index: number, unit: SidebarStreamUnit): string {
    return unit.key;
  }

  /** Consecutive latest-stream items share a stack so they fit as one divided list. */
  unitStackGroup(unit: SidebarStreamUnit): string {
    return unit.kind === 'latest-item' ? `latest:${unit.blockIndex}` : '';
  }

  trackByStickySegment(index: number, segment: SidebarStreamUnit[]): string {
    return `${index}:${segment.map((unit) => unit.key).join(',')}`;
  }

  stickyGapHeight(index: number): number {
    const gap = this.stickyGapHeightsPx?.[index] ?? 0;
    if (gap <= 0) return 0;
    // Left-column gap already includes the stack-rule after the last gap module.
    return gap;
  }

  private unitBackgroundColor(unit: SidebarStreamUnit): string | undefined {
    if (!this.sidebar) return undefined;
    return sidebarBlockBackgroundColor(
      this.sidebar.blockBackgroundColor,
      unit.mode,
      unit.block.blockId,
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

  unitHasBackground(unit: SidebarStreamUnit): boolean {
    return !!this.unitBackgroundColor(unit);
  }

  blockTypographyStyle(unit: SidebarStreamUnit): string | null {
    if (!this.sidebar) return null;
    const summary = sidebarBlockSummarySettings(
      this.sidebar.blockSummarySettings,
      unit.mode,
      unit.block.blockId,
      this.sidebar.singleCategoryBlockSummarySettings,
      this.sidebar.slideshowBlockSummarySettings,
      {
        'featured-article': this.sidebar.featuredArticleBlockSummarySettings,
        'featured-stack': this.sidebar.featuredStackBlockSummarySettings,
      },
    );
    const summaryTypography = summary?.summaryTypography ?? SIDEBAR_SUMMARY_FALLBACK;
    const typography = sidebarBlockTypography(
      this.sidebar.blockTypography,
      unit.mode,
      unit.block.blockId,
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
      buildModuleBackgroundCss(this.unitBackgroundColor(unit)),
      buildModuleTypographyCss(typography),
      buildSummaryDisplayCss(
        summaryTypography,
        summary?.summaryRows,
        summary?.heroSummaryTypography,
      ),
      buildBumbiDisplayCss(typography?.bumbi, typography?.heroBumbi),
    );
  }

  summaryVisible(unit: SidebarStreamUnit): boolean {
    if (!this.sidebar) return true;
    const summary = sidebarBlockSummarySettings(
      this.sidebar.blockSummarySettings,
      unit.mode,
      unit.block.blockId,
      this.sidebar.singleCategoryBlockSummarySettings,
      this.sidebar.slideshowBlockSummarySettings,
      {
        'featured-article': this.sidebar.featuredArticleBlockSummarySettings,
        'featured-stack': this.sidebar.featuredStackBlockSummarySettings,
      },
    );
    return summary?.showSummary !== false;
  }

  bumbiVisible(unit: SidebarStreamUnit): boolean {
    if (!this.sidebar) return true;
    const summary = sidebarBlockSummarySettings(
      this.sidebar.blockSummarySettings,
      unit.mode,
      unit.block.blockId,
      this.sidebar.singleCategoryBlockSummarySettings,
      this.sidebar.slideshowBlockSummarySettings,
      {
        'featured-article': this.sidebar.featuredArticleBlockSummarySettings,
        'featured-stack': this.sidebar.featuredStackBlockSummarySettings,
      },
    );
    return resolveShowBumbi(summary?.showBumbi, summary?.showSummary);
  }

  dateFormatFor(unit: SidebarStreamUnit): PostDateFormat | null {
    if (!this.sidebar) return null;
    const summary = sidebarBlockSummarySettings(
      this.sidebar.blockSummarySettings,
      unit.mode,
      unit.block.blockId,
      this.sidebar.singleCategoryBlockSummarySettings,
      this.sidebar.slideshowBlockSummarySettings,
      {
        'featured-article': this.sidebar.featuredArticleBlockSummarySettings,
        'featured-stack': this.sidebar.featuredStackBlockSummarySettings,
      },
    );
    return summary?.dateFormat ?? null;
  }

  showReadingTimeFor(unit: SidebarStreamUnit): boolean {
    if (!this.sidebar) return false;
    const summary = sidebarBlockSummarySettings(
      this.sidebar.blockSummarySettings,
      unit.mode,
      unit.block.blockId,
      this.sidebar.singleCategoryBlockSummarySettings,
      this.sidebar.slideshowBlockSummarySettings,
      {
        'featured-article': this.sidebar.featuredArticleBlockSummarySettings,
        'featured-stack': this.sidebar.featuredStackBlockSummarySettings,
      },
    );
    return summary?.showReadingTime === true;
  }

  private syncStickyRegionHeights(): void {
    if (!isPlatformBrowser(this.platformId) || !this.stickyTravelHeightsPx) return;
    const contents = this.stickyContents?.toArray() ?? [];
    const next = this.stickyTravelHeightsPx.map((travel, i) => {
      const contentHeight = contents[i]?.nativeElement.offsetHeight ?? 0;
      return Math.max(travel ?? 0, contentHeight);
    });
    const key = next.join('|');
    if (key === this.lastStickyRegionKey) return;
    this.lastStickyRegionKey = key;
    const changed =
      next.length !== this.stickyRegionHeightsPx.length ||
      next.some((h, i) => h !== this.stickyRegionHeightsPx[i]);
    if (changed) {
      queueMicrotask(() => {
        this.stickyRegionHeightsPx = next;
      });
    }
  }

  private emitStreamEnd(end: number): void {
    if (end === this.lastEmittedEnd) return;
    this.lastEmittedEnd = end;
    // Defer to avoid ExpressionChangedAfterChecked during the same CD pass.
    queueMicrotask(() => this.streamEndChange.emit(end));
  }
}
