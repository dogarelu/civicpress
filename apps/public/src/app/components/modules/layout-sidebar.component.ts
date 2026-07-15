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
import {
  buildSummaryDisplayCss,
  combineInlineStyles,
  buildModuleTypographyCss,
  sidebarBlockSummarySettings,
  sidebarBlockTypography,
  type PostSummary,
  type ResolvedSidebar,
  type SidebarMode,
} from '@civicpress/shared';
import { buildSidebarStream, type SidebarStreamUnit } from './sidebar-stream';

/** Vertical gap between sidebar units (matches `space-y-6` = 1.5rem). */
const SIDEBAR_UNIT_GAP_PX = 24;

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
  ],
  template: `
    <ng-container *ngIf="sidebar as sb">
      <div class="space-y-6">
        <div
          *ngFor="let unit of renderUnits; trackBy: trackByUnit"
          #unitEl
          [attr.style]="blockTypographyStyle(unit)"
        >
          <ng-container [ngSwitch]="unit.kind">
            <header
              *ngSwitchCase="'latest-header'"
              class="px-3 py-2 bg-gray-100 border border-border rounded-sm"
            >
              <span class="text-gray-800 text-xs font-bold uppercase tracking-wider">
                {{ unit.block.latestTitle }}
              </span>
            </header>

            <cp-recomandare-sidebar
              *ngSwitchCase="'latest-item'"
              [posts]="unit.posts"
              [displaySlots]="unit.displaySlots"
              [showSummary]="summaryVisible(unit)"
            />

            <cp-sidebar-slideshow
              *ngSwitchCase="'slideshow-block'"
              [posts]="unit.posts"
              [displaySlots]="unit.displaySlots"
              [textPosition]="unit.block.slideshowTextPosition"
              [showSummary]="summaryVisible(unit)"
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
            />

            <cp-sidebar-article-list
              *ngSwitchCase="'article-list-block'"
              [posts]="unit.posts"
              [displaySlots]="unit.displaySlots"
              [title]="unit.block.articleListTitle"
              [showSummary]="summaryVisible(unit)"
            />

            <ng-container *ngSwitchCase="'most-viewed-block'">
              <header
                *ngIf="unit.block.mostViewedTitle.trim().length > 0"
                class="px-3 py-2 bg-gray-100 border border-border rounded-sm"
              >
                <span class="text-gray-800 text-xs font-bold uppercase tracking-wider">
                  {{ unit.block.mostViewedTitle }}
                </span>
              </header>
              <cp-recomandare-sidebar
                [posts]="unit.posts"
                [displaySlots]="unit.displaySlots"
                [showSummary]="summaryVisible(unit)"
              />
            </ng-container>

            <cp-category-widget
              *ngSwitchCase="'single-category-block'"
              [strip]="unit.strip"
              [displaySlots]="unit.displaySlots"
              [maxPosts]="unit.maxPosts ?? 4"
              [showSummary]="summaryVisible(unit)"
            />

            <cp-category-widget
              *ngSwitchCase="'category-strip'"
              [strip]="unit.strip"
              [displaySlots]="unit.displaySlots"
            />
          </ng-container>
        </div>
      </div>
    </ng-container>
  `,
})
export class LayoutSidebarComponent implements OnChanges, AfterViewChecked {
  private platformId = inject(PLATFORM_ID);

  @ViewChildren('unitEl') unitEls!: QueryList<ElementRef<HTMLElement>>;

  @Input() sidebar: ResolvedSidebar | null = null;
  /** Index into the flattened sidebar stream where this section starts. */
  @Input() streamStart = 0;
  /** Max sidebar height allowed for this section; null shows all remaining units. */
  @Input() maxHeightPx: number | null = null;
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

  ngOnChanges(_changes: SimpleChanges): void {
    this.allUnits = this.sidebar ? buildSidebarStream(this.sidebar, this.extraPostsByMode) : [];
    // Reset measurement so a changed height/start re-fits from the full remainder.
    this.fitCount = -1;
    this.lastFitKey = '';
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
      const add = i === 0 ? h : SIDEBAR_UNIT_GAP_PX + h;
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

  blockTypographyStyle(unit: SidebarStreamUnit): string | null {
    if (!this.sidebar) return null;
    const summary = sidebarBlockSummarySettings(
      this.sidebar.blockSummarySettings,
      unit.mode,
      unit.block.blockId,
      this.sidebar.singleCategoryBlockSummarySettings,
      this.sidebar.slideshowBlockSummarySettings,
    );
    return combineInlineStyles(
      buildModuleTypographyCss(
        sidebarBlockTypography(
          this.sidebar.blockTypography,
          unit.mode,
          unit.block.blockId,
          this.sidebar.singleCategoryBlockTypography,
          this.sidebar.slideshowBlockTypography,
        ),
      ),
      buildSummaryDisplayCss(summary?.summaryTypography, summary?.summaryRows),
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
    );
    return summary?.showSummary !== false;
  }

  private emitStreamEnd(end: number): void {
    if (end === this.lastEmittedEnd) return;
    this.lastEmittedEnd = end;
    // Defer to avoid ExpressionChangedAfterChecked during the same CD pass.
    queueMicrotask(() => this.streamEndChange.emit(end));
  }
}
