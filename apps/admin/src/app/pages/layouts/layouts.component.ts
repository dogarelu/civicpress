import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { PostPickerComponent, type PickedPost } from '../../components/post-picker.component';
import { ModuleSettingsModalComponent } from '../../components/module-settings-modal.component';
import { SummaryTypographyModalComponent } from '../../components/summary-typography-modal.component';
import {
  FULL_WIDTH_ONLY_MODULE_TYPES,
  deriveModuleTypographyPresets,
  mergeModuleTypographyPresets,
  migrateLegacySummaryFromTypography,
  normalizeModuleTypography,
  normalizeModuleTypographyPresets,
  presetTypographyForType,
  rememberModuleTypographyPreset,
  type AdminCategory,
  type AdminLayouts,
  type LayoutDisplaySlot,
  type LayoutModuleSlot,
  type LayoutPageId,
  type ModuleTypography,
  type ModuleTypographyPresets,
  type ModuleTypographyStyle,
  type ModuleType,
  type PageLayoutConfig,
  type Rows4RowKind,
  type SidebarBlockEntry,
  type SidebarBlockSummarySettings,
  type SidebarBlockTypography,
  type SidebarMode,
  type SummaryDisplaySettings,
  type SidebarVideoItem,
  type SidebarSlideshowTextPosition,
  type SingleCategoryBlockConfig,
  type SlideshowBlockConfig,
  defaultModuleShowCategory,
  isSidebarSingleCategoryEntry,
  isSidebarSlideshowEntry,
  sidebarBlockMode,
  sidebarBlockRef,
  syncMobileOrder,
  SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT,
  SIDEBAR_LATEST_TITLE_DEFAULT,
  SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
  type MobileLayoutUnit,
} from '@civicpress/shared';

interface EditableSlot {
  post: PickedPost | null;
  showDate: boolean;
  showAuthor: boolean;
}

interface EditableRow {
  id: string;
  kind: Rows4RowKind;
  categoryId: string | null;
  name: string;
  /** How many identical rows to render from this configuration. */
  repeatCount: number;
  slots: EditableSlot[];
}

interface EditableModule {
  id: string;
  type: ModuleType;
  /** User-defined display name (optional). */
  name: string;
  /** Articles shown by a `list` or `slideshow` module. */
  count: number;
  /** Rows for a `rows-3` / `rows-4` module. */
  rows: EditableRow[];
  /** Pinned articles per slot (home layout only). */
  slots: EditableSlot[];
  /** Optional text style override. */
  typography: ModuleTypography | null;
  /** When true, each article card shows its primary category on the meta row. */
  showCategory: boolean;
  /** List modules: when true, article summary text is displayed. */
  showSummary: boolean;
  /** Optional per-module summary line clamp override. */
  summaryRows: number | null;
  /** Optional per-module summary typography override. */
  summaryTypography: ModuleTypographyStyle | null;
}

interface EditableLayout {
  modules: EditableModule[];
  /** Per module-type typography presets persisted in PageLayout.config. */
  moduleTypographyPresets: ModuleTypographyPresets;
  articleMainTypography: ModuleTypography | null;
  articleMainShowSummary: boolean;
  articleMainSummaryRows: number | null;
  articleMainSummaryTypography: ModuleTypographyStyle | null;
  sidebarEnabled: boolean;
  sidebarBlocks: SidebarBlockEntry[];
  sidebarSlideshowCount: number;
  sidebarLatestCount: number;
  sidebarVideoCount: number;
  sidebarVideoItems: SidebarVideoItem[];
  sidebarOverlayListCount: number;
  sidebarLatestTitle: string;
  sidebarOverlayListTitle: string;
  sidebarArticleListCount: number;
  sidebarArticleListTitle: string;
  sidebarMostViewedCount: number;
  sidebarMostViewedTitle: string;
  sidebarSlideshowTextPosition: SidebarSlideshowTextPosition;
  sidebarLatestSlots: LayoutDisplaySlot[];
  sidebarCategorySlots: LayoutDisplaySlot[];
  sidebarOverlayListSlots: LayoutDisplaySlot[];
  sidebarArticleListSlots: LayoutDisplaySlot[];
  sidebarMostViewedSlots: LayoutDisplaySlot[];
  /** Per-instance config for `single-category` sidebar blocks (keyed by block id). */
  singleCategoryBlocks: Record<string, SingleCategoryBlockConfig>;
  /** Per-instance config for `slideshow` sidebar blocks (keyed by block id). */
  slideshowBlocks: Record<string, SlideshowBlockConfig>;
  sidebarBlockTypography: SidebarBlockTypography;
  singleCategoryBlockTypography: Record<string, ModuleTypography>;
  slideshowBlockTypography: Record<string, ModuleTypography>;
  sidebarBlockSummarySettings: SidebarBlockSummarySettings;
  singleCategoryBlockSummarySettings: Record<string, SummaryDisplaySettings>;
  slideshowBlockSummarySettings: Record<string, SummaryDisplaySettings>;
  mobileOrder: MobileLayoutUnit[];
}

type TypographyTarget =
  | { kind: 'module'; moduleIndex: number }
  | { kind: 'sidebar'; block: SidebarMode; blockId?: string }
  | { kind: 'article-main' };

type SummaryTypographyTarget =
  | { kind: 'module'; moduleIndex: number }
  | { kind: 'sidebar'; block: SidebarMode; blockId?: string }
  | { kind: 'article-main' };

const NEWS_TITLE_DEFAULT: ModuleTypographyStyle = {
  fontSize: 20,
  fontWeight: 700,
  color: '#1a1a1a',
};

const HERO_TITLE_DEFAULT: ModuleTypographyStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: '#1a1a1a',
};

const HERO_OVERLAY_TITLE_DEFAULT: ModuleTypographyStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: '#ffffff',
};

const SIDEBAR_TITLE_DEFAULT: ModuleTypographyStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: '#1a1a1a',
};

const HERO_SUMMARY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: '#4b5563',
};

const ARTICLE_MAIN_TITLE_DEFAULT: ModuleTypographyStyle = {
  fontSize: 30,
  fontWeight: 700,
  color: '#1a1a1a',
};

const ARTICLE_MAIN_SUMMARY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 16,
  fontWeight: 400,
  color: '#374151',
};

const ARTICLE_MAIN_CONTENT_DEFAULT: ModuleTypographyStyle = {
  fontSize: 17,
  fontWeight: 400,
  color: '#1f2937',
};

const LIST_SUMMARY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: '#374151',
};

const ROWS4_SM_TITLE_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: '#1a1a1a',
};

const ROWS4_SM_SUMMARY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 12,
  fontWeight: 400,
  color: '#374151',
};

const CATEGORY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#4b5563',
};

const HERO_CATEGORY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: '#374151',
};

const OVERLAY_CATEGORY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: '#ffffff',
};

const SLIDESHOW_CATEGORY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#ffffff',
};

const META_DEFAULT: ModuleTypographyStyle = {
  fontSize: 12,
  fontWeight: 400,
  color: '#6b7280',
};

const OVERLAY_META_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: '#ffffff',
};

const OVERLAY_SUMMARY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: 'rgba(255,255,255,0.85)',
};

const ROWS_CATEGORY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 12,
  fontWeight: 400,
  color: '#6b7280',
};

const ROWS4_SM_META_DEFAULT: ModuleTypographyStyle = {
  fontSize: 10,
  fontWeight: 400,
  color: '#6b7280',
};

const ROWS4_SM_CATEGORY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 10,
  fontWeight: 400,
  color: '#6b7280',
};

const ROW_HEADER_DEFAULT: ModuleTypographyStyle = {
  fontSize: 18,
  fontWeight: 800,
  color: '#1f2937',
};

const TYPOGRAPHY_DEFAULTS_BY_MODULE: Readonly<Record<ModuleType, ModuleTypography>> = {
  hero: {
    heroTitle: HERO_TITLE_DEFAULT,
    category: HERO_CATEGORY_DEFAULT,
    meta: META_DEFAULT,
  },
  'hero-list': {
    heroTitle: HERO_TITLE_DEFAULT,
    smallTitle: SIDEBAR_TITLE_DEFAULT,
    category: CATEGORY_DEFAULT,
    meta: META_DEFAULT,
  },
  'hero-list-6': {
    heroTitle: HERO_TITLE_DEFAULT,
    smallTitle: SIDEBAR_TITLE_DEFAULT,
    category: CATEGORY_DEFAULT,
    meta: META_DEFAULT,
  },
  'hero-top-list': {
    heroTitle: HERO_OVERLAY_TITLE_DEFAULT,
    smallTitle: NEWS_TITLE_DEFAULT,
    category: OVERLAY_CATEGORY_DEFAULT,
    meta: OVERLAY_META_DEFAULT,
  },
  'hero-slideshow': {
    heroTitle: HERO_OVERLAY_TITLE_DEFAULT,
    category: SLIDESHOW_CATEGORY_DEFAULT,
    meta: OVERLAY_META_DEFAULT,
  },
  grid: {
    title: NEWS_TITLE_DEFAULT,
    category: CATEGORY_DEFAULT,
    meta: META_DEFAULT,
  },
  list: {
    title: NEWS_TITLE_DEFAULT,
    category: CATEGORY_DEFAULT,
    meta: META_DEFAULT,
  },
  'rows-3': {
    title: NEWS_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: ROWS_CATEGORY_DEFAULT,
    meta: META_DEFAULT,
  },
  'rows-4': {
    title: NEWS_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: ROWS_CATEGORY_DEFAULT,
    meta: META_DEFAULT,
  },
  'rows-4-sm': {
    title: ROWS4_SM_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: ROWS4_SM_CATEGORY_DEFAULT,
    meta: ROWS4_SM_META_DEFAULT,
  },
  slideshow: {
    heroTitle: HERO_OVERLAY_TITLE_DEFAULT,
    category: SLIDESHOW_CATEGORY_DEFAULT,
    meta: OVERLAY_META_DEFAULT,
  },
};

const SIDEBAR_SUMMARY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 12,
  fontWeight: 400,
  color: '#6b7280',
};

const SIDEBAR_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: SIDEBAR_TITLE_DEFAULT,
  category: { fontSize: 10, fontWeight: 700, color: '#4b5563' },
  meta: { fontSize: 11, fontWeight: 400, color: '#6b7280' },
};

const ARTICLE_MAIN_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: ARTICLE_MAIN_TITLE_DEFAULT,
  content: ARTICLE_MAIN_CONTENT_DEFAULT,
};

/** Title-only defaults for sidebar slideshow with text on image (stable ref for modal inputs). */
const SIDEBAR_SLIDESHOW_ON_IMAGE_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: SIDEBAR_TITLE_DEFAULT,
};

const FALLBACK_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: NEWS_TITLE_DEFAULT,
};

const FALLBACK_MODULE_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: NEWS_TITLE_DEFAULT,
};

const SUMMARY_DEFAULTS_BY_MODULE: Readonly<Record<ModuleType, ModuleTypographyStyle>> = {
  hero: HERO_SUMMARY_DEFAULT,
  'hero-list': HERO_SUMMARY_DEFAULT,
  'hero-list-6': HERO_SUMMARY_DEFAULT,
  'hero-top-list': OVERLAY_SUMMARY_DEFAULT,
  'hero-slideshow': OVERLAY_SUMMARY_DEFAULT,
  grid: LIST_SUMMARY_DEFAULT,
  list: LIST_SUMMARY_DEFAULT,
  'rows-3': LIST_SUMMARY_DEFAULT,
  'rows-4': LIST_SUMMARY_DEFAULT,
  'rows-4-sm': ROWS4_SM_SUMMARY_DEFAULT,
  slideshow: OVERLAY_SUMMARY_DEFAULT,
};

const SIDEBAR_BLOCK_DEFS: { mode: SidebarMode; label: string }[] = [
  { mode: 'latest', label: 'Listă completă (ultimele știri)' },
  { mode: 'categories', label: 'Împărțit pe categorii' },
  { mode: 'overlay-list', label: 'Listă cu titlu pe imagine' },
  { mode: 'article-list', label: 'Listă verticală articole (stil rânduri)' },
  { mode: 'most-viewed', label: 'Cele mai citite' },
  { mode: 'single-category', label: 'Listă categorie (clasic)' },
  { mode: 'slideshow', label: 'Slideshow' },
  { mode: 'video', label: 'Video' },
];

const MODULE_DEFS: { type: ModuleType; label: string; fullWidthOnly?: boolean }[] = [
  { type: 'hero', label: '1 articol principal' },
  { type: 'hero-list', label: '1 principal + 3 mici' },
  { type: 'hero-list-6', label: '1 principal + 6 mici (lățime completă)', fullWidthOnly: true },
  { type: 'hero-top-list', label: '1 principal sus + 3 dedesubt' },
  { type: 'hero-slideshow', label: 'Principal pe poză (slideshow)' },
  { type: 'grid', label: '4 articole în grilă (2×2)' },
  { type: 'list', label: 'Listă de articole' },
  { type: 'rows-3', label: 'Rânduri de 3 (categorii / personalizate)' },
  { type: 'rows-4', label: 'Rânduri de 4 (categorii / personalizate)', fullWidthOnly: true },
  { type: 'rows-4-sm', label: 'Rânduri de 4 mici (categorii / personalizate)' },
  { type: 'slideshow', label: 'Slideshow articole' },
];

const FULL_WIDTH_TYPES = new Set<ModuleType>(FULL_WIDTH_ONLY_MODULE_TYPES);
const SIDEBAR_MODES_WITHOUT_SUMMARY = new Set<SidebarMode>(['overlay-list']);
const SIDEBAR_CONFLICT_PAIRS: ReadonlyArray<readonly [SidebarMode, SidebarMode]> = [
  ['latest', 'categories'],
];
const SIDEBAR_FEED_MAX_COUNT = 50;
const SIDEBAR_FEED_SLOT_CAPACITY = 50;

function moduleSupportsSummary(_type: ModuleType): boolean {
  return true;
}

/** Modules that render a hero overlay / slideshow title. */
function moduleSupportsHeroTitle(type: ModuleType): boolean {
  return (
    type === 'hero' ||
    type === 'hero-list' ||
    type === 'hero-list-6' ||
    type === 'hero-top-list' ||
    type === 'hero-slideshow' ||
    type === 'slideshow'
  );
}

/** Modules that render card / list titles styled via --news-title. */
function moduleSupportsCardTitle(type: ModuleType): boolean {
  return (
    type === 'grid' ||
    type === 'list' ||
    type === 'rows-3' ||
    type === 'rows-4' ||
    type === 'rows-4-sm'
  );
}

/** Modules that render small secondary-article titles with their own typography. */
function moduleSupportsSmallTitle(type: ModuleType): boolean {
  return type === 'hero-list' || type === 'hero-list-6' || type === 'hero-top-list';
}

/** Modules that render a per-row section header. */
function moduleSupportsRowHeader(type: ModuleType): boolean {
  return isRowsModuleType(type);
}

/** Sidebar block modes whose rendering honours category typography vars. */
const SIDEBAR_MODES_WITH_CATEGORY = new Set<SidebarMode>(['latest', 'most-viewed']);

/** Sidebar block modes whose rendering honours meta typography vars. */
const SIDEBAR_MODES_WITH_META = new Set<SidebarMode>([
  'latest',
  'most-viewed',
  'overlay-list',
  'article-list',
  'slideshow',
  'video',
]);

function sidebarSupportsSummary(
  mode: SidebarMode,
  slideshowTextPosition: SidebarSlideshowTextPosition,
): boolean {
  if (SIDEBAR_MODES_WITHOUT_SUMMARY.has(mode)) return false;
  if (mode === 'slideshow' && slideshowTextPosition === 'on-image') return false;
  return true;
}

function isRowsModuleType(type: ModuleType): boolean {
  return type === 'rows-3' || type === 'rows-4' || type === 'rows-4-sm';
}

function rowsSlotCount(type: ModuleType): number {
  if (type === 'rows-3') return 3;
  if (type === 'rows-4' || type === 'rows-4-sm') return 4;
  return 0;
}

function slotCount(type: ModuleType, count: number): number {
  switch (type) {
    case 'hero':
      return 1;
    case 'hero-list':
    case 'hero-top-list':
      return 4;
    case 'hero-list-6':
      return 7;
    case 'grid':
    case 'list':
      return count;
    case 'hero-slideshow':
    case 'slideshow':
      return count;
    case 'rows-3':
    case 'rows-4':
    case 'rows-4-sm':
      return 0;
  }
}

function defaultSlot(): EditableSlot {
  return { post: null, showDate: true, showAuthor: true };
}

function defaultDisplaySlot(): LayoutDisplaySlot {
  return { showDate: true, showAuthor: true };
}

function defaultRow(
  kind: Rows4RowKind,
  slotCount: number,
  categoryId: string | null = null,
): EditableRow {
  return {
    id: crypto.randomUUID(),
    kind,
    categoryId,
    name: kind === 'custom' ? 'Rând nou' : '',
    repeatCount: 1,
    slots: Array.from({ length: slotCount }, () => defaultSlot()),
  };
}

function resizeSlots(slots: EditableSlot[], size: number): EditableSlot[] {
  const next = slots.slice(0, size);
  while (next.length < size) next.push(defaultSlot());
  return next;
}

function resizeDisplaySlots(slots: LayoutDisplaySlot[], size: number): LayoutDisplaySlot[] {
  const next = slots.slice(0, size);
  while (next.length < size) next.push(defaultDisplaySlot());
  return next;
}

function slotFromConfig(slot: LayoutModuleSlot, posts: AdminLayouts['posts']): EditableSlot {
  const postId = slot.postId;
  if (!postId) {
    return {
      post: null,
      showDate: slot.showDate,
      showAuthor: slot.showAuthor,
    };
  }
  const post = posts[postId];
  return {
    post: post
      ? {
          id: post.id,
          title: post.title,
          publishedAt: post.publishedAt,
          authorDisplayName: post.authorName ?? post.author?.displayName ?? null,
        }
      : { id: postId, title: '(articol indisponibil)' },
    showDate: slot.showDate,
    showAuthor: slot.showAuthor,
  };
}

@Component({
  selector: 'cp-layouts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    PostPickerComponent,
    ModuleSettingsModalComponent,
    SummaryTypographyModalComponent,
  ],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-800">Aspect pagini</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Alege și ordonează modulele afișate. Sloturile fără articol fixat se umplu automat cu
            cele mai recente articole, fără duplicate în pagină.
          </p>
        </div>
        <button
          type="button"
          (click)="save()"
          [disabled]="saving() || loading()"
          class="px-4 py-2 text-sm bg-red-700 text-white rounded hover:bg-red-800 transition-colors disabled:opacity-50 font-medium"
        >
          {{ saving() ? 'Se salvează…' : 'Salvează' }}
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 border-b border-gray-200 mb-6">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            (click)="activeTab.set(tab.id)"
            class="px-4 py-2 text-sm font-medium rounded-t transition-colors border-b-2 -mb-px"
            [class.border-red-700]="activeTab() === tab.id"
            [class.text-red-700]="activeTab() === tab.id"
            [class.border-transparent]="activeTab() !== tab.id"
            [class.text-gray-500]="activeTab() !== tab.id"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="text-center py-12 text-gray-400">Se încarcă…</div>
      } @else {
        @if (current(); as layout) {
          <!-- Modules -->
          @if (activeTab() === 'home' || activeTab() === 'category' || activeTab() === 'article') {
            <section class="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
              <h2 class="text-sm font-semibold text-gray-700 mb-1 pb-2 border-b border-gray-100">
                Module
              </h2>
              @if (activeTab() === 'category') {
                <p class="text-xs text-gray-400 mb-3">
                  Pe paginile de categorie modulele se umplu automat cu cele mai recente articole
                  din categoria respectivă.
                </p>
              } @else if (activeTab() === 'article') {
                <p class="text-xs text-gray-400 mb-3">
                  Pe pagina de articol, modulele se afișează sub conținut și butoanele de
                  distribuire. Sloturile goale se umplu automat cu articole recente.
                </p>
                <div class="mb-3 flex flex-wrap items-center gap-2">
                  <label class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                    <input
                      type="checkbox"
                      [ngModel]="layout.articleMainShowSummary"
                      (ngModelChange)="setArticleMainShowSummary($event)"
                      class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                    />
                    Afișează rezumat
                  </label>
                  @if (layout.articleMainShowSummary) {
                    <label
                      class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                    >
                      Rânduri:
                      <input
                        type="number"
                        min="1"
                        max="8"
                        [ngModel]="layout.articleMainSummaryRows"
                        (ngModelChange)="setArticleMainSummaryRows($event)"
                        class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="implicit"
                      />
                    </label>
                  }
                  <button
                    type="button"
                    (click)="openArticleMainSummaryTypography()"
                    class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                    title="Setări tipografie pentru rezumatul principal"
                  >
                    ⚙ Tipografie rezumat
                  </button>
                  <button
                    type="button"
                    (click)="openArticleMainTypography()"
                    class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                    title="Setări tipografie articol principal: titlu și conținut"
                  >
                    ⚙ Tipografie articol
                  </button>
                </div>
              } @else {
                <p class="text-xs text-gray-400 mb-3">
                  Trage modulele pentru a le reordona. Poți fixa un articol pe fiecare poziție.
                </p>
              }

              <div cdkDropList (cdkDropListDropped)="onDrop($event)" class="space-y-3">
                @for (mod of layout.modules; track mod.id; let mi = $index) {
                  <div cdkDrag class="border border-gray-200 rounded-lg bg-gray-50">
                    <div
                      class="flex items-center gap-3 px-3 py-2.5 bg-white border-b border-gray-100 rounded-t-lg"
                    >
                      <span
                        cdkDragHandle
                        class="cursor-grab text-gray-300 hover:text-gray-500 select-none"
                        title="Trage pentru a reordona"
                      >
                        ⠿
                      </span>
                      <span class="text-sm font-medium text-gray-800 flex-1 min-w-0">
                        <input
                          type="text"
                          [ngModel]="mod.name"
                          (ngModelChange)="setModuleName(mi, $event)"
                          [placeholder]="moduleLabel(mod.type)"
                          class="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                        />
                      </span>
                      @if (isFullWidthOnly(mod.type)) {
                        <span
                          class="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded"
                          title="Coloana secundară se oprește la modulele pe lățime completă și continuă de unde a rămas."
                        >
                          Lățime completă
                        </span>
                      }
                      @if (mod.type === 'list') {
                        <label class="flex items-center gap-1.5 text-xs text-gray-500">
                          Articole:
                          <input
                            type="number"
                            min="1"
                            max="50"
                            [ngModel]="mod.count"
                            (ngModelChange)="setCount(mi, $event)"
                            class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                      }
                      @if (mod.type === 'grid') {
                        <label class="flex items-center gap-1.5 text-xs text-gray-500">
                          Articole:
                          <input
                            type="number"
                            min="1"
                            max="12"
                            [ngModel]="mod.count"
                            (ngModelChange)="setGridCount(mi, $event)"
                            class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                      }
                      @if (mod.type === 'slideshow' || mod.type === 'hero-slideshow') {
                        <label class="flex items-center gap-1.5 text-xs text-gray-500">
                          Slide-uri:
                          <input
                            type="number"
                            min="1"
                            max="10"
                            [ngModel]="mod.count"
                            (ngModelChange)="setSlideshowCount(mi, $event)"
                            class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                      }
                      @if (supportsShowSummary(mod.type)) {
                        <label
                          class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            [ngModel]="mod.showSummary"
                            (ngModelChange)="setModuleShowSummary(mi, $event)"
                            class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                          />
                          Afișează rezumat
                        </label>
                        @if (mod.showSummary) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                          >
                            Rânduri:
                            <input
                              type="number"
                              min="1"
                              max="8"
                              [ngModel]="mod.summaryRows"
                              (ngModelChange)="setModuleSummaryRows(mi, $event)"
                              class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                              placeholder="implicit"
                            />
                          </label>
                        }
                        <button
                          type="button"
                          (click)="openModuleSummaryTypography(mi)"
                          class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                          title="Setări tipografie pentru rezumat"
                        >
                          ⚙ Tipografie rezumat
                        </button>
                      }
                      @if (supportsShowCategory(mod.type)) {
                        <label
                          class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            [ngModel]="mod.showCategory"
                            (ngModelChange)="setModuleShowCategory(mi, $event)"
                            class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                          />
                          Afișează categoria
                        </label>
                      }
                      <button
                        type="button"
                        (click)="openModuleTypography(mi)"
                        class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                        title="Setări tipografie"
                      >
                        ⚙ Tipografie
                      </button>
                      <button
                        type="button"
                        (click)="removeModule(mi)"
                        class="text-gray-300 hover:text-red-600 transition-colors text-xl leading-none"
                        aria-label="Elimină modulul"
                      >
                        ×
                      </button>
                    </div>

                    @if (isRowsModule(mod.type)) {
                      <div class="px-3 py-3 space-y-3">
                        <div
                          cdkDropList
                          (cdkDropListDropped)="onRowDrop(mi, $event)"
                          class="space-y-3"
                        >
                          @for (row of mod.rows; track row.id; let ri = $index) {
                            <div cdkDrag class="border border-gray-200 rounded-lg bg-white">
                              <div
                                class="flex items-center gap-2 px-3 py-2 border-b border-gray-100"
                              >
                                <span
                                  cdkDragHandle
                                  class="cursor-grab text-gray-300 hover:text-gray-500 select-none"
                                  >⠿</span
                                >
                                <span class="text-xs font-medium text-gray-700 flex-1">
                                  {{
                                    row.kind === 'category' ? 'Rând categorie' : 'Rând personalizat'
                                  }}
                                </span>
                                <button
                                  type="button"
                                  (click)="removeRow(mi, ri)"
                                  class="text-gray-300 hover:text-red-600 transition-colors text-lg leading-none"
                                  aria-label="Elimină rândul"
                                >
                                  ×
                                </button>
                              </div>
                              <div class="px-3 py-3 space-y-3">
                                @if (row.kind === 'category') {
                                  <label class="block text-xs text-gray-500">
                                    Categorie
                                    <select
                                      [ngModel]="row.categoryId"
                                      (ngModelChange)="setRowCategoryId(mi, ri, $event)"
                                      class="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                      <option [ngValue]="null">— alege categorie —</option>
                                      @for (cat of categories(); track cat.id) {
                                        <option [ngValue]="cat.id">{{ cat.name }}</option>
                                      }
                                    </select>
                                  </label>
                                  <label class="block text-xs text-gray-500">
                                    Titlu afișat (opțional)
                                    <input
                                      type="text"
                                      [ngModel]="row.name"
                                      (ngModelChange)="setRowName(mi, ri, $event)"
                                      placeholder="Lasă gol pentru numele categoriei"
                                      class="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </label>
                                } @else {
                                  <label class="block text-xs text-gray-500">
                                    Nume rând (opțional)
                                    <input
                                      type="text"
                                      [ngModel]="row.name"
                                      (ngModelChange)="setRowName(mi, ri, $event)"
                                      placeholder="Lasă gol pentru a ascunde titlul"
                                      class="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </label>
                                }

                                <label class="block text-xs text-gray-500">
                                  Număr de rânduri identice
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    [ngModel]="row.repeatCount"
                                    (ngModelChange)="setRowRepeatCount(mi, ri, $event)"
                                    class="mt-1 w-24 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                  />
                                </label>

                                @if (activeTab() === 'home') {
                                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    @for (slot of row.slots; track $index; let si = $index) {
                                      <div>
                                        <cp-post-picker
                                          [label]="'Articol ' + (si + 1) + ' (gol = automat)'"
                                          [value]="slot.post"
                                          (selected)="setRowSlot(mi, ri, si, $event)"
                                        />
                                        <div
                                          class="flex items-center gap-4 mt-1 text-xs text-gray-500"
                                        >
                                          <label class="inline-flex items-center gap-1.5">
                                            <input
                                              type="checkbox"
                                              [ngModel]="slot.showAuthor"
                                              (ngModelChange)="
                                                setRowSlotShowAuthor(mi, ri, si, $event)
                                              "
                                              class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                            />
                                            Afișează autor
                                          </label>
                                          <label class="inline-flex items-center gap-1.5">
                                            <input
                                              type="checkbox"
                                              [ngModel]="slot.showDate"
                                              (ngModelChange)="
                                                setRowSlotShowDate(mi, ri, si, $event)
                                              "
                                              class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                            />
                                            Afișează data
                                          </label>
                                        </div>
                                      </div>
                                    }
                                  </div>
                                }
                              </div>
                            </div>
                          }
                        </div>

                        @if (mod.rows.length === 0) {
                          <p class="text-xs text-gray-400 text-center py-2">
                            Niciun rând configurat.
                          </p>
                        }

                        <div class="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            (click)="addCategoryRow(mi)"
                            class="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 transition-colors"
                          >
                            + Rând categorie
                          </button>
                          <button
                            type="button"
                            (click)="addCustomRow(mi)"
                            class="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 transition-colors"
                          >
                            + Rând personalizat
                          </button>
                        </div>
                      </div>
                    } @else if (activeTab() === 'home') {
                      <div class="px-3 py-3">
                        @if (mod.type === 'list') {
                          <details>
                            <summary class="text-xs text-gray-500 cursor-pointer select-none">
                              Articole fixate ({{ pinnedCount(mod) }} din {{ mod.slots.length }})
                            </summary>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              @for (slot of mod.slots; track $index; let si = $index) {
                                <cp-post-picker
                                  [label]="'Poziția ' + (si + 1) + ' (gol = automat)'"
                                  [value]="slot.post"
                                  (selected)="setSlot(mi, si, $event)"
                                />
                                <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  <label class="inline-flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      [ngModel]="slot.showAuthor"
                                      (ngModelChange)="setSlotShowAuthor(mi, si, $event)"
                                      class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                    />
                                    Afișează autor
                                  </label>
                                  <label class="inline-flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      [ngModel]="slot.showDate"
                                      (ngModelChange)="setSlotShowDate(mi, si, $event)"
                                      class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                    />
                                    Afișează data
                                  </label>
                                </div>
                              }
                            </div>
                          </details>
                        } @else {
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            @for (slot of mod.slots; track $index; let si = $index) {
                              <div>
                                <cp-post-picker
                                  [label]="slotLabel(mod.type, si)"
                                  [value]="slot.post"
                                  (selected)="setSlot(mi, si, $event)"
                                />
                                <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  <label class="inline-flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      [ngModel]="slot.showAuthor"
                                      (ngModelChange)="setSlotShowAuthor(mi, si, $event)"
                                      class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                    />
                                    Afișează autor
                                  </label>
                                  <label class="inline-flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      [ngModel]="slot.showDate"
                                      (ngModelChange)="setSlotShowDate(mi, si, $event)"
                                      class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                    />
                                    Afișează data
                                  </label>
                                </div>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
                @if (layout.modules.length === 0) {
                  <p class="text-sm text-gray-400 text-center py-4">
                    Niciun modul. Adaugă unul mai jos.
                  </p>
                }
              </div>

              <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                <span class="text-xs text-gray-500 self-center">Adaugă modul:</span>
                @for (def of moduleDefs; track def.type) {
                  <button
                    type="button"
                    (click)="addModule(def.type)"
                    class="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    + {{ def.label }}
                  </button>
                }
              </div>
            </section>
          }

          <!-- Sidebar -->
          <section class="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
            <h2 class="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              Coloana secundară (dreapta)
            </h2>
            <label class="flex items-center gap-2 text-sm text-gray-700 mb-3">
              <input
                type="checkbox"
                [ngModel]="layout.sidebarEnabled"
                (ngModelChange)="setSidebarEnabled($event)"
                class="rounded border-gray-300 text-red-700 focus:ring-red-500"
              />
              Afișează coloana secundară
            </label>

            @if (layout.sidebarEnabled) {
              <div class="mb-4">
                <p class="text-xs text-gray-500 mb-2">
                  Blocuri sidebar (ordonare + tipografie per bloc)
                </p>
                <div class="flex flex-wrap gap-2">
                  @for (def of sidebarBlockDefs; track def.mode) {
                    <button
                      type="button"
                      (click)="addSidebarBlock(def.mode)"
                      [disabled]="!sidebarCanAddBlock(def.mode)"
                      class="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + {{ def.label }}
                    </button>
                  }
                </div>
                <p class="text-[11px] text-gray-400 mt-2">
                  Regulă: „Listă completă” și „Împărțit pe categorii” nu pot fi folosite simultan.
                </p>
              </div>

              <div class="space-y-4">
                @for (
                  block of layout.sidebarBlocks;
                  track sidebarBlockTrack(block, bi);
                  let bi = $index
                ) {
                  <section class="rounded border border-gray-200 bg-gray-50">
                    <div
                      class="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white"
                    >
                      <span class="text-sm font-medium text-gray-700 flex-1">
                        {{ sidebarBlockLabel(block, layout) }}
                      </span>
                      <button
                        type="button"
                        (click)="moveSidebarBlock(bi, -1)"
                        [disabled]="bi === 0"
                        class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        (click)="moveSidebarBlock(bi, 1)"
                        [disabled]="bi === layout.sidebarBlocks.length - 1"
                        class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ↓
                      </button>
                      @if (supportsSidebarSummary(block, layout)) {
                        <label
                          class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            [ngModel]="sidebarSummarySettingsForBlock(block, layout).showSummary"
                            (ngModelChange)="setSidebarSummaryShow(block, $event)"
                            class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                          />
                          Afișează rezumat
                        </label>
                        @if (sidebarSummarySettingsForBlock(block, layout).showSummary !== false) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                          >
                            Rânduri:
                            <input
                              type="number"
                              min="1"
                              max="8"
                              [ngModel]="
                                sidebarSummarySettingsForBlock(block, layout).summaryRows ?? null
                              "
                              (ngModelChange)="setSidebarSummaryRows(block, $event)"
                              class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                              placeholder="implicit"
                            />
                          </label>
                        }
                        <button
                          type="button"
                          (click)="openSidebarSummaryTypography(block)"
                          class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                        >
                          ⚙ Tipografie rezumat
                        </button>
                      }
                      <button
                        type="button"
                        (click)="openSidebarTypography(block)"
                        class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                      >
                        ⚙ Tipografie
                      </button>
                      <button
                        type="button"
                        (click)="removeSidebarBlock(bi)"
                        class="px-2 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50"
                      >
                        Elimină
                      </button>
                    </div>

                    <div class="px-3 py-3 space-y-3">
                      @if (sidebarBlockMode(block) === 'video') {
                        <label class="block text-xs text-gray-500">
                          Număr videoclipuri
                          <input
                            type="number"
                            min="1"
                            max="50"
                            [ngModel]="layout.sidebarVideoCount"
                            (ngModelChange)="setSidebarVideoCount($event)"
                            class="mt-1 w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <div class="space-y-2">
                          <p class="text-xs text-gray-500">
                            Videoclipuri manuale (YouTube sau upload). Acestea apar primele.
                          </p>
                          @for (
                            video of layout.sidebarVideoItems;
                            track video.id;
                            let vi = $index
                          ) {
                            <div class="rounded border border-gray-200 bg-white p-2 space-y-2">
                              <label class="block text-xs text-gray-500">
                                Titlu (opțional)
                                <input
                                  type="text"
                                  maxlength="200"
                                  [ngModel]="video.title ?? ''"
                                  (ngModelChange)="setSidebarVideoItemTitle(video.id, $event)"
                                  class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                              </label>
                              <label class="block text-xs text-gray-500">
                                Link video
                                <input
                                  type="url"
                                  [ngModel]="video.url"
                                  (ngModelChange)="setSidebarVideoItemUrl(video.id, $event)"
                                  placeholder="https://youtube.com/... sau https://.../video.mp4"
                                  class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                              </label>
                              <div class="flex items-center gap-2">
                                <label
                                  class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 cursor-pointer"
                                >
                                  Upload video
                                  <input
                                    type="file"
                                    accept="video/*"
                                    class="hidden"
                                    [disabled]="uploadingSidebarVideoItemId() === video.id"
                                    (change)="onSidebarVideoFileSelected(video.id, $event)"
                                  />
                                </label>
                                @if (uploadingSidebarVideoItemId() === video.id) {
                                  <span class="text-xs text-gray-500">Se încarcă…</span>
                                }
                                <button
                                  type="button"
                                  (click)="removeSidebarVideoItem(video.id)"
                                  class="px-2 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50"
                                >
                                  Șterge
                                </button>
                              </div>
                            </div>
                          }
                          <button
                            type="button"
                            (click)="addSidebarVideoItem()"
                            class="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 transition-colors"
                          >
                            + Adaugă video manual
                          </button>
                        </div>
                      }

                      @if (isSidebarSlideshowEntry(block)) {
                        <label class="block text-xs text-gray-500">
                          Număr slide-uri
                          <input
                            type="number"
                            min="1"
                            max="10"
                            [ngModel]="layout.slideshowBlocks[block.id]?.count ?? 5"
                            (ngModelChange)="setSlideshowBlockCount(block.id, $event)"
                            class="mt-1 w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <label class="block text-xs text-gray-500">
                          Poziție text
                          <select
                            [ngModel]="layout.slideshowBlocks[block.id]?.textPosition ?? 'on-image'"
                            (ngModelChange)="setSlideshowBlockTextPosition(block.id, $event)"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="on-image">Pe imagine</option>
                            <option value="below-image">Sub imagine</option>
                          </select>
                        </label>
                      }

                      @if (sidebarBlockMode(block) === 'overlay-list') {
                        <label class="block text-xs text-gray-500">
                          Titlu secțiune
                          <input
                            type="text"
                            maxlength="100"
                            [ngModel]="layout.sidebarOverlayListTitle"
                            (ngModelChange)="setSidebarOverlayListTitle($event)"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <label class="block text-xs text-gray-500">
                          Număr articole
                          <input
                            type="number"
                            min="1"
                            max="50"
                            [ngModel]="layout.sidebarOverlayListCount"
                            (ngModelChange)="setSidebarOverlayListCount($event)"
                            class="mt-1 w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                      }

                      @if (sidebarBlockMode(block) === 'latest') {
                        <label class="block text-xs text-gray-500">
                          Număr articole
                          <input
                            type="number"
                            min="1"
                            max="50"
                            [ngModel]="layout.sidebarLatestCount"
                            (ngModelChange)="setSidebarLatestCount($event)"
                            class="mt-1 w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <label class="block text-xs text-gray-500">
                          Titlu secțiune
                          <input
                            type="text"
                            maxlength="100"
                            [ngModel]="layout.sidebarLatestTitle"
                            (ngModelChange)="setSidebarLatestTitle($event)"
                            placeholder="Lasă gol pentru a ascunde titlul"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                      }

                      @if (sidebarBlockMode(block) === 'article-list') {
                        <label class="block text-xs text-gray-500">
                          Titlu secțiune
                          <input
                            type="text"
                            maxlength="100"
                            [ngModel]="layout.sidebarArticleListTitle"
                            (ngModelChange)="setSidebarArticleListTitle($event)"
                            placeholder="Lasă gol pentru a ascunde titlul"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <label class="block text-xs text-gray-500">
                          Număr articole
                          <input
                            type="number"
                            min="1"
                            max="50"
                            [ngModel]="layout.sidebarArticleListCount"
                            (ngModelChange)="setSidebarArticleListCount($event)"
                            class="mt-1 w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                      }

                      @if (sidebarBlockMode(block) === 'most-viewed') {
                        <label class="block text-xs text-gray-500">
                          Titlu secțiune
                          <input
                            type="text"
                            maxlength="100"
                            [ngModel]="layout.sidebarMostViewedTitle"
                            (ngModelChange)="setSidebarMostViewedTitle($event)"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <label class="block text-xs text-gray-500">
                          Număr articole
                          <input
                            type="number"
                            min="1"
                            max="50"
                            [ngModel]="layout.sidebarMostViewedCount"
                            (ngModelChange)="setSidebarMostViewedCount($event)"
                            class="mt-1 w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                      }

                      @if (isSidebarSingleCategoryEntry(block)) {
                        <label class="block text-xs text-gray-500">
                          Categorie
                          <select
                            [ngModel]="layout.singleCategoryBlocks[block.id]?.categoryId ?? null"
                            (ngModelChange)="setSingleCategoryBlockCategoryId(block.id, $event)"
                            class="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option [ngValue]="null">— alege categorie —</option>
                            @for (cat of categories(); track cat.id) {
                              <option [ngValue]="cat.id">{{ cat.name }}</option>
                            }
                          </select>
                        </label>
                        <label class="block text-xs text-gray-500">
                          Număr articole
                          <input
                            type="number"
                            min="1"
                            max="50"
                            [ngModel]="layout.singleCategoryBlocks[block.id]?.count ?? 4"
                            (ngModelChange)="setSingleCategoryBlockCount(block.id, $event)"
                            class="mt-1 w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                      }

                      <div>
                        <p class="text-xs text-gray-500 mb-2">Setări metadate per poziție</p>
                        <div class="space-y-2">
                          @for (
                            slot of sidebarSlotsForBlock(layout, block);
                            track $index;
                            let si = $index
                          ) {
                            <div
                              class="flex items-center justify-between rounded border border-gray-200 px-3 py-2 bg-white"
                            >
                              <span class="text-xs text-gray-600"> Poziția {{ si + 1 }} </span>
                              <div class="flex items-center gap-4 text-xs text-gray-500">
                                <label class="inline-flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    [ngModel]="slot.showAuthor"
                                    (ngModelChange)="setSidebarSlotShowAuthor(block, si, $event)"
                                    class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                  />
                                  Afișează autor
                                </label>
                                <label class="inline-flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    [ngModel]="slot.showDate"
                                    (ngModelChange)="setSidebarSlotShowDate(block, si, $event)"
                                    class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                  />
                                  Afișează data
                                </label>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </section>
                }
                @if (layout.sidebarBlocks.length === 0) {
                  <p class="text-xs text-gray-400">
                    Niciun bloc în sidebar. Adaugă cel puțin unul.
                  </p>
                }
              </div>
            }
          </section>

          @if (layout.modules.length > 0 || layout.sidebarEnabled) {
            <section class="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
              <h2 class="text-sm font-semibold text-gray-700 mb-1 pb-2 border-b border-gray-100">
                Ordine mobil
              </h2>
              <p class="text-xs text-gray-400 mb-3">
                Ordinea secțiunilor pe telefon. Trage pentru a schimba prioritatea. Fiecare modul /
                bloc din pagina web apare o singură dată.
              </p>

              @if (layout.mobileOrder.length > 0) {
                <div cdkDropList (cdkDropListDropped)="onMobileOrderDrop($event)" class="space-y-2">
                  @for (unit of layout.mobileOrder; track mobileOrderTrack(unit)) {
                    <div
                      cdkDrag
                      class="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <span
                        cdkDragHandle
                        class="cursor-grab text-gray-300 hover:text-gray-500 select-none"
                        title="Trage pentru a reordona pe mobil"
                      >
                        ⠿
                      </span>
                      <span class="text-sm font-medium text-gray-800 flex-1 min-w-0 truncate">
                        {{ mobileOrderLabel(unit, layout) }}
                      </span>
                      <span
                        class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border"
                        [class.text-blue-700]="unit.kind === 'module'"
                        [class.bg-blue-50]="unit.kind === 'module'"
                        [class.border-blue-200]="unit.kind === 'module'"
                        [class.text-violet-700]="unit.kind === 'sidebar'"
                        [class.bg-violet-50]="unit.kind === 'sidebar'"
                        [class.border-violet-200]="unit.kind === 'sidebar'"
                      >
                        {{ unit.kind === 'module' ? 'Modul principal' : 'Coloana dreaptă' }}
                      </span>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-sm text-gray-400 text-center py-4">
                  Adaugă module sau activează coloana secundară mai sus.
                </p>
              }
            </section>
          }
        }
      }
    </div>

    @if (typographyTarget(); as target) {
      <cp-module-settings-modal
        [label]="typographyModalLabel()"
        [typography]="typographyModalValue()"
        [defaultTypography]="typographyModalDefaults()"
        [supportsContent]="typographyModalSupportsContent()"
        [supportsHeroTitle]="typographyModalSupportsHeroTitle()"
        [supportsCardTitle]="typographyModalSupportsCardTitle()"
        [supportsSmallTitle]="typographyModalSupportsSmallTitle()"
        [supportsRowHeader]="typographyModalSupportsRowHeader()"
        [supportsCategory]="typographyModalSupportsCategory()"
        [supportsMeta]="typographyModalSupportsMeta()"
        (saved)="onTypographySaved($event)"
        (closed)="closeTypographyModal()"
      />
    }
    @if (summaryTypographyTarget(); as summaryTarget) {
      <cp-summary-typography-modal
        [label]="summaryTypographyModalLabel()"
        [style]="summaryTypographyModalValue()"
        [defaultStyle]="summaryTypographyModalDefaults()"
        (saved)="onSummaryTypographySaved($event)"
        (closed)="closeSummaryTypographyModal()"
      />
    }
  `,
})
export class LayoutsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  readonly tabs: { id: LayoutPageId; label: string }[] = [
    { id: 'home', label: 'Pagina principală' },
    { id: 'category', label: 'Pagini categorie' },
    { id: 'article', label: 'Pagina articol' },
  ];
  readonly moduleDefs = MODULE_DEFS;
  readonly sidebarBlockDefs = SIDEBAR_BLOCK_DEFS;
  readonly sidebarBlockMode = sidebarBlockMode;
  readonly isSidebarSingleCategoryEntry = isSidebarSingleCategoryEntry;
  readonly isSidebarSlideshowEntry = isSidebarSlideshowEntry;

  loading = signal(true);
  saving = signal(false);
  activeTab = signal<LayoutPageId>('home');
  layouts = signal<Record<LayoutPageId, EditableLayout> | null>(null);
  categories = signal<AdminCategory[]>([]);
  typographyTarget = signal<TypographyTarget | null>(null);
  summaryTypographyTarget = signal<SummaryTypographyTarget | null>(null);
  siteDefaultSummaryRows = signal(3);
  uploadingSidebarVideoItemId = signal<string | null>(null);

  current = computed<EditableLayout | null>(() => this.layouts()?.[this.activeTab()] ?? null);

  ngOnInit() {
    this.api.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([]),
    });

    this.api.getSettings().subscribe({
      next: (settings) => {
        this.siteDefaultSummaryRows.set(
          Math.max(1, Math.min(8, Math.floor(Number(settings.defaultSummaryRows) || 3))),
        );
      },
      error: () => {},
    });

    this.api.getLayouts().subscribe({
      next: (data) => {
        this.layouts.set({
          home: this.toEditable(data, 'home'),
          category: this.toEditable(data, 'category'),
          article: this.toEditable(data, 'article'),
        });
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Eroare la încărcarea configurației.');
        this.loading.set(false);
      },
    });
  }

  private toEditable(data: AdminLayouts, page: LayoutPageId): EditableLayout {
    const config = data[page];
    const modules = config.modules.map((m) => {
      const legacyTypography = migrateLegacySummaryFromTypography(m.options?.typography ?? null);
      const count =
        m.type === 'slideshow' || m.type === 'hero-slideshow'
          ? Math.max(1, Math.min(10, m.options?.count ?? 5))
          : m.type === 'grid'
            ? Math.max(1, Math.min(12, m.options?.count ?? 4))
            : (m.options?.count ?? 10);
      const rawSlots = (m.slots as LayoutModuleSlot[]) ?? [];
      const slots = resizeSlots(
        rawSlots.map((slot) => slotFromConfig(slot, data.posts)),
        slotCount(m.type, count),
      );
      const rows: EditableRow[] = (m.options?.rows ?? []).map((row) => ({
        id: row.id,
        kind: row.kind,
        categoryId: row.categoryId ?? null,
        name: row.name ?? '',
        repeatCount: Math.max(1, Math.min(10, row.repeatCount ?? 1)),
        slots: resizeSlots(
          row.slots.map((slot) => slotFromConfig(slot, data.posts)),
          rowsSlotCount(m.type),
        ),
      }));
      return {
        id: m.id,
        type: m.type,
        name: m.options?.name ?? '',
        count,
        rows,
        slots,
        typography: legacyTypography.typography ?? null,
        showCategory: m.options?.showCategory ?? defaultModuleShowCategory(m.type),
        showSummary: m.options?.showSummary ?? true,
        summaryRows: m.options?.summaryRows ?? legacyTypography.summaryRows ?? null,
        summaryTypography:
          m.options?.summaryTypography ?? legacyTypography.summaryTypography ?? null,
      };
    });

    const articleLegacyTypography = migrateLegacySummaryFromTypography(
      config.articleMainTypography ?? null,
    );

    const sidebarEnabled = config.sidebar.enabled;

    const singleCategoryBlocks: Record<string, SingleCategoryBlockConfig> = {
      ...(config.sidebar.singleCategoryBlocks ?? {}),
    };
    for (const blockEntry of config.sidebar.blocks) {
      if (!isSidebarSingleCategoryEntry(blockEntry)) continue;
      if (!singleCategoryBlocks[blockEntry.id]) {
        singleCategoryBlocks[blockEntry.id] = {
          categoryId: config.sidebar.singleCategoryId ?? null,
          count: config.sidebar.singleCategoryCount ?? 4,
          slots: resizeDisplaySlots(
            config.sidebar.singleCategorySlots ?? [],
            SIDEBAR_FEED_SLOT_CAPACITY,
          ),
        };
      } else {
        singleCategoryBlocks[blockEntry.id] = {
          ...singleCategoryBlocks[blockEntry.id],
          slots: resizeDisplaySlots(
            singleCategoryBlocks[blockEntry.id].slots ?? [],
            SIDEBAR_FEED_SLOT_CAPACITY,
          ),
        };
      }
    }

    const slideshowBlocks = { ...(config.sidebar.slideshowBlocks ?? {}) };
    for (const blockEntry of config.sidebar.blocks) {
      if (!isSidebarSlideshowEntry(blockEntry)) continue;
      if (!slideshowBlocks[blockEntry.id]) {
        slideshowBlocks[blockEntry.id] = {
          count: config.sidebar.slideshowCount ?? 5,
          textPosition: config.sidebar.slideshowTextPosition ?? 'on-image',
          slots: resizeDisplaySlots(config.sidebar.latestSlots ?? [], 10),
        };
      } else {
        slideshowBlocks[blockEntry.id] = {
          ...slideshowBlocks[blockEntry.id],
          slots: resizeDisplaySlots(slideshowBlocks[blockEntry.id].slots ?? [], 10),
        };
      }
    }

    return {
      modules,
      moduleTypographyPresets: mergeModuleTypographyPresets(
        config.moduleTypographyPresets,
        deriveModuleTypographyPresets(modules),
      ),
      articleMainTypography: articleLegacyTypography.typography ?? null,
      articleMainShowSummary: config.articleMainShowSummary ?? true,
      articleMainSummaryRows:
        config.articleMainSummaryRows ?? articleLegacyTypography.summaryRows ?? null,
      articleMainSummaryTypography:
        config.articleMainSummaryTypography ?? articleLegacyTypography.summaryTypography ?? null,
      sidebarEnabled,
      sidebarBlocks: config.sidebar.blocks,
      sidebarSlideshowCount: Math.max(1, Math.min(10, config.sidebar.slideshowCount ?? 5)),
      sidebarLatestCount: Math.max(
        1,
        Math.min(SIDEBAR_FEED_MAX_COUNT, config.sidebar.latestCount ?? 10),
      ),
      sidebarVideoCount: Math.max(
        1,
        Math.min(SIDEBAR_FEED_MAX_COUNT, config.sidebar.videoCount ?? 5),
      ),
      sidebarVideoItems: (config.sidebar.videoItems ?? []).map((item) => ({
        id: item.id,
        title: item.title ?? null,
        url: item.url,
      })),
      sidebarOverlayListCount: Math.max(
        1,
        Math.min(SIDEBAR_FEED_MAX_COUNT, config.sidebar.overlayListCount ?? 5),
      ),
      sidebarLatestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE_DEFAULT,
      sidebarOverlayListTitle:
        config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT,
      sidebarArticleListCount: Math.max(
        1,
        Math.min(SIDEBAR_FEED_MAX_COUNT, config.sidebar.articleListCount ?? 5),
      ),
      sidebarArticleListTitle: config.sidebar.articleListTitle ?? 'Articole',
      sidebarMostViewedCount: Math.max(
        1,
        Math.min(SIDEBAR_FEED_MAX_COUNT, config.sidebar.mostViewedCount ?? 5),
      ),
      sidebarMostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
      sidebarSlideshowTextPosition: config.sidebar.slideshowTextPosition ?? 'on-image',
      sidebarLatestSlots: resizeDisplaySlots(
        config.sidebar.latestSlots ?? [],
        SIDEBAR_FEED_SLOT_CAPACITY,
      ),
      sidebarCategorySlots: resizeDisplaySlots(config.sidebar.categorySlots ?? [], 4),
      sidebarOverlayListSlots: resizeDisplaySlots(
        config.sidebar.overlayListSlots ?? [],
        SIDEBAR_FEED_SLOT_CAPACITY,
      ),
      sidebarArticleListSlots: resizeDisplaySlots(
        config.sidebar.articleListSlots ?? [],
        SIDEBAR_FEED_SLOT_CAPACITY,
      ),
      sidebarMostViewedSlots: resizeDisplaySlots(
        config.sidebar.mostViewedSlots ?? [],
        SIDEBAR_FEED_SLOT_CAPACITY,
      ),
      singleCategoryBlocks,
      slideshowBlocks,
      sidebarBlockTypography: config.sidebar.blockTypography ?? {},
      singleCategoryBlockTypography: config.sidebar.singleCategoryBlockTypography ?? {},
      slideshowBlockTypography: config.sidebar.slideshowBlockTypography ?? {},
      sidebarBlockSummarySettings: config.sidebar.blockSummarySettings ?? {},
      singleCategoryBlockSummarySettings: config.sidebar.singleCategoryBlockSummarySettings ?? {},
      slideshowBlockSummarySettings: config.sidebar.slideshowBlockSummarySettings ?? {},
      mobileOrder: syncMobileOrder(config.mobileOrder ?? [], config),
    };
  }

  typographyModalLabel(): string {
    const target = this.typographyTarget();
    const layout = this.current();
    if (!target || !layout) return '';
    if (target.kind === 'module') {
      const mod = layout.modules[target.moduleIndex];
      return mod ? this.moduleDisplayName(mod) : 'Modul';
    }
    if (target.kind === 'article-main') {
      return 'Articol principal (pagina articol)';
    }
    return this.typographyModalLabelForSidebar(target, layout);
  }

  private typographyModalLabelForSidebar(
    target: { block: SidebarMode; blockId?: string },
    layout: EditableLayout,
  ): string {
    if (target.blockId) {
      const blockEntry = layout.sidebarBlocks.find(
        (entry) =>
          (isSidebarSingleCategoryEntry(entry) && entry.id === target.blockId) ||
          (isSidebarSlideshowEntry(entry) && entry.id === target.blockId),
      );
      if (blockEntry && isSidebarSingleCategoryEntry(blockEntry)) {
        const catId = layout.singleCategoryBlocks[blockEntry.id]?.categoryId;
        const catName = catId ? this.categories().find((c) => c.id === catId)?.name : null;
        const base = SIDEBAR_BLOCK_DEFS.find((b) => b.mode === target.block)?.label ?? 'Sidebar';
        return catName ? `${base} — ${catName}` : base;
      }
      if (blockEntry && isSidebarSlideshowEntry(blockEntry)) {
        const base = SIDEBAR_BLOCK_DEFS.find((b) => b.mode === target.block)?.label ?? 'Sidebar';
        const slideshowIndex =
          layout.sidebarBlocks
            .filter(isSidebarSlideshowEntry)
            .findIndex((entry) => entry.id === target.blockId) + 1;
        return slideshowIndex > 1 ? `${base} ${slideshowIndex}` : base;
      }
    }
    return SIDEBAR_BLOCK_DEFS.find((b) => b.mode === target.block)?.label ?? 'Sidebar';
  }

  typographyModalValue(): ModuleTypography | null {
    const target = this.typographyTarget();
    const layout = this.current();
    if (!target || !layout) return null;
    if (target.kind === 'module') {
      return layout.modules[target.moduleIndex]?.typography ?? null;
    }
    if (target.kind === 'article-main') {
      return layout.articleMainTypography;
    }
    if (target.blockId) {
      if (target.block === 'slideshow') {
        return layout.slideshowBlockTypography[target.blockId] ?? null;
      }
      return layout.singleCategoryBlockTypography[target.blockId] ?? null;
    }
    return layout.sidebarBlockTypography[target.block] ?? null;
  }

  summaryTypographyModalLabel(): string {
    const target = this.summaryTypographyTarget();
    const layout = this.current();
    if (!target || !layout) return '';
    if (target.kind === 'module') {
      const mod = layout.modules[target.moduleIndex];
      return mod ? `${this.moduleDisplayName(mod)} — rezumat` : 'Rezumat';
    }
    if (target.kind === 'article-main') {
      return 'Articol principal — rezumat';
    }
    return `${this.typographyModalLabelForSidebar(target, layout)} — rezumat`;
  }

  summaryTypographyModalValue(): ModuleTypographyStyle | null {
    const target = this.summaryTypographyTarget();
    const layout = this.current();
    if (!target || !layout) return null;
    if (target.kind === 'module') {
      return layout.modules[target.moduleIndex]?.summaryTypography ?? null;
    }
    if (target.kind === 'article-main') {
      return layout.articleMainSummaryTypography;
    }
    if (target.blockId) {
      if (target.block === 'slideshow') {
        return (
          layout.slideshowBlockSummarySettings[target.blockId]?.summaryTypography ??
          layout.sidebarBlockSummarySettings.slideshow?.summaryTypography ??
          null
        );
      }
      return (
        layout.singleCategoryBlockSummarySettings[target.blockId]?.summaryTypography ??
        layout.sidebarBlockSummarySettings['single-category']?.summaryTypography ??
        null
      );
    }
    return layout.sidebarBlockSummarySettings[target.block]?.summaryTypography ?? null;
  }

  summaryTypographyModalDefaults(): ModuleTypographyStyle {
    const target = this.summaryTypographyTarget();
    const layout = this.current();
    if (!target || !layout) return LIST_SUMMARY_DEFAULT;
    if (target.kind === 'module') {
      const type = layout.modules[target.moduleIndex]?.type;
      return type ? SUMMARY_DEFAULTS_BY_MODULE[type] : LIST_SUMMARY_DEFAULT;
    }
    if (target.kind === 'article-main') {
      return ARTICLE_MAIN_SUMMARY_DEFAULT;
    }
    if (target.block === 'slideshow') {
      const textPosition = target.blockId
        ? (layout.slideshowBlocks[target.blockId]?.textPosition ??
          layout.sidebarSlideshowTextPosition)
        : layout.sidebarSlideshowTextPosition;
      return textPosition === 'below-image' ? SIDEBAR_SUMMARY_DEFAULT : OVERLAY_SUMMARY_DEFAULT;
    }
    return SIDEBAR_SUMMARY_DEFAULT;
  }

  typographyModalSupportsContent(): boolean {
    return this.typographyTarget()?.kind === 'article-main';
  }

  private typographyTargetModuleType(): ModuleType | null {
    const target = this.typographyTarget();
    const layout = this.current();
    if (!target || !layout || target.kind !== 'module') return null;
    return layout.modules[target.moduleIndex]?.type ?? null;
  }

  typographyModalSupportsSmallTitle(): boolean {
    const type = this.typographyTargetModuleType();
    return type ? moduleSupportsSmallTitle(type) : false;
  }

  typographyModalSupportsHeroTitle(): boolean {
    const type = this.typographyTargetModuleType();
    return type ? moduleSupportsHeroTitle(type) : false;
  }

  typographyModalSupportsCardTitle(): boolean {
    const target = this.typographyTarget();
    if (!target) return false;
    if (target.kind === 'module') {
      const type = this.typographyTargetModuleType();
      return type ? moduleSupportsCardTitle(type) : false;
    }
    if (target.kind === 'sidebar' || target.kind === 'article-main') return true;
    return false;
  }

  typographyModalSupportsRowHeader(): boolean {
    const type = this.typographyTargetModuleType();
    return type ? moduleSupportsRowHeader(type) : false;
  }

  typographyModalSupportsCategory(): boolean {
    const target = this.typographyTarget();
    if (!target) return false;
    if (target.kind === 'module') return true;
    if (target.kind === 'sidebar') return SIDEBAR_MODES_WITH_CATEGORY.has(target.block);
    return false;
  }

  typographyModalSupportsMeta(): boolean {
    const target = this.typographyTarget();
    if (!target) return false;
    if (target.kind === 'module') return true;
    if (target.kind === 'sidebar') return SIDEBAR_MODES_WITH_META.has(target.block);
    return false;
  }

  typographyModalDefaults(): ModuleTypography {
    const target = this.typographyTarget();
    const layout = this.current();
    if (!target || !layout) {
      return FALLBACK_TYPOGRAPHY_DEFAULTS;
    }
    if (target.kind === 'module') {
      const type = layout.modules[target.moduleIndex]?.type;
      return type ? TYPOGRAPHY_DEFAULTS_BY_MODULE[type] : FALLBACK_MODULE_TYPOGRAPHY_DEFAULTS;
    }
    if (target.kind === 'article-main') {
      return ARTICLE_MAIN_TYPOGRAPHY_DEFAULTS;
    }
    if (target.kind === 'sidebar' && target.block === 'slideshow') {
      const textPosition = target.blockId
        ? (layout.slideshowBlocks[target.blockId]?.textPosition ??
          layout.sidebarSlideshowTextPosition)
        : layout.sidebarSlideshowTextPosition;
      return textPosition === 'below-image'
        ? SIDEBAR_TYPOGRAPHY_DEFAULTS
        : SIDEBAR_SLIDESHOW_ON_IMAGE_TYPOGRAPHY_DEFAULTS;
    }
    if (
      target.kind === 'sidebar' &&
      (target.block === 'article-list' || target.block === 'most-viewed')
    ) {
      return TYPOGRAPHY_DEFAULTS_BY_MODULE['rows-3'];
    }
    return SIDEBAR_TYPOGRAPHY_DEFAULTS;
  }

  openModuleTypography(moduleIndex: number) {
    this.typographyTarget.set({ kind: 'module', moduleIndex });
  }

  openModuleSummaryTypography(moduleIndex: number) {
    this.summaryTypographyTarget.set({ kind: 'module', moduleIndex });
  }

  openSidebarTypography(block: SidebarBlockEntry) {
    const mode = sidebarBlockMode(block);
    const blockId =
      isSidebarSingleCategoryEntry(block) || isSidebarSlideshowEntry(block) ? block.id : undefined;
    this.typographyTarget.set({ kind: 'sidebar', block: mode, blockId });
  }

  openSidebarSummaryTypography(block: SidebarBlockEntry) {
    const mode = sidebarBlockMode(block);
    const blockId =
      isSidebarSingleCategoryEntry(block) || isSidebarSlideshowEntry(block) ? block.id : undefined;
    this.summaryTypographyTarget.set({ kind: 'sidebar', block: mode, blockId });
  }

  openArticleMainTypography() {
    this.typographyTarget.set({ kind: 'article-main' });
  }

  openArticleMainSummaryTypography() {
    this.summaryTypographyTarget.set({ kind: 'article-main' });
  }

  closeTypographyModal() {
    this.typographyTarget.set(null);
  }

  closeSummaryTypographyModal() {
    this.summaryTypographyTarget.set(null);
  }

  onTypographySaved(typography: ModuleTypography | null) {
    const target = this.typographyTarget();
    if (!target) return;
    const page = this.activeTab();
    let nextLayout: EditableLayout | null = null;

    this.updateCurrent((layout) => {
      if (target.kind === 'module') {
        const modules = [...layout.modules];
        const currentModule = modules[target.moduleIndex];
        if (!currentModule) {
          nextLayout = layout;
          return layout;
        }
        modules[target.moduleIndex] = {
          ...currentModule,
          typography,
        };
        const updated = {
          ...layout,
          modules,
          moduleTypographyPresets: rememberModuleTypographyPreset(
            layout.moduleTypographyPresets,
            currentModule.type,
            typography,
          ),
        };
        nextLayout = updated;
        return updated;
      }
      if (target.kind === 'article-main') {
        const updated = {
          ...layout,
          articleMainTypography: typography,
        };
        nextLayout = updated;
        return updated;
      }

      const sidebarBlockTypography = { ...layout.sidebarBlockTypography };
      const singleCategoryBlockTypography = { ...layout.singleCategoryBlockTypography };
      const slideshowBlockTypography = { ...layout.slideshowBlockTypography };
      if (target.blockId) {
        if (target.block === 'slideshow') {
          if (typography) {
            slideshowBlockTypography[target.blockId] = typography;
          } else {
            delete slideshowBlockTypography[target.blockId];
          }
        } else if (typography) {
          singleCategoryBlockTypography[target.blockId] = typography;
        } else {
          delete singleCategoryBlockTypography[target.blockId];
        }
      } else if (typography) {
        sidebarBlockTypography[target.block] = typography;
      } else {
        delete sidebarBlockTypography[target.block];
      }
      const updated = {
        ...layout,
        sidebarBlockTypography,
        singleCategoryBlockTypography,
        slideshowBlockTypography,
      };
      nextLayout = updated;
      return updated;
    });

    this.closeTypographyModal();

    if (!nextLayout) return;

    this.saving.set(true);
    this.api.saveLayout(page, this.toPageLayoutConfig(nextLayout)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Tipografie salvată.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Eroare la salvarea tipografiei. Încearcă din nou.');
      },
    });
  }

  onSummaryTypographySaved(style: ModuleTypographyStyle | null) {
    const target = this.summaryTypographyTarget();
    if (!target) return;
    const page = this.activeTab();
    let nextLayout: EditableLayout | null = null;

    this.updateCurrent((layout) => {
      if (target.kind === 'module') {
        const modules = [...layout.modules];
        const currentModule = modules[target.moduleIndex];
        if (!currentModule) {
          nextLayout = layout;
          return layout;
        }
        modules[target.moduleIndex] = {
          ...currentModule,
          summaryTypography: style,
        };
        const updated = { ...layout, modules };
        nextLayout = updated;
        return updated;
      }
      if (target.kind === 'article-main') {
        const updated = {
          ...layout,
          articleMainSummaryTypography: style,
        };
        nextLayout = updated;
        return updated;
      }

      const sidebarBlockSummarySettings = { ...layout.sidebarBlockSummarySettings };
      const singleCategoryBlockSummarySettings = { ...layout.singleCategoryBlockSummarySettings };
      const slideshowBlockSummarySettings = { ...layout.slideshowBlockSummarySettings };
      if (target.blockId) {
        if (target.block === 'slideshow') {
          const current = slideshowBlockSummarySettings[target.blockId] ?? {};
          if (style) {
            slideshowBlockSummarySettings[target.blockId] = {
              ...current,
              summaryTypography: style,
            };
          } else {
            const { summaryTypography: _ignored, ...rest } = current;
            slideshowBlockSummarySettings[target.blockId] = rest;
          }
        } else {
          const current = singleCategoryBlockSummarySettings[target.blockId] ?? {};
          if (style) {
            singleCategoryBlockSummarySettings[target.blockId] = {
              ...current,
              summaryTypography: style,
            };
          } else {
            const { summaryTypography: _ignored, ...rest } = current;
            singleCategoryBlockSummarySettings[target.blockId] = rest;
          }
        }
      } else {
        const current = sidebarBlockSummarySettings[target.block] ?? {};
        if (style) {
          sidebarBlockSummarySettings[target.block] = { ...current, summaryTypography: style };
        } else {
          const { summaryTypography: _ignored, ...rest } = current;
          sidebarBlockSummarySettings[target.block] = rest;
        }
      }

      const updated = {
        ...layout,
        sidebarBlockSummarySettings,
        singleCategoryBlockSummarySettings,
        slideshowBlockSummarySettings,
      };
      nextLayout = updated;
      return updated;
    });

    this.closeSummaryTypographyModal();
    if (!nextLayout) return;
    this.saving.set(true);
    this.api.saveLayout(page, this.toPageLayoutConfig(nextLayout)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Tipografie rezumat salvată.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Eroare la salvarea tipografiei rezumatului. Încearcă din nou.');
      },
    });
  }

  isFullWidthOnly(type: ModuleType): boolean {
    return FULL_WIDTH_TYPES.has(type);
  }

  isRowsModule(type: ModuleType): boolean {
    return isRowsModuleType(type);
  }

  /** All module types can toggle the category label on article cards. */
  supportsShowCategory(_type: ModuleType): boolean {
    return true;
  }

  /** Module types that render summary (excerpt) text and can toggle it. */
  supportsShowSummary(type: ModuleType): boolean {
    return moduleSupportsSummary(type);
  }

  moduleLabel(type: ModuleType): string {
    return MODULE_DEFS.find((d) => d.type === type)?.label ?? type;
  }

  moduleDisplayName(mod: EditableModule): string {
    return mod.name.trim() || this.moduleLabel(mod.type);
  }

  private normalizeSummaryRowsInput(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(1, Math.min(8, Math.floor(parsed)));
  }

  private updateSidebarSummarySettings(
    layout: EditableLayout,
    block: SidebarBlockEntry,
    updater: (current: SummaryDisplaySettings) => SummaryDisplaySettings,
  ): EditableLayout {
    const sidebarBlockSummarySettings = { ...layout.sidebarBlockSummarySettings };
    const singleCategoryBlockSummarySettings = { ...layout.singleCategoryBlockSummarySettings };
    const slideshowBlockSummarySettings = { ...layout.slideshowBlockSummarySettings };

    if (isSidebarSlideshowEntry(block)) {
      const current =
        slideshowBlockSummarySettings[block.id] ??
        sidebarBlockSummarySettings.slideshow ??
        ({} as SummaryDisplaySettings);
      slideshowBlockSummarySettings[block.id] = updater(current);
    } else if (isSidebarSingleCategoryEntry(block)) {
      const current =
        singleCategoryBlockSummarySettings[block.id] ??
        sidebarBlockSummarySettings['single-category'] ??
        ({} as SummaryDisplaySettings);
      singleCategoryBlockSummarySettings[block.id] = updater(current);
    } else {
      const mode = sidebarBlockMode(block);
      const current = sidebarBlockSummarySettings[mode] ?? ({} as SummaryDisplaySettings);
      sidebarBlockSummarySettings[mode] = updater(current);
    }

    return {
      ...layout,
      sidebarBlockSummarySettings,
      singleCategoryBlockSummarySettings,
      slideshowBlockSummarySettings,
    };
  }

  setModuleName(moduleIndex: number, name: string) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      modules[moduleIndex] = { ...modules[moduleIndex], name };
      return { ...l, modules };
    });
  }

  slotLabel(type: ModuleType, index: number): string {
    if (type === 'hero') return 'Articol principal (gol = automat)';
    if (type === 'hero-list' || type === 'hero-list-6') {
      return index === 0
        ? 'Articol principal (gol = automat)'
        : `Articol mic ${index} (gol = automat)`;
    }
    if (type === 'hero-top-list') {
      return index === 0
        ? 'Articol principal (imagine completă + text pe imagine)'
        : `Articol secundar ${index} (gol = automat)`;
    }
    if (type === 'hero-slideshow') return `Slide principal ${index + 1} (gol = automat)`;
    if (type === 'slideshow') return `Slide ${index + 1} (gol = automat)`;
    return `Articol ${index + 1} (gol = automat)`;
  }

  pinnedCount(mod: EditableModule): number {
    return mod.slots.filter((s) => s.post !== null).length;
  }

  private updateCurrent(fn: (layout: EditableLayout) => EditableLayout) {
    const all = this.layouts();
    if (!all) return;
    const tab = this.activeTab();
    this.layouts.set({ ...all, [tab]: fn(all[tab]) });
  }

  private updateCurrentWithMobileSync(fn: (layout: EditableLayout) => EditableLayout) {
    this.updateCurrent((layout) => {
      const next = fn(layout);
      return {
        ...next,
        mobileOrder: syncMobileOrder(next.mobileOrder, this.toPageLayoutConfig(next)),
      };
    });
  }

  mobileOrderTrack(unit: MobileLayoutUnit): string {
    return `${unit.kind}:${unit.ref}`;
  }

  mobileOrderLabel(unit: MobileLayoutUnit, layout: EditableLayout): string {
    if (unit.kind === 'module') {
      const mod = layout.modules.find((m) => m.id === unit.ref);
      return mod ? this.moduleDisplayName(mod) : unit.ref;
    }
    const block = layout.sidebarBlocks.find((entry) => sidebarBlockRef(entry) === unit.ref);
    return block ? this.sidebarBlockLabel(block, layout) : unit.ref;
  }

  onMobileOrderDrop(event: CdkDragDrop<unknown>) {
    this.updateCurrent((layout) => {
      const mobileOrder = [...layout.mobileOrder];
      moveItemInArray(mobileOrder, event.previousIndex, event.currentIndex);
      return { ...layout, mobileOrder };
    });
  }

  addModule(type: ModuleType) {
    const count =
      type === 'list'
        ? 10
        : type === 'slideshow' || type === 'hero-slideshow'
          ? 5
          : type === 'grid'
            ? 4
            : 0;
    this.updateCurrentWithMobileSync((l) => ({
      ...l,
      modules: [
        ...l.modules,
        {
          id: crypto.randomUUID(),
          type,
          name: '',
          count: count || 10,
          rows: [],
          slots: resizeSlots([], slotCount(type, count || 10)),
          typography: presetTypographyForType(l.moduleTypographyPresets, type),
          showCategory: defaultModuleShowCategory(type),
          showSummary: true,
          summaryRows: null,
          summaryTypography: null,
        },
      ],
    }));
  }

  setModuleShowCategory(moduleIndex: number, showCategory: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, showCategory } : m)),
    }));
  }

  setModuleShowSummary(moduleIndex: number, showSummary: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, showSummary } : m)),
    }));
  }

  setModuleSummaryRows(moduleIndex: number, value: number | null) {
    const summaryRows = this.normalizeSummaryRowsInput(value);
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, summaryRows } : m)),
    }));
  }

  setArticleMainShowSummary(showSummary: boolean) {
    this.updateCurrent((l) => ({ ...l, articleMainShowSummary: showSummary }));
  }

  setArticleMainSummaryRows(value: number | null) {
    const articleMainSummaryRows = this.normalizeSummaryRowsInput(value);
    this.updateCurrent((l) => ({ ...l, articleMainSummaryRows }));
  }

  removeModule(index: number) {
    this.updateCurrentWithMobileSync((l) => {
      const removed = l.modules[index];
      const moduleTypographyPresets = removed
        ? rememberModuleTypographyPreset(
            l.moduleTypographyPresets,
            removed.type,
            removed.typography,
          )
        : l.moduleTypographyPresets;
      return {
        ...l,
        moduleTypographyPresets,
        modules: l.modules.filter((_, i) => i !== index),
      };
    });
  }

  onDrop(event: CdkDragDrop<unknown>) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      moveItemInArray(modules, event.previousIndex, event.currentIndex);
      return { ...l, modules };
    });
  }

  setCount(index: number, value: number) {
    const count = Math.max(1, Math.min(50, Math.floor(Number(value) || 1)));
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === index ? { ...m, count, slots: resizeSlots(m.slots, count) } : m,
      ),
    }));
  }

  setSlideshowCount(index: number, value: number) {
    const count = Math.max(1, Math.min(10, Math.floor(Number(value) || 1)));
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === index ? { ...m, count, slots: resizeSlots(m.slots, count) } : m,
      ),
    }));
  }

  setGridCount(index: number, value: number) {
    const count = Math.max(1, Math.min(12, Math.floor(Number(value) || 1)));
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === index ? { ...m, count, slots: resizeSlots(m.slots, count) } : m,
      ),
    }));
  }

  addCategoryRow(moduleIndex: number) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === moduleIndex
          ? { ...m, rows: [...m.rows, defaultRow('category', rowsSlotCount(m.type))] }
          : m,
      ),
    }));
  }

  addCustomRow(moduleIndex: number) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === moduleIndex
          ? { ...m, rows: [...m.rows, defaultRow('custom', rowsSlotCount(m.type))] }
          : m,
      ),
    }));
  }

  removeRow(moduleIndex: number, rowIndex: number) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === moduleIndex ? { ...m, rows: m.rows.filter((_, ri) => ri !== rowIndex) } : m,
      ),
    }));
  }

  onRowDrop(moduleIndex: number, event: CdkDragDrop<unknown>) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const rows = [...m.rows];
        moveItemInArray(rows, event.previousIndex, event.currentIndex);
        return { ...m, rows };
      }),
    }));
  }

  setRowCategoryId(moduleIndex: number, rowIndex: number, categoryId: string | null) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const rows = [...m.rows];
        rows[rowIndex] = { ...rows[rowIndex], categoryId };
        return { ...m, rows };
      }),
    }));
  }

  setRowName(moduleIndex: number, rowIndex: number, name: string) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const rows = [...m.rows];
        rows[rowIndex] = { ...rows[rowIndex], name };
        return { ...m, rows };
      }),
    }));
  }

  setRowRepeatCount(moduleIndex: number, rowIndex: number, value: number) {
    const repeatCount = Math.max(1, Math.min(10, Math.floor(Number(value) || 1)));
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const rows = [...m.rows];
        rows[rowIndex] = { ...rows[rowIndex], repeatCount };
        return { ...m, rows };
      }),
    }));
  }

  setRowSlot(moduleIndex: number, rowIndex: number, slotIndex: number, post: PickedPost | null) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const rows = [...m.rows];
        const slots = [...rows[rowIndex].slots];
        slots[slotIndex] = { ...slots[slotIndex], post };
        rows[rowIndex] = { ...rows[rowIndex], slots };
        return { ...m, rows };
      }),
    }));
  }

  setRowSlotShowDate(moduleIndex: number, rowIndex: number, slotIndex: number, showDate: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const rows = [...m.rows];
        const slots = [...rows[rowIndex].slots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        rows[rowIndex] = { ...rows[rowIndex], slots };
        return { ...m, rows };
      }),
    }));
  }

  setRowSlotShowAuthor(
    moduleIndex: number,
    rowIndex: number,
    slotIndex: number,
    showAuthor: boolean,
  ) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const rows = [...m.rows];
        const slots = [...rows[rowIndex].slots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        rows[rowIndex] = { ...rows[rowIndex], slots };
        return { ...m, rows };
      }),
    }));
  }

  setSlot(moduleIndex: number, slotIndex: number, post: PickedPost | null) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const slots = [...m.slots];
        slots[slotIndex] = { ...slots[slotIndex], post };
        return { ...m, slots };
      }),
    }));
  }

  setSlotShowDate(moduleIndex: number, slotIndex: number, showDate: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const slots = [...m.slots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        return { ...m, slots };
      }),
    }));
  }

  setSlotShowAuthor(moduleIndex: number, slotIndex: number, showAuthor: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const slots = [...m.slots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        return { ...m, slots };
      }),
    }));
  }

  setSidebarEnabled(enabled: boolean) {
    this.updateCurrentWithMobileSync((l) => ({ ...l, sidebarEnabled: enabled }));
  }

  supportsSidebarSummary(block: SidebarBlockEntry, layout: EditableLayout): boolean {
    const mode = sidebarBlockMode(block);
    const textPosition = isSidebarSlideshowEntry(block)
      ? (layout.slideshowBlocks[block.id]?.textPosition ?? layout.sidebarSlideshowTextPosition)
      : layout.sidebarSlideshowTextPosition;
    return sidebarSupportsSummary(mode, textPosition);
  }

  sidebarSummarySettingsForBlock(
    block: SidebarBlockEntry,
    layout: EditableLayout,
  ): SummaryDisplaySettings {
    if (isSidebarSlideshowEntry(block)) {
      return (
        layout.slideshowBlockSummarySettings[block.id] ??
        layout.sidebarBlockSummarySettings.slideshow ??
        {}
      );
    }
    if (isSidebarSingleCategoryEntry(block)) {
      return (
        layout.singleCategoryBlockSummarySettings[block.id] ??
        layout.sidebarBlockSummarySettings['single-category'] ??
        {}
      );
    }
    return layout.sidebarBlockSummarySettings[sidebarBlockMode(block)] ?? {};
  }

  setSidebarSummaryShow(block: SidebarBlockEntry, showSummary: boolean) {
    this.updateCurrent((layout) =>
      this.updateSidebarSummarySettings(layout, block, (current) => ({ ...current, showSummary })),
    );
  }

  setSidebarSummaryRows(block: SidebarBlockEntry, value: number | null) {
    const summaryRows = this.normalizeSummaryRowsInput(value);
    this.updateCurrent((layout) =>
      this.updateSidebarSummarySettings(layout, block, (current) => ({ ...current, summaryRows })),
    );
  }

  sidebarBlockLabel(block: SidebarBlockEntry, layout?: EditableLayout): string {
    const mode = sidebarBlockMode(block);
    const base = SIDEBAR_BLOCK_DEFS.find((d) => d.mode === mode)?.label ?? mode;
    if (isSidebarSingleCategoryEntry(block) && layout) {
      const catId = layout.singleCategoryBlocks[block.id]?.categoryId;
      const catName = catId ? this.categories().find((c) => c.id === catId)?.name : null;
      return catName ? `${base} — ${catName}` : base;
    }
    if (isSidebarSlideshowEntry(block) && layout) {
      const slideshowIndex =
        layout.sidebarBlocks
          .filter(isSidebarSlideshowEntry)
          .findIndex((entry) => entry.id === block.id) + 1;
      return slideshowIndex > 1 ? `${base} ${slideshowIndex}` : base;
    }
    return base;
  }

  sidebarBlockTrack(block: SidebarBlockEntry, index: number): string {
    if (isSidebarSingleCategoryEntry(block)) return block.id;
    if (isSidebarSlideshowEntry(block)) return block.id;
    return `${sidebarBlockMode(block)}-${index}`;
  }

  sidebarHasBlock(mode: SidebarMode): boolean {
    return this.current()?.sidebarBlocks.some((b) => sidebarBlockMode(b) === mode) ?? false;
  }

  sidebarCanAddBlock(mode: SidebarMode): boolean {
    if (mode === 'single-category' || mode === 'slideshow') return true;
    const blocks = this.current()?.sidebarBlocks ?? [];
    if (blocks.some((b) => sidebarBlockMode(b) === mode)) return false;
    for (const [a, b] of SIDEBAR_CONFLICT_PAIRS) {
      if (
        (mode === a && blocks.some((entry) => sidebarBlockMode(entry) === b)) ||
        (mode === b && blocks.some((entry) => sidebarBlockMode(entry) === a))
      ) {
        return false;
      }
    }
    return true;
  }

  addSidebarBlock(mode: SidebarMode) {
    if (!this.sidebarCanAddBlock(mode)) return;
    if (mode === 'single-category') {
      const id = crypto.randomUUID();
      this.updateCurrentWithMobileSync((l) => ({
        ...l,
        sidebarBlocks: [...l.sidebarBlocks, { mode: 'single-category', id }],
        singleCategoryBlocks: {
          ...l.singleCategoryBlocks,
          [id]: {
            categoryId: null,
            count: 4,
            slots: resizeDisplaySlots([], SIDEBAR_FEED_SLOT_CAPACITY),
          },
        },
      }));
      return;
    }
    if (mode === 'slideshow') {
      const id = crypto.randomUUID();
      this.updateCurrentWithMobileSync((l) => ({
        ...l,
        sidebarBlocks: [...l.sidebarBlocks, { mode: 'slideshow', id }],
        slideshowBlocks: {
          ...l.slideshowBlocks,
          [id]: {
            count: 5,
            textPosition: 'on-image',
            slots: resizeDisplaySlots([], 10),
          },
        },
      }));
      return;
    }
    this.updateCurrentWithMobileSync((l) => ({ ...l, sidebarBlocks: [...l.sidebarBlocks, mode] }));
  }

  removeSidebarBlock(index: number) {
    this.updateCurrentWithMobileSync((l) => {
      const entry = l.sidebarBlocks[index];
      if (!entry) return l;
      const sidebarBlocks = l.sidebarBlocks.filter((_, i) => i !== index);
      if (isSidebarSingleCategoryEntry(entry)) {
        const singleCategoryBlocks = { ...l.singleCategoryBlocks };
        delete singleCategoryBlocks[entry.id];
        const singleCategoryBlockTypography = { ...l.singleCategoryBlockTypography };
        delete singleCategoryBlockTypography[entry.id];
        const singleCategoryBlockSummarySettings = { ...l.singleCategoryBlockSummarySettings };
        delete singleCategoryBlockSummarySettings[entry.id];
        return {
          ...l,
          sidebarBlocks,
          singleCategoryBlocks,
          singleCategoryBlockTypography,
          singleCategoryBlockSummarySettings,
        };
      }
      if (isSidebarSlideshowEntry(entry)) {
        const slideshowBlocks = { ...l.slideshowBlocks };
        delete slideshowBlocks[entry.id];
        const slideshowBlockTypography = { ...l.slideshowBlockTypography };
        delete slideshowBlockTypography[entry.id];
        const slideshowBlockSummarySettings = { ...l.slideshowBlockSummarySettings };
        delete slideshowBlockSummarySettings[entry.id];
        return {
          ...l,
          sidebarBlocks,
          slideshowBlocks,
          slideshowBlockTypography,
          slideshowBlockSummarySettings,
        };
      }
      return { ...l, sidebarBlocks };
    });
  }

  moveSidebarBlock(index: number, direction: -1 | 1) {
    this.updateCurrent((l) => {
      const next = index + direction;
      if (next < 0 || next >= l.sidebarBlocks.length) return l;
      const blocks = [...l.sidebarBlocks];
      const [item] = blocks.splice(index, 1);
      blocks.splice(next, 0, item);
      return { ...l, sidebarBlocks: blocks };
    });
  }

  setSidebarSlideshowCount(value: number) {
    const sidebarSlideshowCount = Math.max(1, Math.min(10, Math.floor(Number(value) || 1)));
    this.updateCurrent((l) => ({ ...l, sidebarSlideshowCount }));
  }

  setSlideshowBlockCount(blockId: string, value: number) {
    const count = Math.max(1, Math.min(10, Math.floor(Number(value) || 1)));
    this.updateCurrent((l) => {
      const current = l.slideshowBlocks[blockId] ?? {
        count: 5,
        textPosition: 'on-image' as SidebarSlideshowTextPosition,
        slots: resizeDisplaySlots([], 10),
      };
      return {
        ...l,
        slideshowBlocks: {
          ...l.slideshowBlocks,
          [blockId]: { ...current, count },
        },
      };
    });
  }

  setSlideshowBlockTextPosition(blockId: string, value: SidebarSlideshowTextPosition) {
    const textPosition = value === 'below-image' ? 'below-image' : 'on-image';
    this.updateCurrent((l) => {
      const current = l.slideshowBlocks[blockId] ?? {
        count: 5,
        textPosition: 'on-image' as SidebarSlideshowTextPosition,
        slots: resizeDisplaySlots([], 10),
      };
      return {
        ...l,
        slideshowBlocks: {
          ...l.slideshowBlocks,
          [blockId]: { ...current, textPosition },
        },
      };
    });
  }

  setSidebarVideoCount(value: number) {
    const sidebarVideoCount = Math.max(
      1,
      Math.min(SIDEBAR_FEED_MAX_COUNT, Math.floor(Number(value) || 1)),
    );
    this.updateCurrent((l) => ({ ...l, sidebarVideoCount }));
  }

  addSidebarVideoItem() {
    this.updateCurrent((l) => ({
      ...l,
      sidebarVideoItems: [
        ...l.sidebarVideoItems,
        { id: crypto.randomUUID(), title: null, url: '' },
      ],
    }));
  }

  removeSidebarVideoItem(itemId: string) {
    this.updateCurrent((l) => ({
      ...l,
      sidebarVideoItems: l.sidebarVideoItems.filter((item) => item.id !== itemId),
    }));
  }

  setSidebarVideoItemTitle(itemId: string, title: string) {
    this.updateCurrent((l) => ({
      ...l,
      sidebarVideoItems: l.sidebarVideoItems.map((item) =>
        item.id === itemId ? { ...item, title: title.trim() || null } : item,
      ),
    }));
  }

  setSidebarVideoItemUrl(itemId: string, url: string) {
    this.updateCurrent((l) => ({
      ...l,
      sidebarVideoItems: l.sidebarVideoItems.map((item) =>
        item.id === itemId ? { ...item, url: url.trim() } : item,
      ),
    }));
  }

  onSidebarVideoFileSelected(itemId: string, event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      this.toast.error('Fișierul selectat nu este un videoclip.');
      if (input) input.value = '';
      return;
    }

    this.uploadingSidebarVideoItemId.set(itemId);
    this.api.uploadMedia(file).subscribe({
      next: (uploaded) => {
        this.setSidebarVideoItemUrl(itemId, uploaded.url);
        this.toast.success('Video încărcat.');
        this.uploadingSidebarVideoItemId.set(null);
        if (input) input.value = '';
      },
      error: () => {
        this.toast.error('Eroare la încărcarea videoclipului.');
        this.uploadingSidebarVideoItemId.set(null);
        if (input) input.value = '';
      },
    });
  }

  setSidebarSlideshowTextPosition(value: SidebarSlideshowTextPosition) {
    const sidebarSlideshowTextPosition = value === 'below-image' ? 'below-image' : 'on-image';
    this.updateCurrent((l) => ({ ...l, sidebarSlideshowTextPosition }));
  }

  setSidebarOverlayListCount(value: number) {
    const sidebarOverlayListCount = Math.max(
      1,
      Math.min(SIDEBAR_FEED_MAX_COUNT, Math.floor(Number(value) || 1)),
    );
    this.updateCurrent((l) => ({ ...l, sidebarOverlayListCount }));
  }

  setSidebarLatestCount(value: number) {
    const sidebarLatestCount = Math.max(
      1,
      Math.min(SIDEBAR_FEED_MAX_COUNT, Math.floor(Number(value) || 1)),
    );
    this.updateCurrent((l) => ({ ...l, sidebarLatestCount }));
  }

  setSidebarLatestTitle(value: string) {
    this.updateCurrent((l) => ({ ...l, sidebarLatestTitle: value }));
  }

  setSidebarOverlayListTitle(value: string) {
    const sidebarOverlayListTitle = value.trim() || SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT;
    this.updateCurrent((l) => ({ ...l, sidebarOverlayListTitle }));
  }

  setSidebarArticleListCount(value: number) {
    const sidebarArticleListCount = Math.max(
      1,
      Math.min(SIDEBAR_FEED_MAX_COUNT, Math.floor(Number(value) || 1)),
    );
    this.updateCurrent((l) => ({ ...l, sidebarArticleListCount }));
  }

  setSidebarArticleListTitle(value: string) {
    this.updateCurrent((l) => ({ ...l, sidebarArticleListTitle: value }));
  }

  setSidebarMostViewedCount(value: number) {
    const sidebarMostViewedCount = Math.max(
      1,
      Math.min(SIDEBAR_FEED_MAX_COUNT, Math.floor(Number(value) || 1)),
    );
    this.updateCurrent((l) => ({ ...l, sidebarMostViewedCount }));
  }

  setSidebarMostViewedTitle(value: string) {
    const sidebarMostViewedTitle = value.trim() || SIDEBAR_MOST_VIEWED_TITLE_DEFAULT;
    this.updateCurrent((l) => ({ ...l, sidebarMostViewedTitle }));
  }

  setSingleCategoryBlockCount(blockId: string, value: number) {
    const count = Math.max(1, Math.min(SIDEBAR_FEED_MAX_COUNT, Math.floor(Number(value) || 1)));
    this.updateCurrent((l) => {
      const current = l.singleCategoryBlocks[blockId] ?? {
        categoryId: null,
        count: 4,
        slots: resizeDisplaySlots([], SIDEBAR_FEED_SLOT_CAPACITY),
      };
      return {
        ...l,
        singleCategoryBlocks: {
          ...l.singleCategoryBlocks,
          [blockId]: { ...current, count },
        },
      };
    });
  }

  setSingleCategoryBlockCategoryId(blockId: string, categoryId: string | null) {
    this.updateCurrent((l) => {
      const current = l.singleCategoryBlocks[blockId] ?? {
        categoryId: null,
        count: 4,
        slots: resizeDisplaySlots([], SIDEBAR_FEED_SLOT_CAPACITY),
      };
      return {
        ...l,
        singleCategoryBlocks: {
          ...l.singleCategoryBlocks,
          [blockId]: { ...current, categoryId },
        },
      };
    });
  }

  sidebarSlotsForBlock(layout: EditableLayout, entry: SidebarBlockEntry): LayoutDisplaySlot[] {
    const mode = sidebarBlockMode(entry);
    if (mode === 'categories') return layout.sidebarCategorySlots;
    if (mode === 'overlay-list') {
      return layout.sidebarOverlayListSlots.slice(0, layout.sidebarOverlayListCount);
    }
    if (mode === 'article-list') {
      return layout.sidebarArticleListSlots.slice(0, layout.sidebarArticleListCount);
    }
    if (mode === 'most-viewed') {
      return layout.sidebarMostViewedSlots.slice(0, layout.sidebarMostViewedCount);
    }
    if (isSidebarSingleCategoryEntry(entry)) {
      const config = layout.singleCategoryBlocks[entry.id];
      if (!config) return [];
      return config.slots.slice(0, config.count);
    }
    if (isSidebarSlideshowEntry(entry)) {
      const config = layout.slideshowBlocks[entry.id];
      if (!config) return [];
      return config.slots.slice(0, config.count);
    }
    if (mode === 'video') {
      return layout.sidebarLatestSlots.slice(0, layout.sidebarVideoCount);
    }
    if (mode === 'latest') {
      return layout.sidebarLatestSlots.slice(0, layout.sidebarLatestCount);
    }
    return layout.sidebarLatestSlots;
  }

  setSidebarSlotShowDate(entry: SidebarBlockEntry, slotIndex: number, showDate: boolean) {
    const mode = sidebarBlockMode(entry);
    this.updateCurrent((l) => {
      if (mode === 'latest' || mode === 'video') {
        const slots = [...l.sidebarLatestSlots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        return { ...l, sidebarLatestSlots: slots };
      }
      if (isSidebarSlideshowEntry(entry)) {
        const config = l.slideshowBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        return {
          ...l,
          slideshowBlocks: {
            ...l.slideshowBlocks,
            [entry.id]: { ...config, slots },
          },
        };
      }
      if (mode === 'overlay-list') {
        const slots = [...l.sidebarOverlayListSlots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        return { ...l, sidebarOverlayListSlots: slots };
      }
      if (mode === 'article-list') {
        const slots = [...l.sidebarArticleListSlots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        return { ...l, sidebarArticleListSlots: slots };
      }
      if (mode === 'most-viewed') {
        const slots = [...l.sidebarMostViewedSlots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        return { ...l, sidebarMostViewedSlots: slots };
      }
      if (isSidebarSingleCategoryEntry(entry)) {
        const config = l.singleCategoryBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        return {
          ...l,
          singleCategoryBlocks: {
            ...l.singleCategoryBlocks,
            [entry.id]: { ...config, slots },
          },
        };
      }
      const slots = [...l.sidebarCategorySlots];
      slots[slotIndex] = { ...slots[slotIndex], showDate };
      return { ...l, sidebarCategorySlots: slots };
    });
  }

  setSidebarSlotShowAuthor(entry: SidebarBlockEntry, slotIndex: number, showAuthor: boolean) {
    const mode = sidebarBlockMode(entry);
    this.updateCurrent((l) => {
      if (mode === 'latest' || mode === 'video') {
        const slots = [...l.sidebarLatestSlots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        return { ...l, sidebarLatestSlots: slots };
      }
      if (isSidebarSlideshowEntry(entry)) {
        const config = l.slideshowBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        return {
          ...l,
          slideshowBlocks: {
            ...l.slideshowBlocks,
            [entry.id]: { ...config, slots },
          },
        };
      }
      if (mode === 'overlay-list') {
        const slots = [...l.sidebarOverlayListSlots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        return { ...l, sidebarOverlayListSlots: slots };
      }
      if (mode === 'article-list') {
        const slots = [...l.sidebarArticleListSlots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        return { ...l, sidebarArticleListSlots: slots };
      }
      if (mode === 'most-viewed') {
        const slots = [...l.sidebarMostViewedSlots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        return { ...l, sidebarMostViewedSlots: slots };
      }
      if (isSidebarSingleCategoryEntry(entry)) {
        const config = l.singleCategoryBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        return {
          ...l,
          singleCategoryBlocks: {
            ...l.singleCategoryBlocks,
            [entry.id]: { ...config, slots },
          },
        };
      }
      const slots = [...l.sidebarCategorySlots];
      slots[slotIndex] = { ...slots[slotIndex], showAuthor };
      return { ...l, sidebarCategorySlots: slots };
    });
  }

  save() {
    const layout = this.current();
    if (!layout) return;
    const page = this.activeTab();
    const config = this.toPageLayoutConfig(layout);

    this.saving.set(true);
    this.api.saveLayout(page, config).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Configurație salvată cu succes.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Eroare la salvare. Încearcă din nou.');
      },
    });
  }

  private normalizeSidebarVideoItems(items: SidebarVideoItem[]): SidebarVideoItem[] {
    return items
      .map((item) => ({
        id: item.id,
        title: item.title?.trim() ? item.title.trim() : null,
        url: item.url.trim(),
      }))
      .filter((item) => {
        if (!item.url) return false;
        try {
          new URL(item.url);
          return true;
        } catch {
          return false;
        }
      });
  }

  private toPageLayoutConfig(layout: EditableLayout): PageLayoutConfig {
    return {
      modules: layout.modules.map((m) => {
        const moduleName = m.name.trim() || null;

        if (isRowsModuleType(m.type)) {
          const typography = normalizeModuleTypography(m.typography);
          return {
            id: m.id,
            type: m.type,
            options: {
              name: moduleName,
              rows: m.rows.map((row) => ({
                id: row.id,
                kind: row.kind,
                categoryId: row.kind === 'category' ? row.categoryId : null,
                name: row.name.trim() || null,
                repeatCount: row.repeatCount,
                slots: row.slots.map((slot) => ({
                  postId: slot.post?.id ?? null,
                  showDate: slot.showDate,
                  showAuthor: slot.showAuthor,
                })),
              })),
              ...(typography ? { typography } : {}),
              showCategory: m.showCategory,
              showSummary: m.showSummary,
              ...(m.summaryRows != null ? { summaryRows: m.summaryRows } : {}),
              ...(m.summaryTypography ? { summaryTypography: m.summaryTypography } : {}),
            },
            slots: [],
          };
        }

        const options: {
          name: string | null;
          count?: number;
          typography?: ModuleTypography;
          showSummary?: boolean;
          summaryRows?: number;
          summaryTypography?: ModuleTypographyStyle;
          showCategory?: boolean;
        } = { name: moduleName };
        if (
          m.type === 'list' ||
          m.type === 'grid' ||
          m.type === 'slideshow' ||
          m.type === 'hero-slideshow'
        ) {
          options.count = m.count;
        }
        if (moduleSupportsSummary(m.type)) {
          options.showSummary = m.showSummary;
          if (m.summaryRows != null) options.summaryRows = m.summaryRows;
          if (m.summaryTypography) options.summaryTypography = m.summaryTypography;
        }
        options.showCategory = m.showCategory;
        const typography = normalizeModuleTypography(m.typography);
        if (typography) {
          options.typography = typography;
        }

        return {
          id: m.id,
          type: m.type,
          options,
          slots: m.slots.map((slot) => ({
            postId: slot.post?.id ?? null,
            showDate: slot.showDate,
            showAuthor: slot.showAuthor,
          })),
        };
      }),
      sidebar: {
        enabled: layout.sidebarEnabled,
        blocks: layout.sidebarBlocks,
        slideshowCount: layout.sidebarSlideshowCount,
        latestCount: layout.sidebarLatestCount,
        videoCount: layout.sidebarVideoCount,
        videoItems: this.normalizeSidebarVideoItems(layout.sidebarVideoItems),
        overlayListCount: layout.sidebarOverlayListCount,
        latestTitle: layout.sidebarLatestTitle,
        overlayListTitle: layout.sidebarOverlayListTitle,
        articleListCount: layout.sidebarArticleListCount,
        articleListTitle: layout.sidebarArticleListTitle,
        mostViewedCount: layout.sidebarMostViewedCount,
        mostViewedTitle: layout.sidebarMostViewedTitle,
        slideshowTextPosition: layout.sidebarSlideshowTextPosition,
        latestSlots: layout.sidebarLatestSlots,
        categorySlots: layout.sidebarCategorySlots,
        overlayListSlots: layout.sidebarOverlayListSlots,
        articleListSlots: layout.sidebarArticleListSlots,
        mostViewedSlots: layout.sidebarMostViewedSlots,
        singleCategoryBlocks: layout.singleCategoryBlocks,
        slideshowBlocks: layout.slideshowBlocks,
        blockTypography: layout.sidebarBlockTypography,
        singleCategoryBlockTypography: layout.singleCategoryBlockTypography,
        slideshowBlockTypography: layout.slideshowBlockTypography,
        blockSummarySettings: layout.sidebarBlockSummarySettings,
        singleCategoryBlockSummarySettings: layout.singleCategoryBlockSummarySettings,
        slideshowBlockSummarySettings: layout.slideshowBlockSummarySettings,
      },
      articleMainTypography: normalizeModuleTypography(layout.articleMainTypography),
      articleMainShowSummary: layout.articleMainShowSummary,
      ...(layout.articleMainSummaryRows != null
        ? { articleMainSummaryRows: layout.articleMainSummaryRows }
        : {}),
      ...(layout.articleMainSummaryTypography
        ? { articleMainSummaryTypography: layout.articleMainSummaryTypography }
        : {}),
      moduleTypographyPresets: normalizeModuleTypographyPresets(layout.moduleTypographyPresets),
      mobileOrder: layout.mobileOrder,
    };
  }
}
