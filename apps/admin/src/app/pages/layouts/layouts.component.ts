import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { videoFileRejection, videoUploadErrorMessage } from '../../utils/media-upload';
import { PostPickerComponent, type PickedPost } from '../../components/post-picker.component';
import { ModuleSettingsModalComponent } from '../../components/module-settings-modal.component';
import { SummaryTypographyModalComponent } from '../../components/summary-typography-modal.component';
import { TickerBarsEditorComponent } from './ticker-bars-editor.component';
import {
  ARTICLE_LIST_DEFAULT_COUNT,
  ARTICLE_LIST_MAX_ITEMS,
  categoryColumnsSlotsPerColumn,
  deriveModuleTypographyPresets,
  isArticleListModuleType,
  isCategoryColumnsModuleType,
  isFullWidthModuleType,
  isPicturesModuleType,
  isSplitModuleType,
  normalizeArticleListCount,
  mergeModuleTypographyPresets,
  migrateLegacySummaryFromTypography,
  normalizeModuleColumnCount,
  normalizeModulePicturesCount,
  normalizeModuleSideCount,
  normalizeModuleSmallCount,
  normalizeModuleBackgroundColor,
  normalizeModuleTypography,
  normalizeModuleTypographyPresets,
  normalizeStickyBlocks,
  resolveStickyRanges,
  presetTypographyForType,
  rememberModuleTypographyPreset,
  stickyEntryForBlock,
  stickyLegacyMirror,
  standardModuleSlotCount,
  supportsModuleSideCount,
  type SidebarStickyBlock,
  type AdminCategory,
  type AdminLayouts,
  type LayoutDisplaySlot,
  type LayoutModuleSlot,
  type LayoutPageId,
  type ModuleColumnCount,
  type ModuleSideCount,
  type ModuleSmallCount,
  type ModuleTypography,
  type ModuleTypographyPresets,
  type ModuleTypographyStyle,
  type ModuleType,
  type PageLayoutConfig,
  type Rows4RowKind,
  type SidebarBlockEntry,
  type SidebarBlockBackgroundColor,
  type SidebarBlockSummarySettings,
  type SidebarBlockTypography,
  type SidebarMode,
  type SummaryDisplaySettings,
  type SidebarVideoItem,
  type SidebarSlideshowTextPosition,
  type SingleCategoryBlockConfig,
  type SlideshowBlockConfig,
  type FeaturedVideoBlockConfig,
  type FeaturedArticleBlockConfig,
  type FeaturedPhotoBlockConfig,
  type FeaturedStackBlockConfig,
  type MostViewedBlockConfig,
  type FeaturedVideoSource,
  defaultModuleShowCategory,
  defaultMobileModuleCount,
  defaultMobileModuleShowCategory,
  defaultMobileTextPosition,
  isSidebarSingleCategoryEntry,
  isSidebarSlideshowEntry,
  isSidebarFeaturedVideoEntry,
  isSidebarFeaturedArticleEntry,
  isSidebarFeaturedPhotoEntry,
  isSidebarFeaturedStackEntry,
  isSidebarMostViewedEntry,
  isSidebarMultiInstanceEntry,
  isSidebarMultiInstanceMode,
  mobileModuleSlotCount,
  normalizeMobileModuleTypographyPresets,
  normalizeMobileRowCount,
  normalizeMobileSideCount,
  presetMobileTypographyForType,
  rememberMobileModuleTypographyPreset,
  sidebarBlockMode,
  sidebarBlockRef,
  supportsMobileTextPosition,
  syncMobileOrder,
  SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT,
  SIDEBAR_LATEST_TITLE_DEFAULT,
  SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
  SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT,
  VIDEO_LIST_MAX_ITEMS,
  type ArticleLayoutMode,
  type MobileLayoutModule,
  type MobileLayoutUnit,
  type MobileModuleType,
  type MobileModuleTypographyPresets,
  type MobileTextPosition,
  type MostViewedPeriod,
  type PostDateFormat,
  DEFAULT_ARTICLE_LAYOUT_MODE,
  isPostDateFormat,
} from '@civicpress/shared';
import type { ModuleSettingsSavePayload } from '../../components/module-settings-modal.component';
import type { SummaryTypographySavePayload } from '../../components/summary-typography-modal.component';

type AspectTabId = LayoutPageId | 'tickers';

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

interface EditableCategoryColumn {
  id: string;
  categoryId: string | null;
  name: string;
  slots: EditableSlot[];
}

interface EditableModule {
  id: string;
  type: ModuleType;
  /** User-defined display title shown above the module on the public site (optional). */
  name: string;
  /**
   * Home-only: when set on non-rows modules, auto-fill uses posts from this category
   * and the category name is used as the module title when `name` is empty.
   */
  categoryId: string | null;
  /** Articles / pictures shown by `list`, `slideshow`, `grid`, or `pictures-7`. */
  count: number;
  /**
   * Small-item count (1–3) for hero-list variants.
   * Dual-column layouts use this count per side.
   */
  sideCount: ModuleSideCount;
  /** Column count (3–5) for `category-columns`. */
  columnCount: ModuleColumnCount;
  /** Small articles under the main one for `category-columns` (1–5). */
  smallCount: ModuleSmallCount;
  /** Rows for a `rows-3` / `rows-4` / `rows-5` module. */
  rows: EditableRow[];
  /** Columns for a `category-columns` module. */
  columns: EditableCategoryColumn[];
  /** Pinned articles per slot (home layout only). */
  slots: EditableSlot[];
  /** Optional text style override. */
  typography: ModuleTypography | null;
  /** Optional module section background (hex). Null = current look. */
  backgroundColor: string | null;
  /** When true, each article card shows its primary category on the meta row. */
  showCategory: boolean;
  /** Module-level date visibility (combined with per-slot flags). */
  showDate: boolean;
  /** Module-level author visibility (combined with per-slot flags). */
  showAuthor: boolean;
  /** List modules: when true, article summary text is displayed. */
  showSummary: boolean;
  /** When true, subtitle bumbi are displayed. */
  showBumbi: boolean;
  /** Optional per-module summary line clamp override. */
  summaryRows: number | null;
  /** Optional per-module summary typography override (small/default). */
  summaryTypography: ModuleTypographyStyle | null;
  /** Optional hero/large-article summary typography override. */
  heroSummaryTypography: ModuleTypographyStyle | null;
  /** Per-module date format override. Null = inherit site setting. */
  dateFormat: PostDateFormat | null;
  /** When true, show reading time next to the date. */
  showReadingTime: boolean;
  /** Manual videos for `video-list` (1 main + up to 10 side). */
  videoItems: SidebarVideoItem[];
  /** `split` only: title/meta left + media right on desktop. */
  splitReverse: boolean;
}

interface EditableMobileModule {
  id: string;
  type: MobileModuleType;
  name: string;
  categoryId: string | null;
  count: number;
  /** Rows (Y) for grid-2. */
  rowCount: number;
  /** Small items under hero for hero-list. */
  sideCount: number;
  textPosition: MobileTextPosition;
  slots: EditableSlot[];
  typography: ModuleTypography | null;
  /** Optional module section background (hex). Null = current look. */
  backgroundColor: string | null;
  showCategory: boolean;
  showDate: boolean;
  showAuthor: boolean;
  showSummary: boolean;
  showBumbi: boolean;
  summaryRows: number | null;
  summaryTypography: ModuleTypographyStyle | null;
  heroSummaryTypography: ModuleTypographyStyle | null;
  /** Per-module date format override. Null = inherit site setting. */
  dateFormat: PostDateFormat | null;
  /** When true, show reading time next to the date. */
  showReadingTime: boolean;
}

interface EditableLayout {
  modules: EditableModule[];
  /** Per module-type typography presets persisted in PageLayout.config. */
  moduleTypographyPresets: ModuleTypographyPresets;
  articleLayoutMode: ArticleLayoutMode;
  articleMainTypography: ModuleTypography | null;
  articleMainShowSummary: boolean;
  articleMainShowReadingTime: boolean;
  articleMainSummaryRows: number | null;
  articleMainSummaryTypography: ModuleTypographyStyle | null;
  articleMainBumbiTypography: ModuleTypographyStyle | null;
  articleMainPhotoCaptionTypography: ModuleTypographyStyle | null;
  sidebarEnabled: boolean;
  sidebarBlocks: SidebarBlockEntry[];
  /**
   * Sticky sidebar entries keyed by `blockIndex`. Earlier blocks need not be sticky.
   * On category pages from/until are null (stick until the bottom of the left column).
   */
  sidebarStickyBlocks: SidebarStickyBlock[];
  sidebarSlideshowCount: number;
  sidebarLatestCount: number;
  sidebarVideoCount: number;
  sidebarVideoItems: SidebarVideoItem[];
  sidebarOverlayListCount: number;
  sidebarLatestTitle: string;
  /** When true, Ultimele știri shows each article's category label. */
  sidebarLatestShowCategory: boolean;
  sidebarOverlayListTitle: string;
  sidebarArticleListCount: number;
  sidebarArticleListTitle: string;
  sidebarMostViewedCount: number;
  sidebarMostViewedTitle: string;
  sidebarMostViewedPeriod: MostViewedPeriod;
  /** When true, Cele mai citite shows each article's category label. */
  sidebarMostViewedShowCategory: boolean;
  /** Restrict Cele mai citite to one category. Null = all categories. */
  sidebarMostViewedCategoryId: string | null;
  sidebarSlideshowTextPosition: SidebarSlideshowTextPosition;
  sidebarLatestSlots: EditableSlot[];
  sidebarCategorySlots: EditableSlot[];
  sidebarOverlayListSlots: EditableSlot[];
  sidebarArticleListSlots: EditableSlot[];
  sidebarMostViewedSlots: EditableSlot[];
  /** Per-instance config for `single-category` sidebar blocks (keyed by block id). */
  singleCategoryBlocks: Record<
    string,
    { categoryId: string | null; count: number; slots: EditableSlot[] }
  >;
  /** Per-instance config for `slideshow` sidebar blocks (keyed by block id). */
  slideshowBlocks: Record<
    string,
    { count: number; textPosition: SidebarSlideshowTextPosition; slots: EditableSlot[] }
  >;
  featuredVideoBlocks: Record<string, FeaturedVideoBlockConfig & { post: PickedPost | null }>;
  featuredArticleBlocks: Record<string, FeaturedArticleBlockConfig & { post: PickedPost | null }>;
  featuredPhotoBlocks: Record<string, FeaturedPhotoBlockConfig>;
  featuredStackBlocks: Record<
    string,
    { title: string; secondaryCount: number; slots: EditableSlot[] }
  >;
  mostViewedBlocks: Record<
    string,
    {
      title: string;
      period: MostViewedPeriod;
      showCategory: boolean;
      categoryId: string | null;
      count: number;
      slots: EditableSlot[];
    }
  >;
  sidebarBlockTypography: SidebarBlockTypography;
  sidebarBlockBackgroundColor: SidebarBlockBackgroundColor;
  singleCategoryBlockTypography: Record<string, ModuleTypography>;
  singleCategoryBlockBackgroundColor: Record<string, string>;
  slideshowBlockTypography: Record<string, ModuleTypography>;
  slideshowBlockBackgroundColor: Record<string, string>;
  featuredVideoBlockTypography: Record<string, ModuleTypography>;
  featuredVideoBlockBackgroundColor: Record<string, string>;
  featuredArticleBlockTypography: Record<string, ModuleTypography>;
  featuredArticleBlockBackgroundColor: Record<string, string>;
  featuredPhotoBlockTypography: Record<string, ModuleTypography>;
  featuredPhotoBlockBackgroundColor: Record<string, string>;
  featuredStackBlockTypography: Record<string, ModuleTypography>;
  featuredStackBlockBackgroundColor: Record<string, string>;
  sidebarBlockSummarySettings: SidebarBlockSummarySettings;
  singleCategoryBlockSummarySettings: Record<string, SummaryDisplaySettings>;
  slideshowBlockSummarySettings: Record<string, SummaryDisplaySettings>;
  featuredArticleBlockSummarySettings: Record<string, SummaryDisplaySettings>;
  featuredStackBlockSummarySettings: Record<string, SummaryDisplaySettings>;
  mobileOrder: MobileLayoutUnit[];
  mobileModules: EditableMobileModule[];
  mobileModuleTypographyPresets: MobileModuleTypographyPresets;
}

type TypographyTarget =
  | { kind: 'module'; moduleIndex: number }
  | { kind: 'mobile-module'; moduleIndex: number }
  | { kind: 'sidebar'; block: SidebarMode; blockId?: string }
  | { kind: 'article-main' };

type SummaryTypographyTarget =
  | { kind: 'module'; moduleIndex: number }
  | { kind: 'mobile-module'; moduleIndex: number }
  | { kind: 'sidebar'; block: SidebarMode; blockId?: string }
  | { kind: 'article-main' }
  | { kind: 'article-main-kicker' }
  | { kind: 'article-main-bumbi' }
  | { kind: 'article-main-photo-caption' };

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

const ARTICLE_MAIN_KICKER_DEFAULT: ModuleTypographyStyle = {
  fontSize: 16,
  fontWeight: 400,
  color: '#4b5563',
};

const ARTICLE_MAIN_BUMBI_DEFAULT: ModuleTypographyStyle = {
  fontSize: 16,
  fontWeight: 400,
  color: '#374151',
};

const ARTICLE_MAIN_PHOTO_CAPTION_DEFAULT: ModuleTypographyStyle = {
  fontSize: 13,
  fontWeight: 400,
  color: '#6b7280',
};

const ARTICLE_MAIN_CONTENT_DEFAULT: ModuleTypographyStyle = {
  fontSize: 17,
  fontWeight: 400,
  color: '#1f2937',
  lineHeight: 1.7,
};

const LIST_SUMMARY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: '#374151',
};

const BUMBI_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: '#374151',
};

const HERO_BUMBI_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: '#4b5563',
};

const OVERLAY_BUMBI_DEFAULT: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: 'rgba(255,255,255,0.85)',
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
  backgroundColor: '#f3f4f6',
};

const TYPOGRAPHY_DEFAULTS_BY_MODULE: Readonly<Record<ModuleType, ModuleTypography>> = {
  hero: {
    heroTitle: HERO_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: HERO_CATEGORY_DEFAULT,
    meta: META_DEFAULT,
    bumbi: HERO_BUMBI_DEFAULT,
  },
  'hero-list': {
    heroTitle: HERO_TITLE_DEFAULT,
    smallTitle: SIDEBAR_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    heroCategory: HERO_CATEGORY_DEFAULT,
    category: CATEGORY_DEFAULT,
    heroMeta: META_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
    heroBumbi: HERO_BUMBI_DEFAULT,
  },
  'hero-list-6': {
    heroTitle: HERO_TITLE_DEFAULT,
    smallTitle: SIDEBAR_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    heroCategory: HERO_CATEGORY_DEFAULT,
    category: CATEGORY_DEFAULT,
    heroMeta: META_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
    heroBumbi: HERO_BUMBI_DEFAULT,
  },
  'hero-list-center': {
    heroTitle: HERO_TITLE_DEFAULT,
    smallTitle: SIDEBAR_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    heroCategory: HERO_CATEGORY_DEFAULT,
    category: CATEGORY_DEFAULT,
    heroMeta: META_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
    heroBumbi: HERO_BUMBI_DEFAULT,
  },
  'hero-top-list': {
    heroTitle: HERO_OVERLAY_TITLE_DEFAULT,
    smallTitle: NEWS_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    heroCategory: OVERLAY_CATEGORY_DEFAULT,
    category: CATEGORY_DEFAULT,
    heroMeta: OVERLAY_META_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
    heroBumbi: OVERLAY_BUMBI_DEFAULT,
  },
  'hero-slideshow': {
    heroTitle: HERO_OVERLAY_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: SLIDESHOW_CATEGORY_DEFAULT,
    meta: OVERLAY_META_DEFAULT,
    bumbi: OVERLAY_BUMBI_DEFAULT,
  },
  grid: {
    title: NEWS_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: CATEGORY_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
  },
  list: {
    title: NEWS_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: CATEGORY_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
  },
  'rows-3': {
    title: NEWS_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: ROWS_CATEGORY_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
  },
  'rows-4': {
    title: NEWS_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: ROWS_CATEGORY_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
  },
  'rows-4-sm': {
    title: ROWS4_SM_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: ROWS4_SM_CATEGORY_DEFAULT,
    meta: ROWS4_SM_META_DEFAULT,
    bumbi: { fontSize: 12, fontWeight: 400, color: '#374151' },
  },
  'rows-5': {
    title: NEWS_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: ROWS_CATEGORY_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
  },
  'pictures-7': {
    title: { fontSize: 10, fontWeight: 700, color: '#111827' },
    rowHeader: ROW_HEADER_DEFAULT,
    bumbi: { fontSize: 11, fontWeight: 400, color: '#374151' },
  },
  'category-columns': {
    title: NEWS_TITLE_DEFAULT,
    smallTitle: SIDEBAR_TITLE_DEFAULT,
    rowHeader: { fontSize: 16, fontWeight: 700, color: '#111827' },
    heroMeta: META_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
  },
  slideshow: {
    heroTitle: HERO_OVERLAY_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: SLIDESHOW_CATEGORY_DEFAULT,
    meta: OVERLAY_META_DEFAULT,
    bumbi: OVERLAY_BUMBI_DEFAULT,
  },
  'video-list': {
    heroTitle: HERO_TITLE_DEFAULT,
    smallTitle: SIDEBAR_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    bumbi: HERO_BUMBI_DEFAULT,
  },
  'article-list': {
    heroTitle: HERO_TITLE_DEFAULT,
    smallTitle: SIDEBAR_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    heroCategory: HERO_CATEGORY_DEFAULT,
    category: CATEGORY_DEFAULT,
    heroMeta: META_DEFAULT,
    meta: META_DEFAULT,
    bumbi: BUMBI_DEFAULT,
    heroBumbi: HERO_BUMBI_DEFAULT,
  },
  split: {
    heroTitle: HERO_TITLE_DEFAULT,
    rowHeader: ROW_HEADER_DEFAULT,
    category: HERO_CATEGORY_DEFAULT,
    kicker: { fontSize: 16, fontWeight: 400, color: '#4b5563' },
    meta: META_DEFAULT,
    bumbi: HERO_BUMBI_DEFAULT,
  },
};

const SIDEBAR_SUMMARY_DEFAULT: ModuleTypographyStyle = {
  fontSize: 16,
  fontWeight: 400,
  color: '#374151',
};

const SIDEBAR_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: SIDEBAR_TITLE_DEFAULT,
  rowHeader: { fontSize: 12, fontWeight: 700, color: '#1f2937', backgroundColor: '#f3f4f6' },
  category: { fontSize: 10, fontWeight: 700, color: '#4b5563' },
  meta: { fontSize: 11, fontWeight: 400, color: '#6b7280' },
  bumbi: { fontSize: 13, fontWeight: 400, color: '#374151' },
};

/** Featured photo in the right column — section header + title under the image. */
const FEATURED_PHOTO_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: { fontSize: 15, fontWeight: 700, color: '#1a1a1a' },
  rowHeader: { fontSize: 12, fontWeight: 700, color: '#1f2937', backgroundColor: '#f3f4f6' },
};

/** Featured sticky article in the right column — larger kicker + title. */
const FEATURED_ARTICLE_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  kicker: { fontSize: 16, fontWeight: 400, color: '#4b5563' },
  title: { fontSize: 22, fontWeight: 800, color: '#1a1a1a' },
  rowHeader: { fontSize: 12, fontWeight: 700, color: '#1f2937', backgroundColor: '#f3f4f6' },
  meta: { fontSize: 12, fontWeight: 400, color: '#6b7280' },
  bumbi: BUMBI_DEFAULT,
};

const ARTICLE_MAIN_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  category: { fontSize: 13, fontWeight: 700, color: '#4b5563' },
  kicker: ARTICLE_MAIN_KICKER_DEFAULT,
  title: ARTICLE_MAIN_TITLE_DEFAULT,
  author: { fontSize: 14, fontWeight: 500, color: '#111827' },
  date: { fontSize: 14, fontWeight: 400, color: '#6b7280' },
  views: { fontSize: 14, fontWeight: 400, color: '#6b7280' },
  content: ARTICLE_MAIN_CONTENT_DEFAULT,
};

const ARTICLE_LAYOUT_MODE_DEFS: { id: ArticleLayoutMode; label: string; hint: string }[] = [
  {
    id: 'classic',
    label: 'Clasic',
    hint: 'Categorie → kicker → titlu → rezumat → meta → media → body',
  },
  { id: 'media-first', label: 'Media întâi', hint: 'Imagine/video sus, apoi titlu și text' },
  { id: 'overlay-hero', label: 'Hero overlay', hint: 'Titlu peste imagine full-bleed' },
  { id: 'split', label: 'Split', hint: 'Media stânga, titlu/meta dreapta (desktop)' },
  {
    id: 'split-reverse',
    label: 'Split invers',
    hint: 'Titlu/meta stânga, media dreapta (desktop)',
  },
  {
    id: 'compact-news',
    label: 'Compact news',
    hint: 'Meta + titlu, fără rezumat implicit, body rapid',
  },
  { id: 'longform', label: 'Longform', hint: 'Titlu mare, lățime de lectură pentru conținut' },
];

/** Title-only defaults for sidebar slideshow with text on image (stable ref for modal inputs). */
const SIDEBAR_SLIDESHOW_ON_IMAGE_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: SIDEBAR_TITLE_DEFAULT,
};

const FALLBACK_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: NEWS_TITLE_DEFAULT,
};

const FALLBACK_MODULE_TYPOGRAPHY_DEFAULTS: ModuleTypography = {
  title: NEWS_TITLE_DEFAULT,
  rowHeader: ROW_HEADER_DEFAULT,
  bumbi: BUMBI_DEFAULT,
};

const SUMMARY_DEFAULTS_BY_MODULE: Readonly<Record<ModuleType, ModuleTypographyStyle>> = {
  hero: HERO_SUMMARY_DEFAULT,
  'hero-list': HERO_SUMMARY_DEFAULT,
  'hero-list-6': HERO_SUMMARY_DEFAULT,
  'hero-list-center': HERO_SUMMARY_DEFAULT,
  'hero-top-list': OVERLAY_SUMMARY_DEFAULT,
  'hero-slideshow': OVERLAY_SUMMARY_DEFAULT,
  grid: LIST_SUMMARY_DEFAULT,
  list: LIST_SUMMARY_DEFAULT,
  'rows-3': LIST_SUMMARY_DEFAULT,
  'rows-4': LIST_SUMMARY_DEFAULT,
  'rows-4-sm': ROWS4_SM_SUMMARY_DEFAULT,
  'rows-5': LIST_SUMMARY_DEFAULT,
  'pictures-7': LIST_SUMMARY_DEFAULT,
  'category-columns': LIST_SUMMARY_DEFAULT,
  slideshow: OVERLAY_SUMMARY_DEFAULT,
  'video-list': LIST_SUMMARY_DEFAULT,
  'article-list': HERO_SUMMARY_DEFAULT,
  split: HERO_SUMMARY_DEFAULT,
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
  { mode: 'featured-video', label: 'Modul video' },
  { mode: 'featured-article', label: 'Modul articole' },
  { mode: 'featured-photo', label: 'Modul foto' },
  { mode: 'featured-stack', label: 'Modul principal + secundare' },
];

const MOST_VIEWED_PERIOD_OPTIONS: { value: MostViewedPeriod; label: string }[] = [
  { value: '24h', label: 'Ultimele 24 de ore' },
  { value: '7d', label: 'Ultimele 7 zile' },
  { value: '30d', label: 'Ultimele 30 de zile' },
  { value: 'year', label: 'Anul curent' },
  { value: 'all', label: 'Tot timpul' },
];

const MODULE_DEFS: { type: ModuleType; label: string; fullWidthOnly?: boolean }[] = [
  { type: 'hero', label: '1 articol principal' },
  { type: 'hero-list', label: '1 principal + mici în dreapta' },
  {
    type: 'hero-list-6',
    label: '1 principal + mici în dreapta (lățime completă)',
    fullWidthOnly: true,
  },
  {
    type: 'hero-list-center',
    label: '1 principal pe mijloc + mici stânga/dreapta (lățime completă)',
    fullWidthOnly: true,
  },
  { type: 'hero-top-list', label: '1 principal sus + mici dedesubt' },
  { type: 'hero-slideshow', label: 'Principal pe poză (slideshow)' },
  { type: 'grid', label: '4 articole în grilă (2×2)' },
  { type: 'list', label: 'Listă de articole' },
  { type: 'rows-3', label: 'Rânduri de 3 (categorii / personalizate)' },
  { type: 'rows-4', label: 'Rânduri de 4 (categorii / personalizate)', fullWidthOnly: true },
  { type: 'rows-4-sm', label: 'Rânduri de 4 mici (categorii / personalizate)' },
  { type: 'rows-5', label: 'Rânduri de 5 (categorii / personalizate)', fullWidthOnly: true },
  { type: 'pictures-7', label: 'Imagini cu titlu pe poză (5–7)' },
  {
    type: 'category-columns',
    label: 'Coloane categorii (3–5 coloane)',
    fullWidthOnly: true,
  },
  { type: 'slideshow', label: 'Slideshow articole' },
  { type: 'video-list', label: '1 video + listă scroll (manual)' },
  { type: 'article-list', label: '1 articol + listă scroll' },
  { type: 'split', label: 'Split (1 articol)' },
];

const MOBILE_MODULE_DEFS: { type: MobileModuleType; label: string }[] = [
  { type: 'list-title-left', label: 'Titlu stânga, poză dreapta' },
  { type: 'list-title-right', label: 'Poză stânga, titlu dreapta' },
  { type: 'column', label: 'Pe o coloană' },
  { type: 'grid-2', label: 'De două coloane (2×Y)' },
  { type: 'slideshow', label: 'Slide' },
  { type: 'hero-list', label: 'Principal + listă' },
];

const SIDEBAR_MODES_WITHOUT_SUMMARY = new Set<SidebarMode>([
  'overlay-list',
  'featured-video',
  'featured-photo',
  'featured-stack',
]);
const SIDEBAR_CONFLICT_PAIRS: ReadonlyArray<readonly [SidebarMode, SidebarMode]> = [
  ['latest', 'categories'],
];
const SIDEBAR_FEED_MAX_COUNT = 50;
const SIDEBAR_FEED_SLOT_CAPACITY = 50;

function moduleSupportsSummary(type: ModuleType): boolean {
  return type !== 'pictures-7' && type !== 'category-columns' && type !== 'video-list';
}

/** Modules that render a hero overlay / slideshow title. */
function moduleSupportsHeroTitle(type: ModuleType): boolean {
  return (
    type === 'hero' ||
    type === 'hero-list' ||
    type === 'hero-list-6' ||
    type === 'hero-list-center' ||
    type === 'hero-top-list' ||
    type === 'hero-slideshow' ||
    type === 'slideshow' ||
    type === 'video-list' ||
    type === 'article-list' ||
    type === 'split'
  );
}

/** Modules that render card / list titles styled via --news-title. */
function moduleSupportsCardTitle(type: ModuleType): boolean {
  return (
    type === 'grid' ||
    type === 'list' ||
    type === 'rows-3' ||
    type === 'rows-4' ||
    type === 'rows-4-sm' ||
    type === 'rows-5' ||
    type === 'pictures-7' ||
    type === 'category-columns'
  );
}

/** Modules that render small secondary-article titles with their own typography. */
function moduleSupportsSmallTitle(type: ModuleType): boolean {
  return (
    supportsModuleSideCount(type) ||
    type === 'category-columns' ||
    type === 'video-list' ||
    type === 'article-list'
  );
}

/** All modules can show a section / category title above the cards. */
function moduleSupportsRowHeader(_type: ModuleType): boolean {
  return true;
}

/** Dual modules: separate category style for the large article. */
function moduleSupportsHeroCategory(type: ModuleType): boolean {
  return supportsModuleSideCount(type) || type === 'article-list';
}

/** Dual modules: separate meta style for the large article. */
function moduleSupportsHeroMeta(type: ModuleType): boolean {
  return supportsModuleSideCount(type) || type === 'category-columns' || type === 'article-list';
}

/** Dual modules with summaries: separate summary style for the large article. */
function moduleSupportsHeroSummary(type: ModuleType): boolean {
  return supportsModuleSideCount(type) || type === 'article-list';
}

/** Sidebar block modes whose rendering honours category typography vars. */
const SIDEBAR_MODES_WITH_CATEGORY = new Set<SidebarMode>(['latest', 'most-viewed']);

/** Sidebar block modes whose rendering honours meta typography vars. */
const SIDEBAR_MODES_WITH_META = new Set<SidebarMode>([
  'latest',
  'most-viewed',
  'overlay-list',
  'article-list',
  'featured-article',
  'featured-stack',
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
  return type === 'rows-3' || type === 'rows-4' || type === 'rows-4-sm' || type === 'rows-5';
}

function rowsSlotCount(type: ModuleType): number {
  if (type === 'rows-3') return 3;
  if (type === 'rows-4' || type === 'rows-4-sm') return 4;
  if (type === 'rows-5') return 5;
  return 0;
}

function slotCount(type: ModuleType, count: number, sideCount: ModuleSideCount = 3): number {
  const standard = standardModuleSlotCount(type, { count, sideCount });
  return standard ?? 0;
}

function defaultSlot(): EditableSlot {
  return { post: null, showDate: true, showAuthor: true };
}

function defaultCategoryColumn(slotsPerColumn: number): EditableCategoryColumn {
  return {
    id: crypto.randomUUID(),
    categoryId: null,
    name: '',
    slots: Array.from({ length: slotsPerColumn }, () => defaultSlot()),
  };
}

function resizeCategoryColumns(
  columns: EditableCategoryColumn[],
  columnCount: ModuleColumnCount,
  smallCount: ModuleSmallCount,
): EditableCategoryColumn[] {
  const slotsPerColumn = categoryColumnsSlotsPerColumn(smallCount);
  const next = columns.slice(0, columnCount).map((col) => ({
    ...col,
    slots: resizeSlots(col.slots, slotsPerColumn),
  }));
  while (next.length < columnCount) {
    next.push(defaultCategoryColumn(slotsPerColumn));
  }
  return next;
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

function mobileEditableSlotCount(
  mod: Pick<EditableMobileModule, 'type' | 'count' | 'rowCount' | 'sideCount'>,
): number {
  return mobileModuleSlotCount({
    id: 'tmp',
    type: mod.type,
    options: {
      count: mod.count,
      rowCount: mod.rowCount,
      sideCount: mod.sideCount,
    },
    slots: [],
  });
}

function slotFromConfig(
  slot: LayoutModuleSlot | LayoutDisplaySlot,
  posts: AdminLayouts['posts'],
): EditableSlot {
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

function toDisplaySlot(slot: EditableSlot, allowPin = true): LayoutDisplaySlot {
  return {
    postId: allowPin ? (slot.post?.id ?? null) : null,
    showDate: slot.showDate,
    showAuthor: slot.showAuthor,
  };
}

function displaySlotsFromConfig(
  slots: LayoutDisplaySlot[] | undefined,
  posts: AdminLayouts['posts'],
  size: number,
): EditableSlot[] {
  return resizeSlots(
    (slots ?? []).map((slot) => slotFromConfig(slot, posts)),
    size,
  );
}

/** Sidebar blocks where editors can pin a specific article per position. */
function sidebarSupportsArticlePinning(entry: SidebarBlockEntry): boolean {
  const mode = sidebarBlockMode(entry);
  return (
    mode === 'latest' ||
    mode === 'overlay-list' ||
    mode === 'article-list' ||
    mode === 'slideshow' ||
    mode === 'single-category' ||
    mode === 'featured-stack'
  );
}

const FEATURED_STACK_SLOT_CAPACITY = 11; // 1 main + up to 10 secondary

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
    TickerBarsEditorComponent,
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
        @if (activeTab() !== 'tickers') {
          <button
            type="button"
            (click)="save()"
            [disabled]="saving() || loading()"
            class="px-4 py-2 text-sm bg-red-700 text-white rounded hover:bg-red-800 transition-colors disabled:opacity-50 font-medium"
          >
            {{ saving() ? 'Se salvează…' : 'Salvează' }}
          </button>
        }
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

      @if (activeTab() === 'tickers') {
        <cp-ticker-bars-editor />
      } @else if (loading()) {
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
                <div class="mb-3 space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1"
                      >Layout articol</label
                    >
                    <select
                      [ngModel]="layout.articleLayoutMode"
                      (ngModelChange)="setArticleLayoutMode($event)"
                      class="w-full max-w-md px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      @for (mode of articleLayoutModeDefs; track mode.id) {
                        <option [ngValue]="mode.id">{{ mode.label }} — {{ mode.hint }}</option>
                      }
                    </select>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <label
                      class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                    >
                      <input
                        type="checkbox"
                        [ngModel]="layout.articleMainShowSummary"
                        (ngModelChange)="setArticleMainShowSummary($event)"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Afișează rezumat
                    </label>
                    <label
                      class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                    >
                      <input
                        type="checkbox"
                        [ngModel]="layout.articleMainShowReadingTime"
                        (ngModelChange)="setArticleMainShowReadingTime($event)"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Afișează timpul de citire
                    </label>
                    @if (layout.articleMainShowSummary) {
                      <label
                        class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                      >
                        Rânduri:
                        <input
                          type="number"
                          min="1"
                          [ngModel]="layout.articleMainSummaryRows"
                          (ngModelChange)="setArticleMainSummaryRows($event)"
                          class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="implicit"
                        />
                      </label>
                    }
                    <button
                      type="button"
                      (click)="openArticleMainKickerTypography()"
                      class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                      title="Setări tipografie pentru supratitlu"
                    >
                      ⚙ Tipografie supratitlu
                    </button>
                    <button
                      type="button"
                      (click)="openArticleMainSummaryTypography()"
                      class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                      title="Setări tipografie pentru rezumatul text (excerpt)"
                    >
                      ⚙ Tipografie rezumat
                    </button>
                    <button
                      type="button"
                      (click)="openArticleMainBumbiTypography()"
                      class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                      title="Setări tipografie pentru bumbii din subtitlu"
                    >
                      ⚙ Tipografie bumbi
                    </button>
                    <button
                      type="button"
                      (click)="openArticleMainPhotoCaptionTypography()"
                      class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                      title="Setări tipografie pentru explicațiile foto"
                    >
                      ⚙ Tipografie explicație foto
                    </button>
                    <button
                      type="button"
                      (click)="openArticleMainTypography()"
                      class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                      title="Setări tipografie articol: categorie, supratitlu, titlu, autor, dată, views, conținut"
                    >
                      ⚙ Tipografie articol
                    </button>
                  </div>
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
                      class="flex flex-col gap-2 px-3 py-2.5 bg-white border-b border-gray-100 rounded-t-lg"
                    >
                      <div class="flex items-center gap-3">
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
                            [placeholder]="
                              activeTab() === 'home' &&
                              !isRowsModule(mod.type) &&
                              !isCategoryColumnsModule(mod.type)
                                ? 'Titlu afișat (opțional)'
                                : moduleLabel(mod.type)
                            "
                            class="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                            [title]="moduleLabel(mod.type)"
                          />
                        </span>
                        @if (isFullWidthOnly(mod)) {
                          <span
                            class="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0"
                            title="Coloana secundară se oprește la modulele pe lățime completă și continuă de unde a rămas."
                          >
                            Lățime completă
                          </span>
                        }
                        <button
                          type="button"
                          (click)="removeModule(mi)"
                          class="text-gray-300 hover:text-red-600 transition-colors text-xl leading-none shrink-0"
                          aria-label="Elimină modulul"
                        >
                          ×
                        </button>
                      </div>
                      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 pl-7">
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
                        @if (isArticleListModule(mod.type)) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500"
                            title="1 articol principal + restul în lista din dreapta (scroll)"
                          >
                            Articole:
                            <input
                              type="number"
                              min="1"
                              [max]="articleListMaxItems"
                              [ngModel]="mod.count"
                              (ngModelChange)="setArticleListCount(mi, $event)"
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
                        @if (supportsSideCount(mod.type)) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                            [title]="sideCountHint(mod.type)"
                          >
                            {{ sideCountLabel(mod.type) }}:
                            <select
                              [ngModel]="mod.sideCount"
                              (ngModelChange)="setSideCount(mi, $event)"
                              class="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            >
                              <option [ngValue]="1">1</option>
                              <option [ngValue]="2">2</option>
                              <option [ngValue]="3">3</option>
                            </select>
                          </label>
                        }
                        @if (isPicturesModule(mod.type)) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                            title="5 imagini rămân lângă coloana secundară; 6 și 7 ocupă lățimea completă."
                          >
                            Imagini:
                            <select
                              [ngModel]="mod.count"
                              (ngModelChange)="setPicturesCount(mi, $event)"
                              class="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            >
                              <option [ngValue]="5">5</option>
                              <option [ngValue]="6">6</option>
                              <option [ngValue]="7">7</option>
                            </select>
                          </label>
                        }
                        @if (isCategoryColumnsModule(mod.type)) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                          >
                            Coloane:
                            <select
                              [ngModel]="mod.columnCount"
                              (ngModelChange)="setColumnCount(mi, $event)"
                              class="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            >
                              <option [ngValue]="3">3</option>
                              <option [ngValue]="4">4</option>
                              <option [ngValue]="5">5</option>
                            </select>
                          </label>
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                            title="Articole mici sub articolul principal, în fiecare coloană"
                          >
                            Articole mici:
                            <select
                              [ngModel]="mod.smallCount"
                              (ngModelChange)="setSmallCount(mi, $event)"
                              class="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            >
                              <option [ngValue]="1">1</option>
                              <option [ngValue]="2">2</option>
                              <option [ngValue]="3">3</option>
                              <option [ngValue]="4">4</option>
                              <option [ngValue]="5">5</option>
                            </select>
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
                        <label
                          class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            [ngModel]="mod.showBumbi"
                            (ngModelChange)="setModuleShowBumbi(mi, $event)"
                            class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                          />
                          Afișează bumbi (subtitlu)
                        </label>
                        <label
                          class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                        >
                          Dată:
                          <select
                            [ngModel]="mod.dateFormat"
                            (ngModelChange)="setModuleDateFormat(mi, $event)"
                            class="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                          >
                            <option [ngValue]="null">implicit (setare site)</option>
                            <option [ngValue]="'time-if-today'">oră dacă e azi</option>
                            <option [ngValue]="'always-date'">întotdeauna data</option>
                          </select>
                        </label>
                        @if (supportsShowDateAuthor(mod.type)) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                          >
                            <input
                              type="checkbox"
                              [ngModel]="mod.showReadingTime"
                              (ngModelChange)="setModuleShowReadingTime(mi, $event)"
                              class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                            />
                            Afișează timpul de citire
                          </label>
                        }
                        @if (
                          activeTab() === 'home' &&
                          !isRowsModule(mod.type) &&
                          !isCategoryColumnsModule(mod.type) &&
                          !isVideoListModule(mod.type)
                        ) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                          >
                            Categorie:
                            <select
                              [ngModel]="mod.categoryId"
                              (ngModelChange)="setModuleCategoryId(mi, $event)"
                              class="max-w-[160px] px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                              title="Doar articole din această categorie; titlul modulului folosește numele categoriei dacă nu e setat un titlu custom"
                            >
                              <option [ngValue]="null">— orice —</option>
                              @for (cat of categories(); track cat.id) {
                                <option [ngValue]="cat.id">{{ cat.name }}</option>
                              }
                            </select>
                          </label>
                        }
                        @if (isSplitModule(mod.type)) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                          >
                            Aspect:
                            <select
                              [ngModel]="mod.splitReverse ? 'reverse' : 'default'"
                              (ngModelChange)="setModuleSplitReverse(mi, $event === 'reverse')"
                              class="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            >
                              <option value="default">Media stânga, text dreapta</option>
                              <option value="reverse">Text stânga, media dreapta</option>
                            </select>
                          </label>
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
                        @if (activeTab() !== 'home' && supportsShowDateAuthor(mod.type)) {
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                          >
                            <input
                              type="checkbox"
                              [ngModel]="mod.showAuthor"
                              (ngModelChange)="setModuleShowAuthor(mi, $event)"
                              class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                            />
                            Afișează autor
                          </label>
                          <label
                            class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                          >
                            <input
                              type="checkbox"
                              [ngModel]="mod.showDate"
                              (ngModelChange)="setModuleShowDate(mi, $event)"
                              class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                            />
                            Afișează data
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
                      </div>
                    </div>

                    @if (isCategoryColumnsModule(mod.type)) {
                      <div class="px-3 py-3 space-y-3">
                        <div
                          cdkDropList
                          (cdkDropListDropped)="onColumnDrop(mi, $event)"
                          class="space-y-3"
                        >
                          @for (col of mod.columns; track col.id; let ci = $index) {
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
                                  Coloana {{ ci + 1 }}
                                </span>
                              </div>
                              <div class="px-3 py-3 space-y-3">
                                <label class="block text-xs text-gray-500">
                                  Categorie
                                  <select
                                    [ngModel]="col.categoryId"
                                    (ngModelChange)="setColumnCategoryId(mi, ci, $event)"
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
                                    [ngModel]="col.name"
                                    (ngModelChange)="setColumnName(mi, ci, $event)"
                                    placeholder="Lasă gol pentru numele categoriei"
                                    class="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                  />
                                </label>

                                @if (activeTab() === 'home') {
                                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    @for (slot of col.slots; track $index; let si = $index) {
                                      <div>
                                        <cp-post-picker
                                          [label]="
                                            si === 0
                                              ? 'Articol principal (gol = automat)'
                                              : 'Articol mic ' + si + ' (gol = automat)'
                                          "
                                          [value]="slot.post"
                                          (selected)="setColumnSlot(mi, ci, si, $event)"
                                        />
                                        <div
                                          class="flex items-center gap-4 mt-1 text-xs text-gray-500"
                                        >
                                          <label class="inline-flex items-center gap-1.5">
                                            <input
                                              type="checkbox"
                                              [ngModel]="slot.showAuthor"
                                              (ngModelChange)="
                                                setColumnSlotShowAuthor(mi, ci, si, $event)
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
                                                setColumnSlotShowDate(mi, ci, si, $event)
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
                      </div>
                    } @else if (isRowsModule(mod.type)) {
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
                    } @else if (isVideoListModule(mod.type)) {
                      <div class="px-3 py-3 space-y-2">
                        <p class="text-xs text-gray-500">
                          Configurează manual 1 video principal + până la 10 în listă (scroll pe
                          site). Titlu, categorie și URL/upload sunt obligatorii — se creează un
                          articol publicat pentru fiecare video.
                        </p>
                        @for (video of mod.videoItems; track video.id; let vi = $index) {
                          <div class="rounded border border-gray-200 bg-white p-2 space-y-2">
                            <div class="flex items-center justify-between gap-2">
                              <span class="text-xs font-medium text-gray-700">
                                {{ vi === 0 ? 'Video principal' : 'Video listă · ' + vi }}
                              </span>
                              <button
                                type="button"
                                (click)="removeModuleVideoItem(mi, video.id)"
                                class="px-2 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50"
                              >
                                Șterge
                              </button>
                            </div>
                            <label class="block text-xs text-gray-500">
                              Titlu (obligatoriu)
                              <input
                                type="text"
                                maxlength="200"
                                [ngModel]="video.title ?? ''"
                                (ngModelChange)="setModuleVideoItemTitle(mi, video.id, $event)"
                                class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                            </label>
                            <label class="block text-xs text-gray-500">
                              Categorie (obligatoriu)
                              <select
                                [ngModel]="video.categoryId ?? null"
                                (ngModelChange)="setModuleVideoItemCategoryId(mi, video.id, $event)"
                                class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <option [ngValue]="null">— alege categorie —</option>
                                @for (cat of categories(); track cat.id) {
                                  <option [ngValue]="cat.id">{{ cat.name }}</option>
                                }
                              </select>
                            </label>
                            <label class="block text-xs text-gray-500">
                              Link video
                              <input
                                type="url"
                                [ngModel]="video.url"
                                (ngModelChange)="setModuleVideoItemUrl(mi, video.id, $event)"
                                placeholder="https://youtube.com/... sau https://.../video.mp4"
                                class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                            </label>
                            <div class="flex flex-wrap items-center gap-2">
                              <label
                                class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 cursor-pointer"
                              >
                                Upload video
                                <input
                                  type="file"
                                  accept="video/*"
                                  class="hidden"
                                  [disabled]="
                                    creatingVideoPostKey() === 'module:' + mod.id + ':' + video.id
                                  "
                                  (change)="onModuleVideoFileSelected(mi, video.id, $event)"
                                />
                              </label>
                              @if (creatingVideoPostKey() === 'module:' + mod.id + ':' + video.id) {
                                <span class="text-xs text-gray-500">Se creează articolul…</span>
                              } @else if (video.postId) {
                                <span class="text-xs text-green-700">Articol creat</span>
                              } @else {
                                <span class="text-xs text-amber-700"
                                  >Completează titlu, categorie și URL</span
                                >
                              }
                            </div>
                          </div>
                        }
                        <button
                          type="button"
                          (click)="addModuleVideoItem(mi)"
                          [disabled]="mod.videoItems.length >= videoListMaxItems"
                          class="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50"
                        >
                          + Adaugă video
                          @if (mod.videoItems.length > 0) {
                            ({{ mod.videoItems.length }}/{{ videoListMaxItems }})
                          }
                        </button>
                      </div>
                    } @else if (activeTab() === 'home') {
                      <div class="px-3 py-3">
                        @if (mod.type === 'list' || isArticleListModule(mod.type)) {
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
                                  [label]="slotLabel(mod.type, si, mod.sideCount)"
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
                      <label
                        class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                      >
                        Dată:
                        <select
                          [ngModel]="
                            sidebarSummarySettingsForBlock(block, layout).dateFormat ?? null
                          "
                          (ngModelChange)="setSidebarDateFormat(block, $event)"
                          class="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        >
                          <option [ngValue]="null">implicit (setare site)</option>
                          <option [ngValue]="'time-if-today'">oră dacă e azi</option>
                          <option [ngValue]="'always-date'">întotdeauna data</option>
                        </select>
                      </label>
                      <label
                        class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                      >
                        <input
                          type="checkbox"
                          [ngModel]="
                            sidebarSummarySettingsForBlock(block, layout).showReadingTime ?? false
                          "
                          (ngModelChange)="setSidebarShowReadingTime(block, $event)"
                          class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                        />
                        Afișează timpul de citire
                      </label>
                      @if (supportsSidebarSummary(block, layout) || supportsSidebarBumbi(block)) {
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
                        }
                        <label
                          class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            [ngModel]="
                              sidebarSummarySettingsForBlock(block, layout).showBumbi ??
                              (supportsSidebarSummary(block, layout)
                                ? sidebarSummarySettingsForBlock(block, layout).showSummary !==
                                  false
                                : false)
                            "
                            (ngModelChange)="setSidebarBumbiShow(block, $event)"
                            class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                          />
                          Afișează bumbi (subtitlu)
                        </label>
                        @if (supportsSidebarSummary(block, layout)) {
                          @if (
                            sidebarSummarySettingsForBlock(block, layout).showSummary !== false
                          ) {
                            <label
                              class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                            >
                              Rânduri:
                              <input
                                type="number"
                                min="1"
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
                      @if (canConfigureSidebarSticky(layout, bi)) {
                        <div class="rounded border border-gray-200 bg-white p-3 space-y-2">
                          <label class="flex items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              [ngModel]="isSidebarBlockSticky(layout, bi)"
                              (ngModelChange)="setSidebarBlockSticky(bi, $event)"
                              class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                            />
                            Rămâne fix la scroll
                          </label>
                          @if (isSidebarBlockSticky(layout, bi)) {
                            @if (sidebarStickyUntilBottomOnly()) {
                              <p class="text-[11px] text-gray-400">
                                Blocul rămâne vizibil până jos, cât derulezi conținutul din stânga.
                                Doar pe desktop.
                              </p>
                            } @else {
                              <label class="block text-xs text-gray-500">
                                De la modulul din stânga
                                <select
                                  [ngModel]="stickyFromModuleSelectValue(layout, bi)"
                                  (ngModelChange)="setSidebarStickyFromModuleId(bi, $event)"
                                  class="mt-1 block w-full max-w-md px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  @for (mod of stickyFromModuleOptions(layout, bi); track mod.id) {
                                    <option [ngValue]="mod.id">
                                      {{ stickyUntilOptionLabel(layout, mod) }}
                                    </option>
                                  }
                                </select>
                              </label>
                              <label class="block text-xs text-gray-500">
                                Până la modulul din stânga
                                <select
                                  [ngModel]="stickyUntilModuleSelectValue(layout, bi)"
                                  (ngModelChange)="setSidebarStickyUntilModuleId(bi, $event)"
                                  class="mt-1 block w-full max-w-md px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  @for (mod of stickyUntilModuleOptions(layout, bi); track mod.id) {
                                    <option [ngValue]="mod.id">
                                      {{ stickyUntilOptionLabel(layout, mod) }}
                                    </option>
                                  }
                                </select>
                              </label>
                              <p class="text-[11px] text-gray-400">
                                Blocul rămâne lângă modulele din stânga din intervalul ales
                                (inclusiv). Ca să stea doar lângă un modul, alege același modul la
                                start și la final. Doar pe desktop.
                              </p>
                            }
                          }
                        </div>
                      }
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
                            Videoclipuri manuale (YouTube sau upload). Apar primele. Titlu +
                            categorie + URL creează un articol publicat (rămâne în CMS dacă ștergi
                            itemul).
                          </p>
                          @for (
                            video of layout.sidebarVideoItems;
                            track video.id;
                            let vi = $index
                          ) {
                            <div class="rounded border border-gray-200 bg-white p-2 space-y-2">
                              <label class="block text-xs text-gray-500">
                                Titlu (obligatoriu)
                                <input
                                  type="text"
                                  maxlength="200"
                                  [ngModel]="video.title ?? ''"
                                  (ngModelChange)="setSidebarVideoItemTitle(video.id, $event)"
                                  class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                              </label>
                              <label class="block text-xs text-gray-500">
                                Categorie (obligatoriu)
                                <select
                                  [ngModel]="video.categoryId ?? null"
                                  (ngModelChange)="setSidebarVideoItemCategoryId(video.id, $event)"
                                  class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <option [ngValue]="null">— alege categorie —</option>
                                  @for (cat of categories(); track cat.id) {
                                    <option [ngValue]="cat.id">{{ cat.name }}</option>
                                  }
                                </select>
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
                              <div class="flex flex-wrap items-center gap-2">
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
                                } @else if (creatingVideoPostKey() === 'sidebar:' + video.id) {
                                  <span class="text-xs text-gray-500">Se creează articolul…</span>
                                } @else if (video.postId) {
                                  <span class="text-xs text-green-700">Articol creat</span>
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

                      @if (isSidebarFeaturedVideoEntry(block)) {
                        <label class="block text-xs text-gray-500">
                          Denumire (opțional)
                          <input
                            type="text"
                            maxlength="100"
                            [ngModel]="layout.featuredVideoBlocks[block.id]?.title ?? ''"
                            (ngModelChange)="setFeaturedVideoTitle(block.id, $event)"
                            placeholder="ex. Video-ul zilei"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <fieldset class="space-y-2">
                          <legend class="text-xs text-gray-500 mb-1">Sursă video</legend>
                          <div class="flex flex-wrap gap-3 text-xs text-gray-700">
                            <label class="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name="featured-video-source-{{ block.id }}"
                                value="link"
                                [ngModel]="layout.featuredVideoBlocks[block.id]?.source ?? 'link'"
                                (ngModelChange)="setFeaturedVideoSource(block.id, $event)"
                              />
                              Link
                            </label>
                            <label class="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name="featured-video-source-{{ block.id }}"
                                value="upload"
                                [ngModel]="layout.featuredVideoBlocks[block.id]?.source ?? 'link'"
                                (ngModelChange)="setFeaturedVideoSource(block.id, $event)"
                              />
                              Upload
                            </label>
                            <label class="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name="featured-video-source-{{ block.id }}"
                                value="livestream"
                                [ngModel]="layout.featuredVideoBlocks[block.id]?.source ?? 'link'"
                                (ngModelChange)="setFeaturedVideoSource(block.id, $event)"
                              />
                              YouTube Live
                            </label>
                            <label class="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name="featured-video-source-{{ block.id }}"
                                value="post"
                                [ngModel]="layout.featuredVideoBlocks[block.id]?.source ?? 'link'"
                                (ngModelChange)="setFeaturedVideoSource(block.id, $event)"
                              />
                              Select articol
                            </label>
                          </div>
                        </fieldset>
                        @if (
                          (layout.featuredVideoBlocks[block.id]?.source ?? 'link') === 'livestream'
                        ) {
                          <label class="block text-xs text-gray-500">
                            Titlu (opțional)
                            <input
                              type="text"
                              maxlength="200"
                              [ngModel]="layout.featuredVideoBlocks[block.id]?.videoTitle ?? ''"
                              (ngModelChange)="setFeaturedVideoArticleTitle(block.id, $event)"
                              placeholder="ex. Conferință live"
                              class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </label>
                          <label class="block text-xs text-gray-500">
                            Link YouTube Live
                            <input
                              type="url"
                              [ngModel]="layout.featuredVideoBlocks[block.id]?.url ?? ''"
                              (ngModelChange)="setFeaturedVideoUrl(block.id, $event)"
                              placeholder="https://www.youtube.com/live/... sau https://www.youtube.com/watch?v=..."
                              class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </label>
                          <p class="text-[11px] text-gray-400">
                            Acceptă youtube.com/live/…, watch?v=… sau youtube.com/channel/UC…/live.
                            Transmisia apare în sidebar, fără articol nou.
                          </p>
                        } @else if (
                          (layout.featuredVideoBlocks[block.id]?.source ?? 'link') !== 'post'
                        ) {
                          <label class="block text-xs text-gray-500">
                            Titlu articol (obligatoriu)
                            <input
                              type="text"
                              maxlength="200"
                              [ngModel]="layout.featuredVideoBlocks[block.id]?.videoTitle ?? ''"
                              (ngModelChange)="setFeaturedVideoArticleTitle(block.id, $event)"
                              placeholder="Titlul articolului video"
                              class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </label>
                          <label class="block text-xs text-gray-500">
                            Categorie (obligatoriu)
                            <select
                              [ngModel]="layout.featuredVideoBlocks[block.id]?.categoryId ?? null"
                              (ngModelChange)="setFeaturedVideoCategoryId(block.id, $event)"
                              class="mt-1 w-full max-w-xs px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <option [ngValue]="null">— alege categorie —</option>
                              @for (cat of categories(); track cat.id) {
                                <option [ngValue]="cat.id">{{ cat.name }}</option>
                              }
                            </select>
                          </label>
                          @if (
                            (layout.featuredVideoBlocks[block.id]?.source ?? 'link') === 'link'
                          ) {
                            <label class="block text-xs text-gray-500">
                              Link video
                              <input
                                type="url"
                                [ngModel]="layout.featuredVideoBlocks[block.id]?.url ?? ''"
                                (ngModelChange)="setFeaturedVideoUrl(block.id, $event)"
                                placeholder="https://youtube.com/... sau https://.../video.mp4"
                                class="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                            </label>
                          }
                          @if (
                            (layout.featuredVideoBlocks[block.id]?.source ?? 'link') === 'upload'
                          ) {
                            <div class="flex items-center gap-2">
                              <label
                                class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 cursor-pointer"
                              >
                                Upload video
                                <input
                                  type="file"
                                  accept="video/*"
                                  class="hidden"
                                  [disabled]="uploadingFeaturedVideoId() === block.id"
                                  (change)="onFeaturedVideoFileSelected(block.id, $event)"
                                />
                              </label>
                              @if (uploadingFeaturedVideoId() === block.id) {
                                <span class="text-xs text-gray-500">Se încarcă…</span>
                              }
                              @if (layout.featuredVideoBlocks[block.id]?.url) {
                                <span class="text-xs text-gray-500 truncate max-w-xs">{{
                                  layout.featuredVideoBlocks[block.id]?.url
                                }}</span>
                              }
                            </div>
                          }
                          @if (creatingVideoPostKey() === 'featured:' + block.id) {
                            <p class="text-xs text-gray-500">Se creează articolul…</p>
                          } @else if (layout.featuredVideoBlocks[block.id]?.postId) {
                            <p class="text-xs text-green-700">Articol creat și linkuit.</p>
                          }
                        } @else {
                          <cp-post-picker
                            label="Articol cu video"
                            [value]="layout.featuredVideoBlocks[block.id]?.post ?? null"
                            (selected)="setFeaturedVideoPost(block.id, $event)"
                          />
                          <p class="text-[11px] text-gray-400">
                            Selectează un articol publicat care are video atașat.
                          </p>
                        }
                      }

                      @if (isSidebarFeaturedArticleEntry(block)) {
                        <label class="block text-xs text-gray-500">
                          Denumire (opțional)
                          <input
                            type="text"
                            maxlength="100"
                            [ngModel]="layout.featuredArticleBlocks[block.id]?.title ?? ''"
                            (ngModelChange)="setFeaturedArticleTitle(block.id, $event)"
                            placeholder="ex. Articolul zilei"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <cp-post-picker
                          label="Articol"
                          [value]="layout.featuredArticleBlocks[block.id]?.post ?? null"
                          (selected)="setFeaturedArticlePost(block.id, $event)"
                        />
                        <div class="flex flex-wrap gap-4 text-xs text-gray-600">
                          <label class="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              [ngModel]="layout.featuredArticleBlocks[block.id]?.showDate ?? true"
                              (ngModelChange)="setFeaturedArticleShowDate(block.id, $event)"
                              class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                            />
                            Afișează data
                          </label>
                          <label class="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              [ngModel]="layout.featuredArticleBlocks[block.id]?.showAuthor ?? true"
                              (ngModelChange)="setFeaturedArticleShowAuthor(block.id, $event)"
                              class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                            />
                            Afișează autorul
                          </label>
                        </div>
                      }

                      @if (isSidebarFeaturedPhotoEntry(block)) {
                        <label class="block text-xs text-gray-500">
                          Denumire (opțional)
                          <input
                            type="text"
                            maxlength="100"
                            [ngModel]="layout.featuredPhotoBlocks[block.id]?.title ?? ''"
                            (ngModelChange)="setFeaturedPhotoTitle(block.id, $event)"
                            placeholder="ex. Caricatura zilei"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <label class="block text-xs text-gray-500">
                          Titlu (opțional)
                          <input
                            type="text"
                            maxlength="200"
                            [ngModel]="layout.featuredPhotoBlocks[block.id]?.caption ?? ''"
                            (ngModelChange)="setFeaturedPhotoCaption(block.id, $event)"
                            placeholder="ex. Titlul imaginii"
                            class="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <div class="flex items-center gap-2">
                          <label
                            class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 cursor-pointer"
                          >
                            Upload foto
                            <input
                              type="file"
                              accept="image/*"
                              class="hidden"
                              [disabled]="uploadingFeaturedPhotoId() === block.id"
                              (change)="onFeaturedPhotoFileSelected(block.id, $event)"
                            />
                          </label>
                          @if (uploadingFeaturedPhotoId() === block.id) {
                            <span class="text-xs text-gray-500">Se încarcă…</span>
                          }
                          @if (layout.featuredPhotoBlocks[block.id]?.imageUrl) {
                            <button
                              type="button"
                              (click)="clearFeaturedPhoto(block.id)"
                              class="px-2 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50"
                            >
                              Șterge imaginea
                            </button>
                          }
                        </div>
                        @if (layout.featuredPhotoBlocks[block.id]?.imageUrl; as imageUrl) {
                          <img
                            [src]="imageUrl"
                            alt="Previzualizare"
                            class="mt-2 max-h-40 rounded border border-gray-200 object-contain"
                          />
                        }
                      }

                      @if (isSidebarFeaturedStackEntry(block)) {
                        <label class="block text-xs text-gray-500">
                          Denumire (opțional)
                          <input
                            type="text"
                            maxlength="100"
                            [ngModel]="layout.featuredStackBlocks[block.id]?.title ?? ''"
                            (ngModelChange)="setFeaturedStackTitle(block.id, $event)"
                            placeholder="ex. Alegeri"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <label class="block text-xs text-gray-500">
                          Număr articole secundare
                          <input
                            type="number"
                            min="1"
                            max="10"
                            [ngModel]="layout.featuredStackBlocks[block.id]?.secondaryCount ?? 3"
                            (ngModelChange)="setFeaturedStackSecondaryCount(block.id, $event)"
                            class="mt-1 w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <p class="text-[11px] text-gray-400">
                          Un articol principal (imagine mare + titlu) și secundarele de dedesubt
                          (titlu stânga, miniatură dreapta).
                        </p>
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
                        <label
                          class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            [ngModel]="layout.sidebarLatestShowCategory"
                            (ngModelChange)="setSidebarLatestShowCategory($event)"
                            class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                          />
                          Afișează categoria
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

                      @if (isSidebarMostViewedEntry(block)) {
                        <label class="block text-xs text-gray-500">
                          Titlu secțiune
                          <input
                            type="text"
                            maxlength="100"
                            [ngModel]="layout.mostViewedBlocks[block.id]?.title ?? ''"
                            (ngModelChange)="setMostViewedBlockTitle(block.id, $event)"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <label class="block text-xs text-gray-500">
                          Perioadă publicare
                          <select
                            [ngModel]="
                              layout.mostViewedBlocks[block.id]?.period ??
                              sidebarMostViewedPeriodDefault
                            "
                            (ngModelChange)="setMostViewedBlockPeriod(block.id, $event)"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            @for (opt of mostViewedPeriodOptions; track opt.value) {
                              <option [ngValue]="opt.value">{{ opt.label }}</option>
                            }
                          </select>
                        </label>
                        <label class="block text-xs text-gray-500">
                          Categorie
                          <select
                            [ngModel]="layout.mostViewedBlocks[block.id]?.categoryId ?? null"
                            (ngModelChange)="setMostViewedBlockCategoryId(block.id, $event)"
                            class="mt-1 w-full max-w-xs px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option [ngValue]="null">Toate categoriile</option>
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
                            [ngModel]="layout.mostViewedBlocks[block.id]?.count ?? 5"
                            (ngModelChange)="setMostViewedBlockCount(block.id, $event)"
                            class="mt-1 w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </label>
                        <label
                          class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            [ngModel]="layout.mostViewedBlocks[block.id]?.showCategory ?? true"
                            (ngModelChange)="setMostViewedBlockShowCategory(block.id, $event)"
                            class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                          />
                          Afișează categoria
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

                      @if (sidebarSlotsForBlock(layout, block).length > 0) {
                        <div>
                          <p class="text-xs text-gray-500 mb-2">
                            {{
                              sidebarSupportsArticlePinning(block)
                                ? 'Articole / metadate per poziție'
                                : 'Setări metadate per poziție'
                            }}
                          </p>
                          <div class="space-y-2">
                            @for (
                              slot of sidebarSlotsForBlock(layout, block);
                              track $index;
                              let si = $index
                            ) {
                              <div
                                class="rounded border border-gray-200 px-3 py-2 bg-white space-y-2"
                              >
                                @if (sidebarSupportsArticlePinning(block)) {
                                  <cp-post-picker
                                    [label]="sidebarSlotLabel(block, si)"
                                    [value]="slot.post"
                                    (selected)="setSidebarSlotPost(block, si, $event)"
                                  />
                                } @else {
                                  <span class="text-xs text-gray-600">{{
                                    sidebarSlotLabel(block, si)
                                  }}</span>
                                }
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
                      }
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

          <section class="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
            <h2 class="text-sm font-semibold text-gray-700 mb-1 pb-2 border-b border-gray-100">
              Module mobil
            </h2>
            <p class="text-xs text-gray-400 mb-3">
              Aspectul pe telefon (independent de desktop). Fără sidebar pe mobil. Dacă lista e
              goală, pe telefon se afișează modulele web în ordinea implicită (inclusiv conținutul
              din coloana dreaptă).
            </p>

            <div cdkDropList (cdkDropListDropped)="onMobileModuleDrop($event)" class="space-y-3">
              @for (mod of layout.mobileModules; track mod.id; let mi = $index) {
                <div cdkDrag class="border border-gray-200 rounded-lg bg-gray-50">
                  <div
                    class="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-gray-100"
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
                        (ngModelChange)="setMobileModuleName(mi, $event)"
                        [placeholder]="
                          activeTab() === 'home'
                            ? 'Titlu afișat (opțional)'
                            : mobileModuleLabel(mod.type)
                        "
                        class="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                        [title]="mobileModuleLabel(mod.type)"
                      />
                    </span>
                    <span
                      class="text-[10px] uppercase tracking-wide text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded"
                    >
                      {{ mobileModuleLabel(mod.type) }}
                    </span>

                    @if (
                      mod.type === 'list-title-left' ||
                      mod.type === 'list-title-right' ||
                      mod.type === 'column'
                    ) {
                      <label class="flex items-center gap-1.5 text-xs text-gray-500">
                        Articole:
                        <input
                          type="number"
                          min="1"
                          max="50"
                          [ngModel]="mod.count"
                          (ngModelChange)="setMobileModuleCount(mi, $event)"
                          class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </label>
                    }
                    @if (mod.type === 'slideshow') {
                      <label class="flex items-center gap-1.5 text-xs text-gray-500">
                        Slide-uri:
                        <input
                          type="number"
                          min="1"
                          max="10"
                          [ngModel]="mod.count"
                          (ngModelChange)="setMobileModuleSlideshowCount(mi, $event)"
                          class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </label>
                    }
                    @if (mod.type === 'grid-2') {
                      <label class="flex items-center gap-1.5 text-xs text-gray-500">
                        Rânduri (Y):
                        <input
                          type="number"
                          min="1"
                          max="20"
                          [ngModel]="mod.rowCount"
                          (ngModelChange)="setMobileModuleRowCount(mi, $event)"
                          class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </label>
                    }
                    @if (mod.type === 'hero-list') {
                      <label class="flex items-center gap-1.5 text-xs text-gray-500">
                        Mici:
                        <input
                          type="number"
                          min="1"
                          max="20"
                          [ngModel]="mod.sideCount"
                          (ngModelChange)="setMobileModuleSideCount(mi, $event)"
                          class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </label>
                    }
                    @if (supportsMobileTextPosition(mod.type)) {
                      <label
                        class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                      >
                        Titlu:
                        <select
                          [ngModel]="mod.textPosition"
                          (ngModelChange)="setMobileModuleTextPosition(mi, $event)"
                          class="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        >
                          <option [ngValue]="'on-image'">pe poză</option>
                          <option [ngValue]="'below-image'">dedesubt</option>
                        </select>
                      </label>
                    }

                    <label
                      class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                    >
                      <input
                        type="checkbox"
                        [ngModel]="mod.showSummary"
                        (ngModelChange)="setMobileModuleShowSummary(mi, $event)"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Afișează rezumat
                    </label>
                    <label
                      class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                    >
                      <input
                        type="checkbox"
                        [ngModel]="mod.showBumbi"
                        (ngModelChange)="setMobileModuleShowBumbi(mi, $event)"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Afișează bumbi (subtitlu)
                    </label>
                    @if (mod.showSummary) {
                      <label
                        class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                      >
                        Rânduri:
                        <input
                          type="number"
                          min="1"
                          [ngModel]="mod.summaryRows"
                          (ngModelChange)="setMobileModuleSummaryRows(mi, $event)"
                          class="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="implicit"
                        />
                      </label>
                      <button
                        type="button"
                        (click)="openMobileModuleSummaryTypography(mi)"
                        class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                      >
                        ⚙ Tipografie rezumat
                      </button>
                    }

                    <label
                      class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                    >
                      Dată:
                      <select
                        [ngModel]="mod.dateFormat"
                        (ngModelChange)="setMobileModuleDateFormat(mi, $event)"
                        class="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      >
                        <option [ngValue]="null">implicit (setare site)</option>
                        <option [ngValue]="'time-if-today'">oră dacă e azi</option>
                        <option [ngValue]="'always-date'">întotdeauna data</option>
                      </select>
                    </label>
                    <label
                      class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                    >
                      <input
                        type="checkbox"
                        [ngModel]="mod.showReadingTime"
                        (ngModelChange)="setMobileModuleShowReadingTime(mi, $event)"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Afișează timpul de citire
                    </label>

                    @if (activeTab() === 'home') {
                      <label
                        class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                      >
                        Categorie:
                        <select
                          [ngModel]="mod.categoryId"
                          (ngModelChange)="setMobileModuleCategoryId(mi, $event)"
                          class="max-w-[160px] px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option [ngValue]="null">— orice —</option>
                          @for (cat of categories(); track cat.id) {
                            <option [ngValue]="cat.id">{{ cat.name }}</option>
                          }
                        </select>
                      </label>
                    }
                    <label
                      class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                    >
                      <input
                        type="checkbox"
                        [ngModel]="mod.showCategory"
                        (ngModelChange)="setMobileModuleShowCategory(mi, $event)"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Afișează categoria
                    </label>
                    @if (activeTab() !== 'home') {
                      <label
                        class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                      >
                        <input
                          type="checkbox"
                          [ngModel]="mod.showAuthor"
                          (ngModelChange)="setMobileModuleShowAuthor(mi, $event)"
                          class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                        />
                        Afișează autor
                      </label>
                      <label
                        class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"
                      >
                        <input
                          type="checkbox"
                          [ngModel]="mod.showDate"
                          (ngModelChange)="setMobileModuleShowDate(mi, $event)"
                          class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                        />
                        Afișează data
                      </label>
                    }
                    <button
                      type="button"
                      (click)="openMobileModuleTypography(mi)"
                      class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
                    >
                      ⚙ Tipografie
                    </button>
                    <button
                      type="button"
                      (click)="removeMobileModule(mi)"
                      class="text-gray-300 hover:text-red-600 transition-colors text-xl leading-none"
                      aria-label="Elimină modulul mobil"
                    >
                      ×
                    </button>
                  </div>

                  @if (activeTab() === 'home') {
                    <div class="px-3 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      @for (slot of mod.slots; track $index; let si = $index) {
                        <div>
                          <cp-post-picker
                            [label]="mobileSlotLabel(mod, si)"
                            [value]="slot.post"
                            (selected)="setMobileModuleSlot(mi, si, $event)"
                          />
                          <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <label class="inline-flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                [ngModel]="slot.showAuthor"
                                (ngModelChange)="setMobileModuleSlotShowAuthor(mi, si, $event)"
                                class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                              />
                              Autor
                            </label>
                            <label class="inline-flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                [ngModel]="slot.showDate"
                                (ngModelChange)="setMobileModuleSlotShowDate(mi, si, $event)"
                                class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                              />
                              Dată
                            </label>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            @if (layout.mobileModules.length === 0) {
              <p class="text-sm text-gray-400 text-center py-4">
                Niciun modul mobil. Se folosește fallback-ul din layout-ul web.
              </p>
            }

            <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
              <span class="text-xs text-gray-500 self-center">Adaugă modul mobil:</span>
              @for (def of mobileModuleDefs; track def.type) {
                <button
                  type="button"
                  (click)="addMobileModule(def.type)"
                  class="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  + {{ def.label }}
                </button>
              }
            </div>
          </section>
        }
      }
    </div>

    @if (typographyTarget(); as target) {
      <cp-module-settings-modal
        [label]="typographyModalLabel()"
        [typography]="typographyModalValue()"
        [defaultTypography]="typographyModalDefaults()"
        [backgroundColor]="typographyModalBackgroundColor()"
        [supportsBackground]="typographyModalSupportsBackground()"
        [supportsContent]="typographyModalSupportsContent()"
        [supportsHeroTitle]="typographyModalSupportsHeroTitle()"
        [supportsCardTitle]="typographyModalSupportsCardTitle()"
        [supportsSmallTitle]="typographyModalSupportsSmallTitle()"
        [supportsRowHeader]="typographyModalSupportsRowHeader()"
        [supportsCategory]="typographyModalSupportsCategory()"
        [supportsHeroCategory]="typographyModalSupportsHeroCategory()"
        [supportsMeta]="typographyModalSupportsMeta()"
        [supportsHeroMeta]="typographyModalSupportsHeroMeta()"
        [supportsKicker]="typographyModalSupportsKicker()"
        [supportsAuthor]="typographyModalSupportsAuthor()"
        [supportsDate]="typographyModalSupportsDate()"
        [supportsViews]="typographyModalSupportsViews()"
        [supportsBumbi]="typographyModalSupportsBumbi()"
        [supportsHeroBumbi]="typographyModalSupportsHeroBumbi()"
        (saved)="onTypographySaved($event)"
        (closed)="closeTypographyModal()"
      />
    }
    @if (summaryTypographyTarget(); as summaryTarget) {
      <cp-summary-typography-modal
        [title]="summaryTypographyModalTitle()"
        [label]="summaryTypographyModalLabel()"
        [previewMode]="summaryTypographyModalPreviewMode()"
        [style]="summaryTypographyModalValue()"
        [defaultStyle]="summaryTypographyModalDefaults()"
        [supportsHeroSummary]="summaryTypographyModalSupportsHero()"
        [heroStyle]="summaryTypographyModalHeroValue()"
        [defaultHeroStyle]="summaryTypographyModalHeroDefaults()"
        (saved)="onSummaryTypographySaved($event)"
        (closed)="closeSummaryTypographyModal()"
      />
    }
  `,
})
export class LayoutsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  readonly tabs: { id: AspectTabId; label: string }[] = [
    { id: 'home', label: 'Pagina principală' },
    { id: 'category', label: 'Pagini categorie' },
    { id: 'article', label: 'Pagina articol' },
    { id: 'tickers', label: 'Benzi de sus' },
  ];
  readonly moduleDefs = MODULE_DEFS;
  readonly mobileModuleDefs = MOBILE_MODULE_DEFS;
  readonly articleLayoutModeDefs = ARTICLE_LAYOUT_MODE_DEFS;
  readonly supportsMobileTextPosition = supportsMobileTextPosition;
  readonly sidebarBlockDefs = SIDEBAR_BLOCK_DEFS;
  readonly mostViewedPeriodOptions = MOST_VIEWED_PERIOD_OPTIONS;
  readonly sidebarBlockMode = sidebarBlockMode;
  readonly isSidebarSingleCategoryEntry = isSidebarSingleCategoryEntry;
  readonly isSidebarSlideshowEntry = isSidebarSlideshowEntry;
  readonly isSidebarFeaturedVideoEntry = isSidebarFeaturedVideoEntry;
  readonly isSidebarFeaturedArticleEntry = isSidebarFeaturedArticleEntry;
  readonly isSidebarFeaturedPhotoEntry = isSidebarFeaturedPhotoEntry;
  readonly isSidebarFeaturedStackEntry = isSidebarFeaturedStackEntry;
  readonly isSidebarMostViewedEntry = isSidebarMostViewedEntry;
  readonly sidebarMostViewedPeriodDefault = SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT;
  readonly sidebarSupportsArticlePinning = sidebarSupportsArticlePinning;

  loading = signal(true);
  saving = signal(false);
  activeTab = signal<AspectTabId>('home');
  layouts = signal<Record<LayoutPageId, EditableLayout> | null>(null);
  categories = signal<AdminCategory[]>([]);
  typographyTarget = signal<TypographyTarget | null>(null);
  summaryTypographyTarget = signal<SummaryTypographyTarget | null>(null);
  siteDefaultSummaryRows = signal(3);
  uploadingSidebarVideoItemId = signal<string | null>(null);
  uploadingFeaturedVideoId = signal<string | null>(null);
  /** Key while createPostFromVideo is in flight (`sidebar:id` / `featured:id` / `module:modId:itemId`). */
  creatingVideoPostKey = signal<string | null>(null);
  readonly videoListMaxItems = VIDEO_LIST_MAX_ITEMS;
  readonly articleListMaxItems = ARTICLE_LIST_MAX_ITEMS;
  uploadingFeaturedPhotoId = signal<string | null>(null);

  current = computed<EditableLayout | null>(() => {
    const tab = this.activeTab();
    if (tab === 'tickers') return null;
    return this.layouts()?.[tab] ?? null;
  });

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('tab') === 'tickers') {
      this.activeTab.set('tickers');
    }

    this.api.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([]),
    });

    this.api.getSettings().subscribe({
      next: (settings) => {
        this.siteDefaultSummaryRows.set(
          Math.max(1, Math.floor(Number(settings.defaultSummaryRows) || 3)),
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
            : isPicturesModuleType(m.type)
              ? normalizeModulePicturesCount(m.options?.count)
              : isArticleListModuleType(m.type)
                ? normalizeArticleListCount(m.options?.count)
                : (m.options?.count ?? 10);
      const sideCount = normalizeModuleSideCount(m.options?.sideCount);
      const columnCount = normalizeModuleColumnCount(
        m.options?.columnCount ?? m.options?.columns?.length,
      );
      const smallCount = normalizeModuleSmallCount(m.options?.smallCount);
      const rawSlots = (m.slots as LayoutModuleSlot[]) ?? [];
      const slots = resizeSlots(
        rawSlots.map((slot) => slotFromConfig(slot, data.posts)),
        slotCount(m.type, count, sideCount),
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
      const columns = resizeCategoryColumns(
        (m.options?.columns ?? []).map((col) => ({
          id: col.id,
          categoryId: col.categoryId ?? null,
          name: col.name ?? '',
          slots: col.slots.map((slot) => slotFromConfig(slot, data.posts)),
        })),
        columnCount,
        smallCount,
      );
      return {
        id: m.id,
        type: m.type,
        name: m.options?.name ?? '',
        categoryId: m.options?.categoryId ?? null,
        count,
        sideCount,
        columnCount,
        smallCount,
        rows,
        columns,
        slots,
        typography: legacyTypography.typography ?? null,
        backgroundColor: m.options?.backgroundColor ?? null,
        showCategory: m.options?.showCategory ?? defaultModuleShowCategory(m.type),
        showDate: m.options?.showDate ?? true,
        showAuthor: m.options?.showAuthor ?? true,
        showSummary: m.options?.showSummary ?? true,
        showBumbi:
          m.options?.showBumbi ??
          (moduleSupportsSummary(m.type) ? (m.options?.showSummary ?? true) : false),
        summaryRows: m.options?.summaryRows ?? legacyTypography.summaryRows ?? null,
        summaryTypography:
          m.options?.summaryTypography ?? legacyTypography.summaryTypography ?? null,
        heroSummaryTypography:
          m.options?.heroSummaryTypography ?? legacyTypography.heroSummaryTypography ?? null,
        dateFormat: isPostDateFormat(m.options?.dateFormat) ? m.options.dateFormat : null,
        showReadingTime: m.options?.showReadingTime ?? false,
        videoItems: (m.options?.videoItems ?? []).map((item) => ({
          id: item.id,
          title: item.title ?? null,
          url: item.url,
          categoryId: item.categoryId ?? null,
          postId: item.postId ?? null,
        })),
        splitReverse: isSplitModuleType(m.type) ? !!m.options?.splitReverse : false,
      };
    });

    const articleLegacyTypography = migrateLegacySummaryFromTypography(
      config.articleMainTypography ?? null,
    );

    const sidebarEnabled = config.sidebar.enabled;

    const singleCategoryBlocks: EditableLayout['singleCategoryBlocks'] = {};
    const rawSingleCategoryBlocks = config.sidebar.singleCategoryBlocks ?? {};
    for (const blockId of Object.keys(rawSingleCategoryBlocks)) {
      const blockConfig: SingleCategoryBlockConfig = rawSingleCategoryBlocks[blockId];
      singleCategoryBlocks[blockId] = {
        categoryId: blockConfig.categoryId ?? null,
        count: blockConfig.count ?? 4,
        slots: displaySlotsFromConfig(blockConfig.slots, data.posts, SIDEBAR_FEED_SLOT_CAPACITY),
      };
    }
    for (const blockEntry of config.sidebar.blocks) {
      if (!isSidebarSingleCategoryEntry(blockEntry)) continue;
      if (!singleCategoryBlocks[blockEntry.id]) {
        singleCategoryBlocks[blockEntry.id] = {
          categoryId: config.sidebar.singleCategoryId ?? null,
          count: config.sidebar.singleCategoryCount ?? 4,
          slots: displaySlotsFromConfig(
            config.sidebar.singleCategorySlots,
            data.posts,
            SIDEBAR_FEED_SLOT_CAPACITY,
          ),
        };
      }
    }

    const slideshowBlocks: EditableLayout['slideshowBlocks'] = {};
    const rawSlideshowBlocks = config.sidebar.slideshowBlocks ?? {};
    for (const blockId of Object.keys(rawSlideshowBlocks)) {
      const blockConfig: SlideshowBlockConfig = rawSlideshowBlocks[blockId];
      slideshowBlocks[blockId] = {
        count: blockConfig.count ?? 5,
        textPosition: blockConfig.textPosition ?? 'on-image',
        slots: displaySlotsFromConfig(blockConfig.slots, data.posts, 10),
      };
    }
    for (const blockEntry of config.sidebar.blocks) {
      if (!isSidebarSlideshowEntry(blockEntry)) continue;
      if (!slideshowBlocks[blockEntry.id]) {
        slideshowBlocks[blockEntry.id] = {
          count: config.sidebar.slideshowCount ?? 5,
          textPosition: config.sidebar.slideshowTextPosition ?? 'on-image',
          slots: displaySlotsFromConfig(config.sidebar.latestSlots, data.posts, 10),
        };
      }
    }

    const featuredVideoBlocks: EditableLayout['featuredVideoBlocks'] = {};
    for (const [blockId, rawConfig] of Object.entries(config.sidebar.featuredVideoBlocks ?? {})) {
      const blockConfig = rawConfig as FeaturedVideoBlockConfig;
      const postSummary = blockConfig.postId ? (data.posts[blockConfig.postId] ?? null) : null;
      featuredVideoBlocks[blockId] = {
        title: blockConfig.title ?? '',
        source: blockConfig.source ?? 'link',
        url: blockConfig.url ?? null,
        videoTitle: blockConfig.videoTitle ?? null,
        categoryId: blockConfig.categoryId ?? null,
        postId: blockConfig.postId ?? null,
        post: postSummary
          ? {
              id: postSummary.id,
              title: postSummary.title,
              publishedAt: postSummary.publishedAt,
              authorDisplayName: postSummary.authorName ?? postSummary.author?.displayName ?? null,
            }
          : null,
      };
    }
    const featuredArticleBlocks: EditableLayout['featuredArticleBlocks'] = {};
    for (const [blockId, rawConfig] of Object.entries(config.sidebar.featuredArticleBlocks ?? {})) {
      const blockConfig = rawConfig as FeaturedArticleBlockConfig;
      const postSummary = blockConfig.postId ? (data.posts[blockConfig.postId] ?? null) : null;
      featuredArticleBlocks[blockId] = {
        title: blockConfig.title ?? '',
        postId: blockConfig.postId ?? null,
        showDate: blockConfig.showDate ?? true,
        showAuthor: blockConfig.showAuthor ?? true,
        post: postSummary
          ? {
              id: postSummary.id,
              title: postSummary.title,
              publishedAt: postSummary.publishedAt,
              authorDisplayName: postSummary.authorName ?? postSummary.author?.displayName ?? null,
            }
          : null,
      };
    }
    const featuredPhotoBlocks: EditableLayout['featuredPhotoBlocks'] = {
      ...(config.sidebar.featuredPhotoBlocks ?? {}),
    };
    const featuredStackBlocks: EditableLayout['featuredStackBlocks'] = {};
    for (const [blockId, rawConfig] of Object.entries(config.sidebar.featuredStackBlocks ?? {})) {
      const blockConfig = rawConfig as FeaturedStackBlockConfig;
      const secondaryCount = Math.max(1, Math.min(10, blockConfig.secondaryCount ?? 3));
      featuredStackBlocks[blockId] = {
        title: blockConfig.title ?? '',
        secondaryCount,
        slots: displaySlotsFromConfig(blockConfig.slots, data.posts, FEATURED_STACK_SLOT_CAPACITY),
      };
    }
    const mostViewedBlocks: EditableLayout['mostViewedBlocks'] = {};
    for (const [blockId, rawConfig] of Object.entries(config.sidebar.mostViewedBlocks ?? {})) {
      const blockConfig = rawConfig as MostViewedBlockConfig;
      mostViewedBlocks[blockId] = {
        title: blockConfig.title ?? SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
        period: blockConfig.period ?? SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT,
        showCategory: blockConfig.showCategory ?? true,
        categoryId: blockConfig.categoryId ?? null,
        count: Math.max(1, Math.min(SIDEBAR_FEED_MAX_COUNT, blockConfig.count ?? 5)),
        slots: displaySlotsFromConfig(blockConfig.slots, data.posts, SIDEBAR_FEED_SLOT_CAPACITY),
      };
    }
    for (const blockEntry of config.sidebar.blocks) {
      if (isSidebarFeaturedVideoEntry(blockEntry) && !featuredVideoBlocks[blockEntry.id]) {
        featuredVideoBlocks[blockEntry.id] = {
          title: '',
          source: 'link',
          url: null,
          videoTitle: null,
          categoryId: null,
          postId: null,
          post: null,
        };
      }
      if (isSidebarFeaturedArticleEntry(blockEntry) && !featuredArticleBlocks[blockEntry.id]) {
        featuredArticleBlocks[blockEntry.id] = {
          title: '',
          postId: null,
          showDate: true,
          showAuthor: true,
          post: null,
        };
      }
      if (isSidebarFeaturedPhotoEntry(blockEntry) && !featuredPhotoBlocks[blockEntry.id]) {
        featuredPhotoBlocks[blockEntry.id] = { title: '', caption: '', imageUrl: null };
      }
      if (isSidebarFeaturedStackEntry(blockEntry) && !featuredStackBlocks[blockEntry.id]) {
        featuredStackBlocks[blockEntry.id] = {
          title: '',
          secondaryCount: 3,
          slots: resizeSlots([], FEATURED_STACK_SLOT_CAPACITY),
        };
      }
      if (isSidebarMostViewedEntry(blockEntry) && !mostViewedBlocks[blockEntry.id]) {
        mostViewedBlocks[blockEntry.id] = {
          title: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
          period: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT,
          showCategory: config.sidebar.mostViewedShowCategory ?? true,
          categoryId: config.sidebar.mostViewedCategoryId ?? null,
          count: Math.max(1, Math.min(SIDEBAR_FEED_MAX_COUNT, config.sidebar.mostViewedCount ?? 5)),
          slots: displaySlotsFromConfig(
            config.sidebar.mostViewedSlots,
            data.posts,
            SIDEBAR_FEED_SLOT_CAPACITY,
          ),
        };
      }
    }

    return {
      modules,
      moduleTypographyPresets: mergeModuleTypographyPresets(
        config.moduleTypographyPresets,
        deriveModuleTypographyPresets(modules),
      ),
      articleLayoutMode: config.articleLayoutMode ?? DEFAULT_ARTICLE_LAYOUT_MODE,
      articleMainTypography: articleLegacyTypography.typography ?? null,
      articleMainShowSummary: config.articleMainShowSummary ?? true,
      articleMainShowReadingTime: config.articleMainShowReadingTime ?? false,
      articleMainSummaryRows:
        config.articleMainSummaryRows ?? articleLegacyTypography.summaryRows ?? null,
      articleMainSummaryTypography:
        config.articleMainSummaryTypography ?? articleLegacyTypography.summaryTypography ?? null,
      articleMainBumbiTypography: config.articleMainBumbiTypography ?? null,
      articleMainPhotoCaptionTypography: config.articleMainPhotoCaptionTypography ?? null,
      sidebarEnabled,
      sidebarBlocks: config.sidebar.blocks,
      sidebarStickyBlocks: normalizeStickyBlocks(config.sidebar, config.sidebar.blocks.length),
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
        categoryId: item.categoryId ?? null,
        postId: item.postId ?? null,
      })),
      sidebarOverlayListCount: Math.max(
        1,
        Math.min(SIDEBAR_FEED_MAX_COUNT, config.sidebar.overlayListCount ?? 5),
      ),
      sidebarLatestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE_DEFAULT,
      sidebarLatestShowCategory: config.sidebar.latestShowCategory ?? true,
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
      sidebarMostViewedPeriod:
        config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT,
      sidebarMostViewedShowCategory: config.sidebar.mostViewedShowCategory ?? true,
      sidebarMostViewedCategoryId: config.sidebar.mostViewedCategoryId ?? null,
      sidebarSlideshowTextPosition: config.sidebar.slideshowTextPosition ?? 'on-image',
      sidebarLatestSlots: displaySlotsFromConfig(
        config.sidebar.latestSlots,
        data.posts,
        SIDEBAR_FEED_SLOT_CAPACITY,
      ),
      sidebarCategorySlots: displaySlotsFromConfig(config.sidebar.categorySlots, data.posts, 4),
      sidebarOverlayListSlots: displaySlotsFromConfig(
        config.sidebar.overlayListSlots,
        data.posts,
        SIDEBAR_FEED_SLOT_CAPACITY,
      ),
      sidebarArticleListSlots: displaySlotsFromConfig(
        config.sidebar.articleListSlots,
        data.posts,
        SIDEBAR_FEED_SLOT_CAPACITY,
      ),
      sidebarMostViewedSlots: displaySlotsFromConfig(
        config.sidebar.mostViewedSlots,
        data.posts,
        SIDEBAR_FEED_SLOT_CAPACITY,
      ),
      singleCategoryBlocks,
      slideshowBlocks,
      featuredVideoBlocks,
      featuredArticleBlocks,
      featuredPhotoBlocks,
      featuredStackBlocks,
      mostViewedBlocks,
      sidebarBlockTypography: config.sidebar.blockTypography ?? {},
      sidebarBlockBackgroundColor: config.sidebar.blockBackgroundColor ?? {},
      singleCategoryBlockTypography: config.sidebar.singleCategoryBlockTypography ?? {},
      singleCategoryBlockBackgroundColor: config.sidebar.singleCategoryBlockBackgroundColor ?? {},
      slideshowBlockTypography: config.sidebar.slideshowBlockTypography ?? {},
      slideshowBlockBackgroundColor: config.sidebar.slideshowBlockBackgroundColor ?? {},
      featuredVideoBlockTypography: config.sidebar.featuredVideoBlockTypography ?? {},
      featuredVideoBlockBackgroundColor: config.sidebar.featuredVideoBlockBackgroundColor ?? {},
      featuredArticleBlockTypography: config.sidebar.featuredArticleBlockTypography ?? {},
      featuredArticleBlockBackgroundColor: config.sidebar.featuredArticleBlockBackgroundColor ?? {},
      featuredPhotoBlockTypography: config.sidebar.featuredPhotoBlockTypography ?? {},
      featuredPhotoBlockBackgroundColor: config.sidebar.featuredPhotoBlockBackgroundColor ?? {},
      featuredStackBlockTypography: config.sidebar.featuredStackBlockTypography ?? {},
      featuredStackBlockBackgroundColor: config.sidebar.featuredStackBlockBackgroundColor ?? {},
      sidebarBlockSummarySettings: config.sidebar.blockSummarySettings ?? {},
      singleCategoryBlockSummarySettings: config.sidebar.singleCategoryBlockSummarySettings ?? {},
      slideshowBlockSummarySettings: config.sidebar.slideshowBlockSummarySettings ?? {},
      featuredArticleBlockSummarySettings: config.sidebar.featuredArticleBlockSummarySettings ?? {},
      featuredStackBlockSummarySettings: config.sidebar.featuredStackBlockSummarySettings ?? {},
      mobileOrder: syncMobileOrder(config.mobileOrder ?? [], config),
      mobileModules: (config.mobileModules ?? []).map((m) => {
        const legacyTypography = migrateLegacySummaryFromTypography(m.options?.typography ?? null);
        const count =
          m.type === 'slideshow'
            ? Math.max(1, Math.min(10, m.options?.count ?? 5))
            : (m.options?.count ?? defaultMobileModuleCount(m.type));
        const rowCount = normalizeMobileRowCount(m.options?.rowCount);
        const sideCount = normalizeMobileSideCount(m.options?.sideCount);
        const slots = resizeSlots(
          ((m.slots as LayoutModuleSlot[]) ?? []).map((slot) => slotFromConfig(slot, data.posts)),
          mobileEditableSlotCount({ type: m.type, count, rowCount, sideCount }),
        );
        return {
          id: m.id,
          type: m.type,
          name: m.options?.name ?? '',
          categoryId: m.options?.categoryId ?? null,
          count,
          rowCount,
          sideCount,
          textPosition: m.options?.textPosition ?? defaultMobileTextPosition(m.type),
          slots,
          typography: legacyTypography.typography ?? m.options?.typography ?? null,
          backgroundColor: m.options?.backgroundColor ?? null,
          showCategory: m.options?.showCategory ?? defaultMobileModuleShowCategory(m.type),
          showDate: m.options?.showDate ?? true,
          showAuthor: m.options?.showAuthor ?? true,
          showSummary: m.options?.showSummary ?? true,
          showBumbi: m.options?.showBumbi ?? m.options?.showSummary ?? true,
          summaryRows: m.options?.summaryRows ?? legacyTypography.summaryRows ?? null,
          summaryTypography:
            m.options?.summaryTypography ?? legacyTypography.summaryTypography ?? null,
          heroSummaryTypography:
            m.options?.heroSummaryTypography ?? legacyTypography.heroSummaryTypography ?? null,
          dateFormat: isPostDateFormat(m.options?.dateFormat) ? m.options.dateFormat : null,
          showReadingTime: m.options?.showReadingTime ?? false,
        } satisfies EditableMobileModule;
      }),
      mobileModuleTypographyPresets: normalizeMobileModuleTypographyPresets(
        config.mobileModuleTypographyPresets,
      ),
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
    if (target.kind === 'mobile-module') {
      const mod = layout.mobileModules[target.moduleIndex];
      if (!mod) return 'Modul mobil';
      return mod.name.trim() || this.mobileModuleLabel(mod.type);
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
        (entry) => isSidebarMultiInstanceEntry(entry) && entry.id === target.blockId,
      );
      if (blockEntry && isSidebarSingleCategoryEntry(blockEntry)) {
        const catId = layout.singleCategoryBlocks[blockEntry.id]?.categoryId;
        const catName = catId ? this.categories().find((c) => c.id === catId)?.name : null;
        const base = SIDEBAR_BLOCK_DEFS.find((b) => b.mode === target.block)?.label ?? 'Sidebar';
        return catName ? `${base} — ${catName}` : base;
      }
      if (blockEntry && isSidebarMultiInstanceEntry(blockEntry)) {
        const base = SIDEBAR_BLOCK_DEFS.find((b) => b.mode === target.block)?.label ?? 'Sidebar';
        const instanceIndex =
          layout.sidebarBlocks
            .filter(
              (entry): entry is Extract<SidebarBlockEntry, { mode: SidebarMode; id: string }> =>
                isSidebarMultiInstanceEntry(entry) && entry.mode === target.block,
            )
            .findIndex((entry) => entry.id === target.blockId) + 1;
        return instanceIndex > 1 ? `${base} ${instanceIndex}` : base;
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
    if (target.kind === 'mobile-module') {
      return layout.mobileModules[target.moduleIndex]?.typography ?? null;
    }
    if (target.kind === 'article-main') {
      return layout.articleMainTypography;
    }
    if (target.blockId) {
      if (target.block === 'slideshow') {
        return layout.slideshowBlockTypography[target.blockId] ?? null;
      }
      if (target.block === 'featured-video') {
        return layout.featuredVideoBlockTypography[target.blockId] ?? null;
      }
      if (target.block === 'featured-article') {
        return layout.featuredArticleBlockTypography[target.blockId] ?? null;
      }
      if (target.block === 'featured-photo') {
        return layout.featuredPhotoBlockTypography[target.blockId] ?? null;
      }
      if (target.block === 'featured-stack') {
        return layout.featuredStackBlockTypography[target.blockId] ?? null;
      }
      return layout.singleCategoryBlockTypography[target.blockId] ?? null;
    }
    return layout.sidebarBlockTypography[target.block] ?? null;
  }

  typographyModalSupportsBackground(): boolean {
    return this.typographyTarget()?.kind !== 'article-main';
  }

  typographyModalBackgroundColor(): string | null {
    const target = this.typographyTarget();
    const layout = this.current();
    if (!target || !layout || target.kind === 'article-main') return null;
    if (target.kind === 'module') {
      return layout.modules[target.moduleIndex]?.backgroundColor ?? null;
    }
    if (target.kind === 'mobile-module') {
      return layout.mobileModules[target.moduleIndex]?.backgroundColor ?? null;
    }
    if (target.blockId) {
      if (target.block === 'slideshow') {
        return layout.slideshowBlockBackgroundColor[target.blockId] ?? null;
      }
      if (target.block === 'featured-video') {
        return layout.featuredVideoBlockBackgroundColor[target.blockId] ?? null;
      }
      if (target.block === 'featured-article') {
        return layout.featuredArticleBlockBackgroundColor[target.blockId] ?? null;
      }
      if (target.block === 'featured-photo') {
        return layout.featuredPhotoBlockBackgroundColor[target.blockId] ?? null;
      }
      if (target.block === 'featured-stack') {
        return layout.featuredStackBlockBackgroundColor[target.blockId] ?? null;
      }
      return layout.singleCategoryBlockBackgroundColor[target.blockId] ?? null;
    }
    return layout.sidebarBlockBackgroundColor[target.block] ?? null;
  }

  summaryTypographyModalTitle(): string {
    const kind = this.summaryTypographyTarget()?.kind;
    if (kind === 'article-main-bumbi') return 'Tipografie bumbi';
    if (kind === 'article-main-photo-caption') return 'Tipografie explicație foto';
    if (kind === 'article-main-kicker') return 'Tipografie supratitlu';
    return 'Tipografie rezumat';
  }

  summaryTypographyModalPreviewMode(): 'summary' | 'bumbi' | 'kicker' | 'caption' {
    const kind = this.summaryTypographyTarget()?.kind;
    if (kind === 'article-main-bumbi') return 'bumbi';
    if (kind === 'article-main-photo-caption') return 'caption';
    if (kind === 'article-main-kicker') return 'kicker';
    return 'summary';
  }

  summaryTypographyModalLabel(): string {
    const target = this.summaryTypographyTarget();
    const layout = this.current();
    if (!target || !layout) return '';
    if (target.kind === 'module') {
      const mod = layout.modules[target.moduleIndex];
      return mod ? `${this.moduleDisplayName(mod)} — rezumat` : 'Rezumat';
    }
    if (target.kind === 'mobile-module') {
      const mod = layout.mobileModules[target.moduleIndex];
      if (!mod) return 'Rezumat mobil';
      return `${mod.name.trim() || this.mobileModuleLabel(mod.type)} — rezumat`;
    }
    if (target.kind === 'article-main') {
      return 'Articol principal — rezumat text';
    }
    if (target.kind === 'article-main-kicker') {
      return 'Articol principal — supratitlu';
    }
    if (target.kind === 'article-main-bumbi') {
      return 'Articol principal — bumbi subtitlu';
    }
    if (target.kind === 'article-main-photo-caption') {
      return 'Articol principal — explicație foto';
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
    if (target.kind === 'mobile-module') {
      return layout.mobileModules[target.moduleIndex]?.summaryTypography ?? null;
    }
    if (target.kind === 'article-main') {
      return layout.articleMainSummaryTypography;
    }
    if (target.kind === 'article-main-kicker') {
      return layout.articleMainTypography?.kicker ?? null;
    }
    if (target.kind === 'article-main-bumbi') {
      return layout.articleMainBumbiTypography;
    }
    if (target.kind === 'article-main-photo-caption') {
      return layout.articleMainPhotoCaptionTypography;
    }
    if (target.blockId) {
      if (target.block === 'slideshow') {
        return (
          layout.slideshowBlockSummarySettings[target.blockId]?.summaryTypography ??
          layout.sidebarBlockSummarySettings.slideshow?.summaryTypography ??
          null
        );
      }
      if (target.block === 'featured-article') {
        return (
          layout.featuredArticleBlockSummarySettings[target.blockId]?.summaryTypography ??
          layout.sidebarBlockSummarySettings['featured-article']?.summaryTypography ??
          null
        );
      }
      if (target.block === 'featured-stack') {
        return (
          layout.featuredStackBlockSummarySettings[target.blockId]?.summaryTypography ??
          layout.sidebarBlockSummarySettings['featured-stack']?.summaryTypography ??
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
      if (!type) return LIST_SUMMARY_DEFAULT;
      // Dual modules: this default is for the small-card summary section.
      if (moduleSupportsHeroSummary(type)) return SIDEBAR_SUMMARY_DEFAULT;
      return SUMMARY_DEFAULTS_BY_MODULE[type];
    }
    if (target.kind === 'mobile-module') {
      const mod = layout.mobileModules[target.moduleIndex];
      if (!mod) return LIST_SUMMARY_DEFAULT;
      if (mod.type === 'hero-list') return SIDEBAR_SUMMARY_DEFAULT;
      if (mod.type === 'slideshow' && mod.textPosition === 'on-image') {
        return OVERLAY_SUMMARY_DEFAULT;
      }
      return LIST_SUMMARY_DEFAULT;
    }
    if (target.kind === 'article-main') {
      return ARTICLE_MAIN_SUMMARY_DEFAULT;
    }
    if (target.kind === 'article-main-kicker') {
      return ARTICLE_MAIN_KICKER_DEFAULT;
    }
    if (target.kind === 'article-main-bumbi') {
      return layout.articleMainSummaryTypography ?? ARTICLE_MAIN_BUMBI_DEFAULT;
    }
    if (target.kind === 'article-main-photo-caption') {
      return ARTICLE_MAIN_PHOTO_CAPTION_DEFAULT;
    }
    if (target.kind === 'sidebar' && target.block === 'slideshow') {
      const textPosition = target.blockId
        ? (layout.slideshowBlocks[target.blockId]?.textPosition ??
          layout.sidebarSlideshowTextPosition)
        : layout.sidebarSlideshowTextPosition;
      return textPosition === 'below-image' ? SIDEBAR_SUMMARY_DEFAULT : OVERLAY_SUMMARY_DEFAULT;
    }
    return SIDEBAR_SUMMARY_DEFAULT;
  }

  summaryTypographyModalSupportsHero(): boolean {
    const target = this.summaryTypographyTarget();
    const layout = this.current();
    if (!target || !layout) return false;
    if (target.kind === 'module') {
      const type = layout.modules[target.moduleIndex]?.type;
      return type ? moduleSupportsHeroSummary(type) : false;
    }
    if (target.kind === 'mobile-module') {
      return layout.mobileModules[target.moduleIndex]?.type === 'hero-list';
    }
    return false;
  }

  summaryTypographyModalHeroValue(): ModuleTypographyStyle | null {
    const target = this.summaryTypographyTarget();
    const layout = this.current();
    if (!target || !layout) return null;
    if (target.kind === 'module') {
      return layout.modules[target.moduleIndex]?.heroSummaryTypography ?? null;
    }
    if (target.kind === 'mobile-module') {
      return layout.mobileModules[target.moduleIndex]?.heroSummaryTypography ?? null;
    }
    return null;
  }

  summaryTypographyModalHeroDefaults(): ModuleTypographyStyle {
    const target = this.summaryTypographyTarget();
    const layout = this.current();
    if (!target || !layout) return HERO_SUMMARY_DEFAULT;
    if (target.kind === 'module') {
      const type = layout.modules[target.moduleIndex]?.type;
      if (type === 'hero-top-list') return OVERLAY_SUMMARY_DEFAULT;
      return HERO_SUMMARY_DEFAULT;
    }
    return HERO_SUMMARY_DEFAULT;
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

  private typographyTargetMobileModuleType(): MobileModuleType | null {
    const target = this.typographyTarget();
    const layout = this.current();
    if (!target || !layout || target.kind !== 'mobile-module') return null;
    return layout.mobileModules[target.moduleIndex]?.type ?? null;
  }

  typographyModalSupportsSmallTitle(): boolean {
    const target = this.typographyTarget();
    if (target?.kind === 'sidebar' && target.block === 'featured-stack') return true;
    const mobileType = this.typographyTargetMobileModuleType();
    if (mobileType === 'hero-list') return true;
    const type = this.typographyTargetModuleType();
    return type ? moduleSupportsSmallTitle(type) : false;
  }

  typographyModalSupportsHeroTitle(): boolean {
    const target = this.typographyTarget();
    if (target?.kind === 'sidebar' && target.block === 'featured-stack') return true;
    const mobileType = this.typographyTargetMobileModuleType();
    if (mobileType) {
      return (
        mobileType === 'column' ||
        mobileType === 'grid-2' ||
        mobileType === 'slideshow' ||
        mobileType === 'hero-list'
      );
    }
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
    if (target.kind === 'mobile-module') {
      return this.typographyTargetMobileModuleType() !== 'hero-list';
    }
    if (target.kind === 'article-main') return true;
    if (target.kind === 'sidebar') return target.block !== 'featured-stack';
    return false;
  }

  typographyModalSupportsRowHeader(): boolean {
    const target = this.typographyTarget();
    if (!target) return false;
    if (target.kind === 'article-main') return false;
    if (target.kind === 'mobile-module') return true;
    if (target.kind === 'sidebar') return target.block !== 'categories';
    const type = this.typographyTargetModuleType();
    return type ? moduleSupportsRowHeader(type) : false;
  }

  typographyModalSupportsCategory(): boolean {
    const target = this.typographyTarget();
    if (!target) return false;
    if (target.kind === 'article-main') return true;
    if (target.kind === 'module') {
      const type = this.typographyTargetModuleType();
      return type !== 'pictures-7' && type !== 'category-columns' && type !== 'video-list';
    }
    if (target.kind === 'mobile-module') return true;
    if (target.kind === 'sidebar') return SIDEBAR_MODES_WITH_CATEGORY.has(target.block);
    return false;
  }

  typographyModalSupportsHeroCategory(): boolean {
    const mobileType = this.typographyTargetMobileModuleType();
    if (mobileType === 'hero-list') return true;
    const type = this.typographyTargetModuleType();
    return type ? moduleSupportsHeroCategory(type) : false;
  }

  typographyModalSupportsMeta(): boolean {
    const target = this.typographyTarget();
    if (!target) return false;
    if (target.kind === 'article-main') return false;
    if (target.kind === 'module') {
      const type = this.typographyTargetModuleType();
      return type !== 'pictures-7' && type !== 'video-list';
    }
    if (target.kind === 'mobile-module') return true;
    if (target.kind === 'sidebar') return SIDEBAR_MODES_WITH_META.has(target.block);
    return false;
  }

  typographyModalSupportsHeroMeta(): boolean {
    const mobileType = this.typographyTargetMobileModuleType();
    if (mobileType === 'hero-list') return true;
    const type = this.typographyTargetModuleType();
    return type ? moduleSupportsHeroMeta(type) : false;
  }

  typographyModalSupportsKicker(): boolean {
    if (this.typographyTarget()?.kind === 'article-main') return true;
    return this.typographyTargetModuleType() === 'split';
  }

  typographyModalSupportsAuthor(): boolean {
    return this.typographyTarget()?.kind === 'article-main';
  }

  typographyModalSupportsDate(): boolean {
    return this.typographyTarget()?.kind === 'article-main';
  }

  typographyModalSupportsViews(): boolean {
    return this.typographyTarget()?.kind === 'article-main';
  }

  typographyModalSupportsBumbi(): boolean {
    const target = this.typographyTarget();
    if (!target) return false;
    if (target.kind === 'article-main') return false;
    if (target.kind === 'module' || target.kind === 'mobile-module') return true;
    if (target.kind === 'sidebar') return this.sidebarModeSupportsBumbi(target.block);
    return false;
  }

  typographyModalSupportsHeroBumbi(): boolean {
    const mobileType = this.typographyTargetMobileModuleType();
    if (mobileType === 'hero-list') return true;
    const type = this.typographyTargetModuleType();
    return type ? moduleSupportsHeroSummary(type) : false;
  }

  private sidebarModeSupportsBumbi(mode: SidebarMode): boolean {
    return (
      mode === 'latest' ||
      mode === 'most-viewed' ||
      mode === 'article-list' ||
      mode === 'single-category' ||
      mode === 'slideshow' ||
      mode === 'featured-article' ||
      mode === 'featured-stack'
    );
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
    if (target.kind === 'mobile-module') {
      const mod = layout.mobileModules[target.moduleIndex];
      if (!mod) return FALLBACK_MODULE_TYPOGRAPHY_DEFAULTS;
      if (mod.type === 'slideshow' && mod.textPosition === 'on-image') {
        return TYPOGRAPHY_DEFAULTS_BY_MODULE.slideshow;
      }
      if (mod.type === 'hero-list' || mod.type === 'column' || mod.type === 'grid-2') {
        return (
          TYPOGRAPHY_DEFAULTS_BY_MODULE['hero-top-list'] ?? FALLBACK_MODULE_TYPOGRAPHY_DEFAULTS
        );
      }
      return TYPOGRAPHY_DEFAULTS_BY_MODULE.list;
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
    if (target.kind === 'sidebar' && target.block === 'featured-article') {
      return FEATURED_ARTICLE_TYPOGRAPHY_DEFAULTS;
    }
    if (target.kind === 'sidebar' && target.block === 'featured-photo') {
      return FEATURED_PHOTO_TYPOGRAPHY_DEFAULTS;
    }
    if (
      target.kind === 'sidebar' &&
      (target.block === 'article-list' || target.block === 'most-viewed')
    ) {
      return TYPOGRAPHY_DEFAULTS_BY_MODULE['rows-3'];
    }
    if (target.kind === 'sidebar' && target.block === 'featured-stack') {
      return {
        heroTitle: HERO_TITLE_DEFAULT,
        smallTitle: SIDEBAR_TITLE_DEFAULT,
        rowHeader: ROW_HEADER_DEFAULT,
      };
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
      isSidebarMultiInstanceEntry(block) && mode !== 'most-viewed' ? block.id : undefined;
    this.typographyTarget.set({ kind: 'sidebar', block: mode, blockId });
  }

  openSidebarSummaryTypography(block: SidebarBlockEntry) {
    const mode = sidebarBlockMode(block);
    const blockId =
      isSidebarMultiInstanceEntry(block) && mode !== 'most-viewed' ? block.id : undefined;
    this.summaryTypographyTarget.set({ kind: 'sidebar', block: mode, blockId });
  }

  openArticleMainTypography() {
    this.typographyTarget.set({ kind: 'article-main' });
  }

  openArticleMainSummaryTypography() {
    this.summaryTypographyTarget.set({ kind: 'article-main' });
  }

  openArticleMainKickerTypography() {
    this.summaryTypographyTarget.set({ kind: 'article-main-kicker' });
  }

  openArticleMainBumbiTypography() {
    this.summaryTypographyTarget.set({ kind: 'article-main-bumbi' });
  }

  openArticleMainPhotoCaptionTypography() {
    this.summaryTypographyTarget.set({ kind: 'article-main-photo-caption' });
  }

  closeTypographyModal() {
    this.typographyTarget.set(null);
  }

  closeSummaryTypographyModal() {
    this.summaryTypographyTarget.set(null);
  }

  onTypographySaved(payload: ModuleSettingsSavePayload) {
    const target = this.typographyTarget();
    if (!target) return;
    const page = this.layoutTab();
    if (!page) return;
    const typography = payload.typography;
    const backgroundColor =
      target.kind === 'article-main'
        ? null
        : (normalizeModuleBackgroundColor(payload.backgroundColor) ?? null);
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
          backgroundColor,
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
      if (target.kind === 'mobile-module') {
        const mobileModules = [...layout.mobileModules];
        const currentModule = mobileModules[target.moduleIndex];
        if (!currentModule) {
          nextLayout = layout;
          return layout;
        }
        mobileModules[target.moduleIndex] = {
          ...currentModule,
          typography,
          backgroundColor,
        };
        const updated = {
          ...layout,
          mobileModules,
          mobileModuleTypographyPresets: rememberMobileModuleTypographyPreset(
            layout.mobileModuleTypographyPresets,
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
      const sidebarBlockBackgroundColor = { ...layout.sidebarBlockBackgroundColor };
      const singleCategoryBlockTypography = { ...layout.singleCategoryBlockTypography };
      const singleCategoryBlockBackgroundColor = {
        ...layout.singleCategoryBlockBackgroundColor,
      };
      const slideshowBlockTypography = { ...layout.slideshowBlockTypography };
      const slideshowBlockBackgroundColor = { ...layout.slideshowBlockBackgroundColor };
      const featuredVideoBlockTypography = { ...layout.featuredVideoBlockTypography };
      const featuredVideoBlockBackgroundColor = {
        ...layout.featuredVideoBlockBackgroundColor,
      };
      const featuredArticleBlockTypography = { ...layout.featuredArticleBlockTypography };
      const featuredArticleBlockBackgroundColor = {
        ...layout.featuredArticleBlockBackgroundColor,
      };
      const featuredPhotoBlockTypography = { ...layout.featuredPhotoBlockTypography };
      const featuredPhotoBlockBackgroundColor = {
        ...layout.featuredPhotoBlockBackgroundColor,
      };
      const featuredStackBlockTypography = { ...layout.featuredStackBlockTypography };
      const featuredStackBlockBackgroundColor = {
        ...layout.featuredStackBlockBackgroundColor,
      };
      if (target.blockId) {
        const assignInstance = (map: Record<string, ModuleTypography>) => {
          if (typography) map[target.blockId!] = typography;
          else delete map[target.blockId!];
        };
        const assignBgInstance = (map: Record<string, string>) => {
          if (backgroundColor) map[target.blockId!] = backgroundColor;
          else delete map[target.blockId!];
        };
        if (target.block === 'slideshow') {
          assignInstance(slideshowBlockTypography);
          assignBgInstance(slideshowBlockBackgroundColor);
        } else if (target.block === 'featured-video') {
          assignInstance(featuredVideoBlockTypography);
          assignBgInstance(featuredVideoBlockBackgroundColor);
        } else if (target.block === 'featured-article') {
          assignInstance(featuredArticleBlockTypography);
          assignBgInstance(featuredArticleBlockBackgroundColor);
        } else if (target.block === 'featured-photo') {
          assignInstance(featuredPhotoBlockTypography);
          assignBgInstance(featuredPhotoBlockBackgroundColor);
        } else if (target.block === 'featured-stack') {
          assignInstance(featuredStackBlockTypography);
          assignBgInstance(featuredStackBlockBackgroundColor);
        } else {
          assignInstance(singleCategoryBlockTypography);
          assignBgInstance(singleCategoryBlockBackgroundColor);
        }
      } else {
        if (typography) sidebarBlockTypography[target.block] = typography;
        else delete sidebarBlockTypography[target.block];
        if (backgroundColor) sidebarBlockBackgroundColor[target.block] = backgroundColor;
        else delete sidebarBlockBackgroundColor[target.block];
      }
      const updated = {
        ...layout,
        sidebarBlockTypography,
        sidebarBlockBackgroundColor,
        singleCategoryBlockTypography,
        singleCategoryBlockBackgroundColor,
        slideshowBlockTypography,
        slideshowBlockBackgroundColor,
        featuredVideoBlockTypography,
        featuredVideoBlockBackgroundColor,
        featuredArticleBlockTypography,
        featuredArticleBlockBackgroundColor,
        featuredPhotoBlockTypography,
        featuredPhotoBlockBackgroundColor,
        featuredStackBlockTypography,
        featuredStackBlockBackgroundColor,
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

  onSummaryTypographySaved(payload: SummaryTypographySavePayload) {
    const target = this.summaryTypographyTarget();
    if (!target) return;
    const page = this.layoutTab();
    if (!page) return;
    const style = payload.summaryTypography;
    const heroStyle = payload.heroSummaryTypography;
    const supportsHero = this.summaryTypographyModalSupportsHero();
    let nextLayout: EditableLayout | null = null;

    const assignSummaryFields = (current: SummaryDisplaySettings): SummaryDisplaySettings => {
      const next: SummaryDisplaySettings = { ...current };
      if (style) next.summaryTypography = style;
      else delete next.summaryTypography;
      if (supportsHero) {
        if (heroStyle) next.heroSummaryTypography = heroStyle;
        else delete next.heroSummaryTypography;
      }
      return next;
    };

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
          heroSummaryTypography: supportsHero
            ? (heroStyle ?? null)
            : currentModule.heroSummaryTypography,
        };
        const updated = { ...layout, modules };
        nextLayout = updated;
        return updated;
      }
      if (target.kind === 'mobile-module') {
        const mobileModules = [...layout.mobileModules];
        const currentModule = mobileModules[target.moduleIndex];
        if (!currentModule) {
          nextLayout = layout;
          return layout;
        }
        mobileModules[target.moduleIndex] = {
          ...currentModule,
          summaryTypography: style,
          heroSummaryTypography: supportsHero
            ? (heroStyle ?? null)
            : currentModule.heroSummaryTypography,
        };
        const updated = { ...layout, mobileModules };
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
      if (target.kind === 'article-main-kicker') {
        const nextTypography: ModuleTypography = { ...(layout.articleMainTypography ?? {}) };
        if (style) {
          nextTypography.kicker = style;
        } else {
          delete nextTypography.kicker;
        }
        const updated = {
          ...layout,
          articleMainTypography: normalizeModuleTypography(nextTypography) ?? null,
        };
        nextLayout = updated;
        return updated;
      }
      if (target.kind === 'article-main-bumbi') {
        const updated = {
          ...layout,
          articleMainBumbiTypography: style,
        };
        nextLayout = updated;
        return updated;
      }
      if (target.kind === 'article-main-photo-caption') {
        const updated = {
          ...layout,
          articleMainPhotoCaptionTypography: style,
        };
        nextLayout = updated;
        return updated;
      }

      const sidebarBlockSummarySettings = { ...layout.sidebarBlockSummarySettings };
      const singleCategoryBlockSummarySettings = { ...layout.singleCategoryBlockSummarySettings };
      const slideshowBlockSummarySettings = { ...layout.slideshowBlockSummarySettings };
      const featuredArticleBlockSummarySettings = {
        ...layout.featuredArticleBlockSummarySettings,
      };
      const featuredStackBlockSummarySettings = {
        ...layout.featuredStackBlockSummarySettings,
      };
      if (target.blockId) {
        const assignSummary = (map: Record<string, SummaryDisplaySettings>) => {
          map[target.blockId!] = assignSummaryFields(map[target.blockId!] ?? {});
        };
        if (target.block === 'slideshow') assignSummary(slideshowBlockSummarySettings);
        else if (target.block === 'featured-article')
          assignSummary(featuredArticleBlockSummarySettings);
        else if (target.block === 'featured-stack')
          assignSummary(featuredStackBlockSummarySettings);
        else assignSummary(singleCategoryBlockSummarySettings);
      } else {
        sidebarBlockSummarySettings[target.block] = assignSummaryFields(
          sidebarBlockSummarySettings[target.block] ?? {},
        );
      }

      const updated = {
        ...layout,
        sidebarBlockSummarySettings,
        singleCategoryBlockSummarySettings,
        slideshowBlockSummarySettings,
        featuredArticleBlockSummarySettings,
        featuredStackBlockSummarySettings,
      };
      nextLayout = updated;
      return updated;
    });

    this.closeSummaryTypographyModal();
    if (!nextLayout) return;
    const toastKind =
      target.kind === 'article-main-bumbi'
        ? 'bumbi'
        : target.kind === 'article-main-photo-caption'
          ? 'caption'
          : target.kind === 'article-main-kicker'
            ? 'kicker'
            : 'summary';
    this.saving.set(true);
    this.api.saveLayout(page, this.toPageLayoutConfig(nextLayout)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          toastKind === 'bumbi'
            ? 'Tipografie bumbi salvată.'
            : toastKind === 'caption'
              ? 'Tipografie explicație foto salvată.'
              : toastKind === 'kicker'
                ? 'Tipografie supratitlu salvată.'
                : 'Tipografie rezumat salvată.',
        );
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(
          toastKind === 'bumbi'
            ? 'Eroare la salvarea tipografiei bumbilor. Încearcă din nou.'
            : toastKind === 'caption'
              ? 'Eroare la salvarea tipografiei explicației foto. Încearcă din nou.'
              : toastKind === 'kicker'
                ? 'Eroare la salvarea tipografiei supratitlului. Încearcă din nou.'
                : 'Eroare la salvarea tipografiei rezumatului. Încearcă din nou.',
        );
      },
    });
  }

  isFullWidthOnly(mod: Pick<EditableModule, 'type' | 'count'>): boolean {
    return isFullWidthModuleType(mod.type, { count: mod.count });
  }

  isRowsModule(type: ModuleType): boolean {
    return isRowsModuleType(type);
  }

  isCategoryColumnsModule(type: ModuleType): boolean {
    return isCategoryColumnsModuleType(type);
  }

  isPicturesModule(type: ModuleType): boolean {
    return isPicturesModuleType(type);
  }

  /** All module types can toggle the category label on article cards. */
  supportsShowCategory(type: ModuleType): boolean {
    return type !== 'pictures-7' && type !== 'category-columns' && type !== 'video-list';
  }

  /** Module types that render date/author meta and can toggle them. */
  supportsShowDateAuthor(type: ModuleType): boolean {
    return type !== 'pictures-7' && type !== 'video-list';
  }

  isVideoListModule(type: ModuleType): boolean {
    return type === 'video-list';
  }

  isArticleListModule(type: ModuleType): boolean {
    return isArticleListModuleType(type);
  }

  isSplitModule(type: ModuleType): boolean {
    return isSplitModuleType(type);
  }

  /** Module types that render summary (excerpt) text and can toggle it. */
  supportsShowSummary(type: ModuleType): boolean {
    return moduleSupportsSummary(type);
  }

  supportsSideCount(type: ModuleType): boolean {
    return supportsModuleSideCount(type);
  }

  sideCountLabel(type: ModuleType): string {
    if (type === 'hero-list-6' || type === 'hero-list-center') return 'Mici pe parte';
    if (type === 'hero-top-list') return 'Mici dedesubt';
    return 'Mici';
  }

  sideCountHint(type: ModuleType): string {
    if (type === 'hero-list-6') {
      return 'Numărul de articole mici din fiecare coloană din dreapta (1, 2 sau 3).';
    }
    if (type === 'hero-list-center') {
      return 'Numărul de articole mici din stânga și din dreapta (1, 2 sau 3 pe fiecare parte).';
    }
    if (type === 'hero-top-list') {
      return 'Numărul de articole mici afișate sub articolul principal (1, 2 sau 3).';
    }
    return 'Numărul de articole mici din dreapta (1, 2 sau 3).';
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
    return Math.max(1, Math.floor(parsed));
  }

  private updateSidebarSummarySettings(
    layout: EditableLayout,
    block: SidebarBlockEntry,
    updater: (current: SummaryDisplaySettings) => SummaryDisplaySettings,
  ): EditableLayout {
    const sidebarBlockSummarySettings = { ...layout.sidebarBlockSummarySettings };
    const singleCategoryBlockSummarySettings = { ...layout.singleCategoryBlockSummarySettings };
    const slideshowBlockSummarySettings = { ...layout.slideshowBlockSummarySettings };
    const featuredArticleBlockSummarySettings = {
      ...layout.featuredArticleBlockSummarySettings,
    };
    const featuredStackBlockSummarySettings = {
      ...layout.featuredStackBlockSummarySettings,
    };

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
    } else if (isSidebarFeaturedArticleEntry(block)) {
      const current =
        featuredArticleBlockSummarySettings[block.id] ??
        sidebarBlockSummarySettings['featured-article'] ??
        ({} as SummaryDisplaySettings);
      featuredArticleBlockSummarySettings[block.id] = updater(current);
    } else if (isSidebarFeaturedStackEntry(block)) {
      const current =
        featuredStackBlockSummarySettings[block.id] ??
        sidebarBlockSummarySettings['featured-stack'] ??
        ({} as SummaryDisplaySettings);
      featuredStackBlockSummarySettings[block.id] = updater(current);
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
      featuredArticleBlockSummarySettings,
      featuredStackBlockSummarySettings,
    };
  }

  setModuleName(moduleIndex: number, name: string) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      modules[moduleIndex] = { ...modules[moduleIndex], name };
      return { ...l, modules };
    });
  }

  setModuleCategoryId(moduleIndex: number, categoryId: string | null) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      modules[moduleIndex] = { ...modules[moduleIndex], categoryId };
      return { ...l, modules };
    });
  }

  slotLabel(type: ModuleType, index: number, sideCount: ModuleSideCount = 3): string {
    if (type === 'hero' || type === 'split') return 'Articol principal (gol = automat)';
    if (type === 'article-list') {
      return index === 0
        ? 'Articol principal (gol = automat)'
        : `Articol listă ${index} (gol = automat)`;
    }
    if (type === 'hero-list') {
      return index === 0
        ? 'Articol principal (gol = automat)'
        : `Articol mic ${index} (gol = automat)`;
    }
    if (type === 'hero-list-6') {
      if (index === 0) return 'Articol principal (gol = automat)';
      if (index <= sideCount) {
        return `Articol mic coloana 1 · ${index} (gol = automat)`;
      }
      return `Articol mic coloana 2 · ${index - sideCount} (gol = automat)`;
    }
    if (type === 'hero-list-center') {
      if (index === 0) return 'Articol principal (mijloc, gol = automat)';
      if (index <= sideCount) return `Articol stânga ${index} (gol = automat)`;
      return `Articol dreapta ${index - sideCount} (gol = automat)`;
    }
    if (type === 'hero-top-list') {
      return index === 0
        ? 'Articol principal (imagine completă + text pe imagine)'
        : `Articol secundar ${index} (gol = automat)`;
    }
    if (type === 'hero-slideshow') return `Slide principal ${index + 1} (gol = automat)`;
    if (type === 'slideshow') return `Slide ${index + 1} (gol = automat)`;
    if (type === 'pictures-7') return `Imagine ${index + 1} (gol = automat)`;
    return `Articol ${index + 1} (gol = automat)`;
  }

  pinnedCount(mod: EditableModule): number {
    return mod.slots.filter((s) => s.post !== null).length;
  }

  private layoutTab(): LayoutPageId | null {
    const tab = this.activeTab();
    return tab === 'tickers' ? null : tab;
  }

  private updateCurrent(fn: (layout: EditableLayout) => EditableLayout) {
    const all = this.layouts();
    if (!all) return;
    const tab = this.layoutTab();
    if (!tab) return;
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

  onMobileModuleDrop(event: CdkDragDrop<unknown>) {
    this.updateCurrent((layout) => {
      const mobileModules = [...layout.mobileModules];
      moveItemInArray(mobileModules, event.previousIndex, event.currentIndex);
      return { ...layout, mobileModules };
    });
  }

  mobileModuleLabel(type: MobileModuleType): string {
    return MOBILE_MODULE_DEFS.find((def) => def.type === type)?.label ?? type;
  }

  mobileSlotLabel(mod: EditableMobileModule, slotIndex: number): string {
    if (mod.type === 'hero-list') {
      return slotIndex === 0
        ? 'Articol principal (gol = automat)'
        : `Articol mic ${slotIndex} (gol = automat)`;
    }
    if (mod.type === 'slideshow') {
      return `Slide ${slotIndex + 1} (gol = automat)`;
    }
    return `Articol ${slotIndex + 1} (gol = automat)`;
  }

  addMobileModule(type: MobileModuleType) {
    const count = defaultMobileModuleCount(type);
    const rowCount = 2;
    const sideCount = 4;
    this.updateCurrent((l) => {
      const draft: EditableMobileModule = {
        id: crypto.randomUUID(),
        type,
        name: '',
        categoryId: null,
        count,
        rowCount,
        sideCount,
        textPosition: defaultMobileTextPosition(type),
        slots: [],
        typography: presetMobileTypographyForType(l.mobileModuleTypographyPresets, type),
        backgroundColor: null,
        showCategory: defaultMobileModuleShowCategory(type),
        showDate: true,
        showAuthor: true,
        showSummary: true,
        showBumbi: true,
        summaryRows: null,
        summaryTypography: null,
        heroSummaryTypography: null,
        dateFormat: null,
        showReadingTime: false,
      };
      draft.slots = resizeSlots([], mobileEditableSlotCount(draft));
      return { ...l, mobileModules: [...l.mobileModules, draft] };
    });
  }

  removeMobileModule(moduleIndex: number) {
    this.updateCurrent((l) => ({
      ...l,
      mobileModules: l.mobileModules.filter((_, i) => i !== moduleIndex),
    }));
  }

  private updateMobileModule(
    moduleIndex: number,
    updater: (mod: EditableMobileModule) => EditableMobileModule,
  ) {
    this.updateCurrent((l) => ({
      ...l,
      mobileModules: l.mobileModules.map((m, i) => {
        if (i !== moduleIndex) return m;
        const next = updater(m);
        const size = mobileEditableSlotCount(next);
        if (next.slots.length !== size) {
          return { ...next, slots: resizeSlots(next.slots, size) };
        }
        return next;
      }),
    }));
  }

  setMobileModuleName(moduleIndex: number, name: string) {
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, name }));
  }

  setMobileModuleCount(moduleIndex: number, value: number) {
    const count = Math.max(1, Math.min(50, Math.floor(Number(value) || 1)));
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, count }));
  }

  setMobileModuleSlideshowCount(moduleIndex: number, value: number) {
    const count = Math.max(1, Math.min(10, Math.floor(Number(value) || 1)));
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, count }));
  }

  setMobileModuleRowCount(moduleIndex: number, value: number) {
    const rowCount = normalizeMobileRowCount(value);
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, rowCount }));
  }

  setMobileModuleSideCount(moduleIndex: number, value: number) {
    const sideCount = normalizeMobileSideCount(value);
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, sideCount }));
  }

  setMobileModuleTextPosition(moduleIndex: number, textPosition: MobileTextPosition) {
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, textPosition }));
  }

  setMobileModuleCategoryId(moduleIndex: number, categoryId: string | null) {
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, categoryId }));
  }

  setMobileModuleShowCategory(moduleIndex: number, showCategory: boolean) {
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, showCategory }));
  }

  setMobileModuleShowDate(moduleIndex: number, showDate: boolean) {
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, showDate }));
  }

  setMobileModuleShowAuthor(moduleIndex: number, showAuthor: boolean) {
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, showAuthor }));
  }

  setMobileModuleShowSummary(moduleIndex: number, showSummary: boolean) {
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, showSummary }));
  }

  setMobileModuleShowBumbi(moduleIndex: number, showBumbi: boolean) {
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, showBumbi }));
  }

  setMobileModuleSummaryRows(moduleIndex: number, value: number | null) {
    const summaryRows = this.normalizeSummaryRowsInput(value);
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, summaryRows }));
  }

  setMobileModuleDateFormat(moduleIndex: number, dateFormat: PostDateFormat | null) {
    this.updateMobileModule(moduleIndex, (m) => ({
      ...m,
      dateFormat: isPostDateFormat(dateFormat) ? dateFormat : null,
    }));
  }

  setMobileModuleShowReadingTime(moduleIndex: number, showReadingTime: boolean) {
    this.updateMobileModule(moduleIndex, (m) => ({ ...m, showReadingTime }));
  }

  setMobileModuleSlot(moduleIndex: number, slotIndex: number, post: PickedPost | null) {
    this.updateMobileModule(moduleIndex, (m) => {
      const slots = [...m.slots];
      if (!slots[slotIndex]) return m;
      slots[slotIndex] = { ...slots[slotIndex], post };
      return { ...m, slots };
    });
  }

  setMobileModuleSlotShowAuthor(moduleIndex: number, slotIndex: number, showAuthor: boolean) {
    this.updateMobileModule(moduleIndex, (m) => {
      const slots = [...m.slots];
      if (!slots[slotIndex]) return m;
      slots[slotIndex] = { ...slots[slotIndex], showAuthor };
      return { ...m, slots };
    });
  }

  setMobileModuleSlotShowDate(moduleIndex: number, slotIndex: number, showDate: boolean) {
    this.updateMobileModule(moduleIndex, (m) => {
      const slots = [...m.slots];
      if (!slots[slotIndex]) return m;
      slots[slotIndex] = { ...slots[slotIndex], showDate };
      return { ...m, slots };
    });
  }

  openMobileModuleTypography(moduleIndex: number) {
    this.typographyTarget.set({ kind: 'mobile-module', moduleIndex });
  }

  openMobileModuleSummaryTypography(moduleIndex: number) {
    this.summaryTypographyTarget.set({ kind: 'mobile-module', moduleIndex });
  }

  addModule(type: ModuleType) {
    const count =
      type === 'list'
        ? 10
        : type === 'slideshow' || type === 'hero-slideshow'
          ? 5
          : type === 'grid'
            ? 4
            : isPicturesModuleType(type)
              ? 7
              : isArticleListModuleType(type)
                ? ARTICLE_LIST_DEFAULT_COUNT
                : 0;
    const sideCount: ModuleSideCount = 3;
    const columnCount: ModuleColumnCount = 4;
    const smallCount: ModuleSmallCount = 3;
    this.updateCurrentWithMobileSync((l) => ({
      ...l,
      modules: [
        ...l.modules,
        {
          id: crypto.randomUUID(),
          type,
          name: '',
          categoryId: null,
          count: count || 10,
          sideCount,
          columnCount,
          smallCount,
          rows: [],
          columns: isCategoryColumnsModuleType(type)
            ? resizeCategoryColumns([], columnCount, smallCount)
            : [],
          slots: resizeSlots([], slotCount(type, count || 10, sideCount)),
          typography: presetTypographyForType(l.moduleTypographyPresets, type),
          backgroundColor: null,
          showCategory: defaultModuleShowCategory(type),
          showDate: true,
          showAuthor: true,
          showSummary: type !== 'video-list',
          showBumbi: type !== 'video-list' && type !== 'pictures-7' && type !== 'category-columns',
          summaryRows: null,
          summaryTypography: null,
          heroSummaryTypography: null,
          dateFormat: null,
          showReadingTime: false,
          videoItems: [],
          splitReverse: false,
        },
      ],
    }));
  }

  setModuleSplitReverse(moduleIndex: number, splitReverse: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, splitReverse } : m)),
    }));
  }

  setModuleShowCategory(moduleIndex: number, showCategory: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, showCategory } : m)),
    }));
  }

  setModuleShowDate(moduleIndex: number, showDate: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, showDate } : m)),
    }));
  }

  setModuleShowAuthor(moduleIndex: number, showAuthor: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, showAuthor } : m)),
    }));
  }

  setModuleShowSummary(moduleIndex: number, showSummary: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, showSummary } : m)),
    }));
  }

  setModuleShowBumbi(moduleIndex: number, showBumbi: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, showBumbi } : m)),
    }));
  }

  setModuleSummaryRows(moduleIndex: number, value: number | null) {
    const summaryRows = this.normalizeSummaryRowsInput(value);
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, summaryRows } : m)),
    }));
  }

  setModuleShowReadingTime(moduleIndex: number, showReadingTime: boolean) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => (i === moduleIndex ? { ...m, showReadingTime } : m)),
    }));
  }

  setModuleDateFormat(moduleIndex: number, dateFormat: PostDateFormat | null) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === moduleIndex
          ? { ...m, dateFormat: isPostDateFormat(dateFormat) ? dateFormat : null }
          : m,
      ),
    }));
  }

  setArticleLayoutMode(mode: ArticleLayoutMode) {
    this.updateCurrent((l) => ({ ...l, articleLayoutMode: mode }));
  }

  setArticleMainShowSummary(showSummary: boolean) {
    this.updateCurrent((l) => ({ ...l, articleMainShowSummary: showSummary }));
  }

  setArticleMainShowReadingTime(showReadingTime: boolean) {
    this.updateCurrent((l) => ({ ...l, articleMainShowReadingTime: showReadingTime }));
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

  setArticleListCount(index: number, value: number) {
    const count = normalizeArticleListCount(value);
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

  setPicturesCount(index: number, value: number) {
    const count = normalizeModulePicturesCount(value);
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === index ? { ...m, count, slots: resizeSlots(m.slots, count) } : m,
      ),
    }));
  }

  setSideCount(index: number, value: number) {
    const sideCount = normalizeModuleSideCount(value);
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === index
          ? {
              ...m,
              sideCount,
              slots: resizeSlots(m.slots, slotCount(m.type, m.count, sideCount)),
            }
          : m,
      ),
    }));
  }

  setColumnCount(index: number, value: number) {
    const columnCount = normalizeModuleColumnCount(value);
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === index
          ? {
              ...m,
              columnCount,
              columns: resizeCategoryColumns(m.columns, columnCount, m.smallCount),
            }
          : m,
      ),
    }));
  }

  setSmallCount(index: number, value: number) {
    const smallCount = normalizeModuleSmallCount(value);
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === index
          ? {
              ...m,
              smallCount,
              columns: resizeCategoryColumns(m.columns, m.columnCount, smallCount),
            }
          : m,
      ),
    }));
  }

  onColumnDrop(moduleIndex: number, event: CdkDragDrop<unknown>) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      const mod = modules[moduleIndex];
      if (!mod) return l;
      const columns = [...mod.columns];
      moveItemInArray(columns, event.previousIndex, event.currentIndex);
      modules[moduleIndex] = { ...mod, columns };
      return { ...l, modules };
    });
  }

  setColumnCategoryId(moduleIndex: number, columnIndex: number, categoryId: string | null) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      const mod = modules[moduleIndex];
      if (!mod) return l;
      const columns = [...mod.columns];
      columns[columnIndex] = { ...columns[columnIndex], categoryId };
      modules[moduleIndex] = { ...mod, columns };
      return { ...l, modules };
    });
  }

  setColumnName(moduleIndex: number, columnIndex: number, name: string) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      const mod = modules[moduleIndex];
      if (!mod) return l;
      const columns = [...mod.columns];
      columns[columnIndex] = { ...columns[columnIndex], name };
      modules[moduleIndex] = { ...mod, columns };
      return { ...l, modules };
    });
  }

  setColumnSlot(
    moduleIndex: number,
    columnIndex: number,
    slotIndex: number,
    post: PickedPost | null,
  ) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      const mod = modules[moduleIndex];
      if (!mod) return l;
      const columns = [...mod.columns];
      const slots = [...columns[columnIndex].slots];
      slots[slotIndex] = { ...slots[slotIndex], post };
      columns[columnIndex] = { ...columns[columnIndex], slots };
      modules[moduleIndex] = { ...mod, columns };
      return { ...l, modules };
    });
  }

  setColumnSlotShowAuthor(
    moduleIndex: number,
    columnIndex: number,
    slotIndex: number,
    showAuthor: boolean,
  ) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      const mod = modules[moduleIndex];
      if (!mod) return l;
      const columns = [...mod.columns];
      const slots = [...columns[columnIndex].slots];
      slots[slotIndex] = { ...slots[slotIndex], showAuthor };
      columns[columnIndex] = { ...columns[columnIndex], slots };
      modules[moduleIndex] = { ...mod, columns };
      return { ...l, modules };
    });
  }

  setColumnSlotShowDate(
    moduleIndex: number,
    columnIndex: number,
    slotIndex: number,
    showDate: boolean,
  ) {
    this.updateCurrent((l) => {
      const modules = [...l.modules];
      const mod = modules[moduleIndex];
      if (!mod) return l;
      const columns = [...mod.columns];
      const slots = [...columns[columnIndex].slots];
      slots[slotIndex] = { ...slots[slotIndex], showDate };
      columns[columnIndex] = { ...columns[columnIndex], slots };
      modules[moduleIndex] = { ...mod, columns };
      return { ...l, modules };
    });
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

  /** Left modules in the first with-sidebar stretch (before the first full-width break). */
  firstWithSidebarModules(layout: EditableLayout): EditableModule[] {
    const options: EditableModule[] = [];
    for (const mod of layout.modules) {
      if (isFullWidthModuleType(mod.type, { count: mod.count })) break;
      options.push(mod);
    }
    return options;
  }

  /** Category pages: sticky entries always last until the bottom of the left column. */
  sidebarStickyUntilBottomOnly(): boolean {
    return this.activeTab() === 'category';
  }

  canConfigureSidebarSticky(layout: EditableLayout, blockIndex: number): boolean {
    return blockIndex >= 0 && blockIndex < layout.sidebarBlocks.length;
  }

  isSidebarBlockSticky(layout: EditableLayout, blockIndex: number): boolean {
    return stickyEntryForBlock(layout.sidebarStickyBlocks, blockIndex) != null;
  }

  /** Left modules eligible as start-target for sticky block `blockIndex`. */
  stickyFromModuleOptions(layout: EditableLayout, blockIndex: number): EditableModule[] {
    const modules = this.firstWithSidebarModules(layout);
    if (modules.length === 0) return [];
    const entries = layout.sidebarStickyBlocks;
    const ranges = resolveStickyRanges(
      entries,
      modules.map((mod) => mod.id),
    );
    const entryIndex = entries.findIndex((entry) => entry.blockIndex === blockIndex);
    const prevRange =
      entryIndex > 0
        ? ranges[entryIndex - 1]
        : entries.reduce<{ untilIndex: number } | null>((prev, entry, i) => {
            if (entry.blockIndex >= blockIndex) return prev;
            return ranges[i] ?? prev;
          }, null);
    const start = (prevRange?.untilIndex ?? -1) + 1;
    if (start >= modules.length) return [];
    return modules.slice(start);
  }

  /** Left modules eligible as until-target for sticky block `blockIndex`. */
  stickyUntilModuleOptions(layout: EditableLayout, blockIndex: number): EditableModule[] {
    const fromOptions = this.stickyFromModuleOptions(layout, blockIndex);
    if (fromOptions.length === 0) return [];
    const fromId = this.stickyFromModuleSelectValue(layout, blockIndex);
    const fromIndex = fromOptions.findIndex((mod) => mod.id === fromId);
    return fromOptions.slice(Math.max(0, fromIndex));
  }

  stickyFromModuleSelectValue(layout: EditableLayout, blockIndex: number): string | null {
    const options = this.stickyFromModuleOptions(layout, blockIndex);
    if (options.length === 0) return null;
    const current =
      stickyEntryForBlock(layout.sidebarStickyBlocks, blockIndex)?.fromModuleId ?? null;
    if (current && options.some((mod) => mod.id === current)) return current;
    return options[0].id;
  }

  stickyUntilModuleSelectValue(layout: EditableLayout, blockIndex: number): string | null {
    const options = this.stickyUntilModuleOptions(layout, blockIndex);
    if (options.length === 0) return null;
    const current =
      stickyEntryForBlock(layout.sidebarStickyBlocks, blockIndex)?.untilModuleId ?? null;
    if (current && options.some((mod) => mod.id === current)) return current;
    return options[0].id;
  }

  stickyUntilOptionLabel(layout: EditableLayout, mod: EditableModule): string {
    const modules = this.firstWithSidebarModules(layout);
    const index = modules.findIndex((entry) => entry.id === mod.id);
    const n = index >= 0 ? index + 1 : 1;
    return `${n}. ${this.moduleDisplayName(mod)}`;
  }

  setSidebarBlockSticky(blockIndex: number, enabled: boolean) {
    this.updateCurrent((l) => {
      if (blockIndex < 0 || blockIndex >= l.sidebarBlocks.length) return l;
      if (!enabled) {
        return {
          ...l,
          sidebarStickyBlocks: this.repairStickyBlocks(
            l,
            l.sidebarStickyBlocks.filter((entry) => entry.blockIndex !== blockIndex),
          ),
        };
      }
      if (stickyEntryForBlock(l.sidebarStickyBlocks, blockIndex)) return l;
      if (this.sidebarStickyUntilBottomOnly()) {
        const next = [
          ...l.sidebarStickyBlocks,
          { blockIndex, fromModuleId: null, untilModuleId: null },
        ];
        return { ...l, sidebarStickyBlocks: this.repairStickyBlocks(l, next) };
      }
      const modules = this.firstWithSidebarModules(l);
      const ranges = resolveStickyRanges(
        l.sidebarStickyBlocks,
        modules.map((mod) => mod.id),
      );
      const prevRange = l.sidebarStickyBlocks.reduce<{ untilIndex: number } | null>(
        (prev, entry, i) => {
          if (entry.blockIndex >= blockIndex) return prev;
          return ranges[i] ?? prev;
        },
        null,
      );
      const start = (prevRange?.untilIndex ?? -1) + 1;
      const available = modules.slice(start);
      if (available.length === 0) return l;
      const next = [
        ...l.sidebarStickyBlocks,
        { blockIndex, fromModuleId: available[0].id, untilModuleId: available[0].id },
      ];
      return { ...l, sidebarStickyBlocks: this.repairStickyBlocks(l, next) };
    });
  }

  setSidebarStickyFromModuleId(blockIndex: number, moduleId: string | null) {
    this.updateCurrent((l) => {
      const current = stickyEntryForBlock(l.sidebarStickyBlocks, blockIndex);
      if (!current) return l;
      const next = l.sidebarStickyBlocks.map((entry) =>
        entry.blockIndex === blockIndex
          ? {
              ...entry,
              fromModuleId: moduleId,
              untilModuleId: current.untilModuleId ?? moduleId,
            }
          : entry,
      );
      return { ...l, sidebarStickyBlocks: this.repairStickyBlocks(l, next) };
    });
  }

  setSidebarStickyUntilModuleId(blockIndex: number, moduleId: string | null) {
    this.updateCurrent((l) => {
      const current = stickyEntryForBlock(l.sidebarStickyBlocks, blockIndex);
      if (!current) return l;
      const next = l.sidebarStickyBlocks.map((entry) =>
        entry.blockIndex === blockIndex
          ? {
              ...entry,
              fromModuleId: current.fromModuleId ?? moduleId,
              untilModuleId: moduleId,
            }
          : entry,
      );
      return { ...l, sidebarStickyBlocks: this.repairStickyBlocks(l, next) };
    });
  }

  /** Snap from/until ids to a valid non-overlapping chain, keeping sparse block indexes. */
  private repairStickyBlocks(
    layout: EditableLayout,
    stickyBlocks: SidebarStickyBlock[],
  ): SidebarStickyBlock[] {
    const normalized = normalizeStickyBlocks({ stickyBlocks }, layout.sidebarBlocks.length);
    if (this.sidebarStickyUntilBottomOnly()) {
      return normalized.map((entry) => ({
        blockIndex: entry.blockIndex,
        fromModuleId: null,
        untilModuleId: null,
      }));
    }

    const modules = this.firstWithSidebarModules(layout);
    if (normalized.length === 0 || modules.length === 0) return [];

    const ranges = resolveStickyRanges(
      normalized,
      modules.map((mod) => mod.id),
    );
    return ranges.map((range, i) => ({
      blockIndex: normalized[i]?.blockIndex ?? i,
      fromModuleId: modules[range.fromIndex]?.id ?? null,
      untilModuleId: modules[range.untilIndex]?.id ?? null,
    }));
  }

  supportsSidebarSummary(block: SidebarBlockEntry, layout: EditableLayout): boolean {
    const mode = sidebarBlockMode(block);
    const textPosition = isSidebarSlideshowEntry(block)
      ? (layout.slideshowBlocks[block.id]?.textPosition ?? layout.sidebarSlideshowTextPosition)
      : layout.sidebarSlideshowTextPosition;
    return sidebarSupportsSummary(mode, textPosition);
  }

  supportsSidebarBumbi(block: SidebarBlockEntry): boolean {
    return this.sidebarModeSupportsBumbi(sidebarBlockMode(block));
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
    if (isSidebarFeaturedArticleEntry(block)) {
      return (
        layout.featuredArticleBlockSummarySettings[block.id] ??
        layout.sidebarBlockSummarySettings['featured-article'] ??
        {}
      );
    }
    if (isSidebarFeaturedStackEntry(block)) {
      return (
        layout.featuredStackBlockSummarySettings[block.id] ??
        layout.sidebarBlockSummarySettings['featured-stack'] ??
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

  setSidebarBumbiShow(block: SidebarBlockEntry, showBumbi: boolean) {
    this.updateCurrent((layout) =>
      this.updateSidebarSummarySettings(layout, block, (current) => ({ ...current, showBumbi })),
    );
  }

  setSidebarSummaryRows(block: SidebarBlockEntry, value: number | null) {
    const summaryRows = this.normalizeSummaryRowsInput(value);
    this.updateCurrent((layout) =>
      this.updateSidebarSummarySettings(layout, block, (current) => ({ ...current, summaryRows })),
    );
  }

  setSidebarDateFormat(block: SidebarBlockEntry, dateFormat: PostDateFormat | null) {
    this.updateCurrent((layout) =>
      this.updateSidebarSummarySettings(layout, block, (current) => ({
        ...current,
        dateFormat: isPostDateFormat(dateFormat) ? dateFormat : undefined,
      })),
    );
  }

  setSidebarShowReadingTime(block: SidebarBlockEntry, showReadingTime: boolean) {
    this.updateCurrent((layout) =>
      this.updateSidebarSummarySettings(layout, block, (current) => ({
        ...current,
        showReadingTime,
      })),
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
    if (isSidebarMultiInstanceEntry(block) && layout) {
      const customTitle =
        (isSidebarFeaturedVideoEntry(block)
          ? layout.featuredVideoBlocks[block.id]?.title
          : isSidebarFeaturedArticleEntry(block)
            ? layout.featuredArticleBlocks[block.id]?.title
            : isSidebarFeaturedPhotoEntry(block)
              ? layout.featuredPhotoBlocks[block.id]?.title
              : isSidebarFeaturedStackEntry(block)
                ? layout.featuredStackBlocks[block.id]?.title
                : isSidebarMostViewedEntry(block)
                  ? layout.mostViewedBlocks[block.id]?.title
                  : '') ?? '';
      if (customTitle.trim()) return `${base} — ${customTitle.trim()}`;
      const instanceIndex =
        layout.sidebarBlocks
          .filter(
            (entry): entry is Extract<SidebarBlockEntry, { mode: SidebarMode; id: string }> =>
              isSidebarMultiInstanceEntry(entry) && entry.mode === mode,
          )
          .findIndex((entry) => entry.id === block.id) + 1;
      return instanceIndex > 1 ? `${base} ${instanceIndex}` : base;
    }
    return base;
  }

  sidebarBlockTrack(block: SidebarBlockEntry, index: number): string {
    if (isSidebarMultiInstanceEntry(block)) return block.id;
    return `${sidebarBlockMode(block)}-${index}`;
  }

  sidebarHasBlock(mode: SidebarMode): boolean {
    return this.current()?.sidebarBlocks.some((b) => sidebarBlockMode(b) === mode) ?? false;
  }

  sidebarCanAddBlock(mode: SidebarMode): boolean {
    if (isSidebarMultiInstanceMode(mode)) return true;
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
            slots: resizeSlots([], SIDEBAR_FEED_SLOT_CAPACITY),
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
            slots: resizeSlots([], 10),
          },
        },
      }));
      return;
    }
    if (mode === 'featured-video') {
      const id = crypto.randomUUID();
      this.updateCurrentWithMobileSync((l) => ({
        ...l,
        sidebarBlocks: [...l.sidebarBlocks, { mode: 'featured-video', id }],
        featuredVideoBlocks: {
          ...l.featuredVideoBlocks,
          [id]: {
            title: '',
            source: 'link',
            url: null,
            videoTitle: null,
            categoryId: null,
            postId: null,
            post: null,
          },
        },
      }));
      return;
    }
    if (mode === 'featured-article') {
      const id = crypto.randomUUID();
      this.updateCurrentWithMobileSync((l) => ({
        ...l,
        sidebarBlocks: [...l.sidebarBlocks, { mode: 'featured-article', id }],
        featuredArticleBlocks: {
          ...l.featuredArticleBlocks,
          [id]: { title: '', postId: null, showDate: true, showAuthor: true, post: null },
        },
      }));
      return;
    }
    if (mode === 'featured-photo') {
      const id = crypto.randomUUID();
      this.updateCurrentWithMobileSync((l) => ({
        ...l,
        sidebarBlocks: [...l.sidebarBlocks, { mode: 'featured-photo', id }],
        featuredPhotoBlocks: {
          ...l.featuredPhotoBlocks,
          [id]: { title: '', caption: '', imageUrl: null },
        },
      }));
      return;
    }
    if (mode === 'featured-stack') {
      const id = crypto.randomUUID();
      this.updateCurrentWithMobileSync((l) => ({
        ...l,
        sidebarBlocks: [...l.sidebarBlocks, { mode: 'featured-stack', id }],
        featuredStackBlocks: {
          ...l.featuredStackBlocks,
          [id]: {
            title: '',
            secondaryCount: 3,
            slots: resizeSlots([], FEATURED_STACK_SLOT_CAPACITY),
          },
        },
      }));
      return;
    }
    if (mode === 'most-viewed') {
      const id = crypto.randomUUID();
      this.updateCurrentWithMobileSync((l) => ({
        ...l,
        sidebarBlocks: [...l.sidebarBlocks, { mode: 'most-viewed', id }],
        mostViewedBlocks: {
          ...l.mostViewedBlocks,
          [id]: {
            title: SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
            period: SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT,
            showCategory: true,
            categoryId: null,
            count: 5,
            slots: resizeSlots([], SIDEBAR_FEED_SLOT_CAPACITY),
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
      const stickyAfterRemove = l.sidebarStickyBlocks
        .filter((entry) => entry.blockIndex !== index)
        .map((entry) =>
          entry.blockIndex > index ? { ...entry, blockIndex: entry.blockIndex - 1 } : entry,
        );
      const withBlocks = { ...l, sidebarBlocks };
      const sidebarStickyBlocks = this.repairStickyBlocks(withBlocks, stickyAfterRemove);

      if (isSidebarSingleCategoryEntry(entry)) {
        const singleCategoryBlocks = { ...l.singleCategoryBlocks };
        delete singleCategoryBlocks[entry.id];
        const singleCategoryBlockTypography = { ...l.singleCategoryBlockTypography };
        delete singleCategoryBlockTypography[entry.id];
        const singleCategoryBlockBackgroundColor = { ...l.singleCategoryBlockBackgroundColor };
        delete singleCategoryBlockBackgroundColor[entry.id];
        const singleCategoryBlockSummarySettings = { ...l.singleCategoryBlockSummarySettings };
        delete singleCategoryBlockSummarySettings[entry.id];
        return {
          ...withBlocks,
          sidebarStickyBlocks,
          singleCategoryBlocks,
          singleCategoryBlockTypography,
          singleCategoryBlockBackgroundColor,
          singleCategoryBlockSummarySettings,
        };
      }
      if (isSidebarSlideshowEntry(entry)) {
        const slideshowBlocks = { ...l.slideshowBlocks };
        delete slideshowBlocks[entry.id];
        const slideshowBlockTypography = { ...l.slideshowBlockTypography };
        delete slideshowBlockTypography[entry.id];
        const slideshowBlockBackgroundColor = { ...l.slideshowBlockBackgroundColor };
        delete slideshowBlockBackgroundColor[entry.id];
        const slideshowBlockSummarySettings = { ...l.slideshowBlockSummarySettings };
        delete slideshowBlockSummarySettings[entry.id];
        return {
          ...withBlocks,
          sidebarStickyBlocks,
          slideshowBlocks,
          slideshowBlockTypography,
          slideshowBlockBackgroundColor,
          slideshowBlockSummarySettings,
        };
      }
      if (isSidebarFeaturedVideoEntry(entry)) {
        const featuredVideoBlocks = { ...l.featuredVideoBlocks };
        delete featuredVideoBlocks[entry.id];
        const featuredVideoBlockTypography = { ...l.featuredVideoBlockTypography };
        delete featuredVideoBlockTypography[entry.id];
        const featuredVideoBlockBackgroundColor = { ...l.featuredVideoBlockBackgroundColor };
        delete featuredVideoBlockBackgroundColor[entry.id];
        return {
          ...withBlocks,
          sidebarStickyBlocks,
          featuredVideoBlocks,
          featuredVideoBlockTypography,
          featuredVideoBlockBackgroundColor,
        };
      }
      if (isSidebarFeaturedArticleEntry(entry)) {
        const featuredArticleBlocks = { ...l.featuredArticleBlocks };
        delete featuredArticleBlocks[entry.id];
        const featuredArticleBlockTypography = { ...l.featuredArticleBlockTypography };
        delete featuredArticleBlockTypography[entry.id];
        const featuredArticleBlockBackgroundColor = {
          ...l.featuredArticleBlockBackgroundColor,
        };
        delete featuredArticleBlockBackgroundColor[entry.id];
        const featuredArticleBlockSummarySettings = { ...l.featuredArticleBlockSummarySettings };
        delete featuredArticleBlockSummarySettings[entry.id];
        return {
          ...withBlocks,
          sidebarStickyBlocks,
          featuredArticleBlocks,
          featuredArticleBlockTypography,
          featuredArticleBlockBackgroundColor,
          featuredArticleBlockSummarySettings,
        };
      }
      if (isSidebarFeaturedPhotoEntry(entry)) {
        const featuredPhotoBlocks = { ...l.featuredPhotoBlocks };
        delete featuredPhotoBlocks[entry.id];
        const featuredPhotoBlockTypography = { ...l.featuredPhotoBlockTypography };
        delete featuredPhotoBlockTypography[entry.id];
        const featuredPhotoBlockBackgroundColor = { ...l.featuredPhotoBlockBackgroundColor };
        delete featuredPhotoBlockBackgroundColor[entry.id];
        return {
          ...withBlocks,
          sidebarStickyBlocks,
          featuredPhotoBlocks,
          featuredPhotoBlockTypography,
          featuredPhotoBlockBackgroundColor,
        };
      }
      if (isSidebarFeaturedStackEntry(entry)) {
        const featuredStackBlocks = { ...l.featuredStackBlocks };
        delete featuredStackBlocks[entry.id];
        const featuredStackBlockTypography = { ...l.featuredStackBlockTypography };
        delete featuredStackBlockTypography[entry.id];
        const featuredStackBlockBackgroundColor = { ...l.featuredStackBlockBackgroundColor };
        delete featuredStackBlockBackgroundColor[entry.id];
        const featuredStackBlockSummarySettings = { ...l.featuredStackBlockSummarySettings };
        delete featuredStackBlockSummarySettings[entry.id];
        return {
          ...withBlocks,
          sidebarStickyBlocks,
          featuredStackBlocks,
          featuredStackBlockTypography,
          featuredStackBlockBackgroundColor,
          featuredStackBlockSummarySettings,
        };
      }
      if (isSidebarMostViewedEntry(entry)) {
        const mostViewedBlocks = { ...l.mostViewedBlocks };
        delete mostViewedBlocks[entry.id];
        return {
          ...withBlocks,
          sidebarStickyBlocks,
          mostViewedBlocks,
        };
      }
      return { ...withBlocks, sidebarStickyBlocks };
    });
  }

  moveSidebarBlock(index: number, direction: -1 | 1) {
    this.updateCurrent((l) => {
      const next = index + direction;
      if (next < 0 || next >= l.sidebarBlocks.length) return l;
      const blocks = [...l.sidebarBlocks];
      const [item] = blocks.splice(index, 1);
      blocks.splice(next, 0, item);

      const sticky = l.sidebarStickyBlocks.map((entry) => {
        let blockIndex = entry.blockIndex;
        if (blockIndex === index) blockIndex = next;
        else if (index < next && blockIndex > index && blockIndex <= next) blockIndex -= 1;
        else if (next < index && blockIndex >= next && blockIndex < index) blockIndex += 1;
        return { ...entry, blockIndex };
      });

      const withBlocks = { ...l, sidebarBlocks: blocks };
      return {
        ...withBlocks,
        sidebarStickyBlocks: this.repairStickyBlocks(withBlocks, sticky),
      };
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
        slots: resizeSlots([], 10),
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
        slots: resizeSlots([], 10),
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
        { id: crypto.randomUUID(), title: null, url: '', categoryId: null, postId: null },
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
    this.tryCreateSidebarVideoPost(itemId);
  }

  setSidebarVideoItemCategoryId(itemId: string, categoryId: string | null) {
    this.updateCurrent((l) => ({
      ...l,
      sidebarVideoItems: l.sidebarVideoItems.map((item) =>
        item.id === itemId ? { ...item, categoryId } : item,
      ),
    }));
    this.tryCreateSidebarVideoPost(itemId);
  }

  setSidebarVideoItemUrl(itemId: string, url: string) {
    this.updateCurrent((l) => ({
      ...l,
      sidebarVideoItems: l.sidebarVideoItems.map((item) =>
        item.id === itemId ? { ...item, url: url.trim(), postId: null } : item,
      ),
    }));
    this.tryCreateSidebarVideoPost(itemId);
  }

  onSidebarVideoFileSelected(itemId: string, event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) return;
    const rejection = videoFileRejection(file);
    if (rejection) {
      this.toast.error(rejection);
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
      error: (e) => {
        this.toast.error(videoUploadErrorMessage(e));
        this.uploadingSidebarVideoItemId.set(null);
        if (input) input.value = '';
      },
    });
  }

  private tryCreateSidebarVideoPost(itemId: string) {
    const layout = this.current();
    if (!layout) return;
    const item = layout.sidebarVideoItems.find((v) => v.id === itemId);
    if (!item) return;
    this.maybeCreateVideoPost({
      key: `sidebar:${itemId}`,
      title: item.title,
      url: item.url,
      categoryId: item.categoryId,
      postId: item.postId,
      onCreated: (post) => {
        this.updateCurrent((l) => ({
          ...l,
          sidebarVideoItems: l.sidebarVideoItems.map((v) =>
            v.id === itemId ? { ...v, postId: post.id, title: v.title || post.title } : v,
          ),
        }));
      },
    });
  }

  addModuleVideoItem(moduleIndex: number) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) => {
        if (i !== moduleIndex || m.videoItems.length >= VIDEO_LIST_MAX_ITEMS) return m;
        return {
          ...m,
          videoItems: [
            ...m.videoItems,
            { id: crypto.randomUUID(), title: null, url: '', categoryId: null, postId: null },
          ],
        };
      }),
    }));
  }

  removeModuleVideoItem(moduleIndex: number, itemId: string) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === moduleIndex
          ? { ...m, videoItems: m.videoItems.filter((item) => item.id !== itemId) }
          : m,
      ),
    }));
  }

  setModuleVideoItemTitle(moduleIndex: number, itemId: string, title: string) {
    this.patchModuleVideoItem(moduleIndex, itemId, { title: title.trim() || null });
    this.tryCreateModuleVideoPost(moduleIndex, itemId);
  }

  setModuleVideoItemCategoryId(moduleIndex: number, itemId: string, categoryId: string | null) {
    this.patchModuleVideoItem(moduleIndex, itemId, { categoryId });
    this.tryCreateModuleVideoPost(moduleIndex, itemId);
  }

  setModuleVideoItemUrl(moduleIndex: number, itemId: string, url: string) {
    this.patchModuleVideoItem(moduleIndex, itemId, { url: url.trim(), postId: null });
    this.tryCreateModuleVideoPost(moduleIndex, itemId);
  }

  onModuleVideoFileSelected(moduleIndex: number, itemId: string, event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) return;
    const rejection = videoFileRejection(file);
    if (rejection) {
      this.toast.error(rejection);
      if (input) input.value = '';
      return;
    }
    const uploadKey = `upload-module:${itemId}`;
    this.creatingVideoPostKey.set(uploadKey);
    this.api.uploadMedia(file).subscribe({
      next: (uploaded) => {
        this.creatingVideoPostKey.set(null);
        this.setModuleVideoItemUrl(moduleIndex, itemId, uploaded.url);
        this.toast.success('Video încărcat.');
        if (input) input.value = '';
      },
      error: (e) => {
        this.toast.error(videoUploadErrorMessage(e));
        this.creatingVideoPostKey.set(null);
        if (input) input.value = '';
      },
    });
  }

  private patchModuleVideoItem(
    moduleIndex: number,
    itemId: string,
    patch: Partial<SidebarVideoItem>,
  ) {
    this.updateCurrent((l) => ({
      ...l,
      modules: l.modules.map((m, i) =>
        i === moduleIndex
          ? {
              ...m,
              videoItems: m.videoItems.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            }
          : m,
      ),
    }));
  }

  private tryCreateModuleVideoPost(moduleIndex: number, itemId: string) {
    const layout = this.current();
    if (!layout) return;
    const mod = layout.modules[moduleIndex];
    const item = mod?.videoItems.find((v) => v.id === itemId);
    if (!mod || !item) return;
    this.maybeCreateVideoPost({
      key: `module:${mod.id}:${itemId}`,
      title: item.title,
      url: item.url,
      categoryId: item.categoryId,
      postId: item.postId,
      onCreated: (post) => {
        this.patchModuleVideoItem(moduleIndex, itemId, {
          postId: post.id,
          title: item.title || post.title,
        });
      },
    });
  }

  private maybeCreateVideoPost(opts: {
    key: string;
    title: string | null | undefined;
    url: string | null | undefined;
    categoryId: string | null | undefined;
    postId: string | null | undefined;
    onCreated: (post: { id: string; title: string }) => void;
  }) {
    if (opts.postId) return;
    const title = opts.title?.trim();
    const url = opts.url?.trim();
    const categoryId = opts.categoryId?.trim();
    if (!title || !url || !categoryId) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    } catch {
      return;
    }
    if (this.creatingVideoPostKey() === opts.key) return;
    this.creatingVideoPostKey.set(opts.key);
    this.api.createPostFromVideo({ title, videoUrl: url, categoryId }).subscribe({
      next: (post) => {
        this.creatingVideoPostKey.set(null);
        opts.onCreated({ id: post.id, title: post.title });
        this.toast.success('Articol video publicat.');
      },
      error: () => {
        this.creatingVideoPostKey.set(null);
        this.toast.error('Nu s-a putut crea articolul video.');
      },
    });
  }

  private patchFeaturedVideo(
    blockId: string,
    patch: Partial<EditableLayout['featuredVideoBlocks'][string]>,
  ) {
    this.updateCurrent((l) => {
      const current = l.featuredVideoBlocks[blockId] ?? {
        title: '',
        source: 'link' as FeaturedVideoSource,
        url: null,
        videoTitle: null,
        categoryId: null,
        postId: null,
        post: null,
      };
      return {
        ...l,
        featuredVideoBlocks: {
          ...l.featuredVideoBlocks,
          [blockId]: { ...current, ...patch },
        },
      };
    });
  }

  setFeaturedVideoTitle(blockId: string, title: string) {
    this.patchFeaturedVideo(blockId, { title });
  }

  setFeaturedVideoArticleTitle(blockId: string, videoTitle: string) {
    this.patchFeaturedVideo(blockId, { videoTitle: videoTitle.trim() || null });
    this.tryCreateFeaturedVideoPost(blockId);
  }

  setFeaturedVideoCategoryId(blockId: string, categoryId: string | null) {
    this.patchFeaturedVideo(blockId, { categoryId });
    this.tryCreateFeaturedVideoPost(blockId);
  }

  setFeaturedVideoSource(blockId: string, source: FeaturedVideoSource) {
    const next: FeaturedVideoSource =
      source === 'upload' || source === 'post' || source === 'link' || source === 'livestream'
        ? source
        : 'link';
    if (next === 'livestream') {
      this.patchFeaturedVideo(blockId, { source: next, postId: null, post: null });
      return;
    }
    this.patchFeaturedVideo(blockId, { source: next });
  }

  setFeaturedVideoUrl(blockId: string, url: string) {
    this.patchFeaturedVideo(blockId, { url: url.trim() || null, postId: null, post: null });
    this.tryCreateFeaturedVideoPost(blockId);
  }

  setFeaturedVideoPost(blockId: string, post: PickedPost | null) {
    this.patchFeaturedVideo(blockId, {
      source: 'post',
      postId: post?.id ?? null,
      post,
      url: null,
    });
  }

  onFeaturedVideoFileSelected(blockId: string, event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    const rejection = videoFileRejection(file);
    if (rejection) {
      this.toast.error(rejection);
      if (input) input.value = '';
      return;
    }
    this.uploadingFeaturedVideoId.set(blockId);
    this.api.uploadMedia(file).subscribe({
      next: (uploaded) => {
        this.patchFeaturedVideo(blockId, {
          source: 'upload',
          url: uploaded.url,
          postId: null,
          post: null,
        });
        this.toast.success('Video încărcat.');
        this.uploadingFeaturedVideoId.set(null);
        if (input) input.value = '';
        this.tryCreateFeaturedVideoPost(blockId);
      },
      error: (e) => {
        this.toast.error(videoUploadErrorMessage(e));
        this.uploadingFeaturedVideoId.set(null);
        if (input) input.value = '';
      },
    });
  }

  private tryCreateFeaturedVideoPost(blockId: string) {
    const layout = this.current();
    if (!layout) return;
    const block = layout.featuredVideoBlocks[blockId];
    if (!block || block.source === 'post' || block.source === 'livestream') return;
    this.maybeCreateVideoPost({
      key: `featured:${blockId}`,
      title: block.videoTitle,
      url: block.url,
      categoryId: block.categoryId,
      postId: block.postId,
      onCreated: (post) => {
        this.patchFeaturedVideo(blockId, {
          postId: post.id,
          post: {
            id: post.id,
            title: post.title,
            publishedAt: null,
            authorDisplayName: null,
          },
          videoTitle: block.videoTitle || post.title,
        });
      },
    });
  }

  private patchFeaturedArticle(
    blockId: string,
    patch: Partial<EditableLayout['featuredArticleBlocks'][string]>,
  ) {
    this.updateCurrent((l) => {
      const current = l.featuredArticleBlocks[blockId] ?? {
        title: '',
        postId: null,
        showDate: true,
        showAuthor: true,
        post: null,
      };
      return {
        ...l,
        featuredArticleBlocks: {
          ...l.featuredArticleBlocks,
          [blockId]: { ...current, ...patch },
        },
      };
    });
  }

  setFeaturedArticleTitle(blockId: string, title: string) {
    this.patchFeaturedArticle(blockId, { title });
  }

  setFeaturedArticlePost(blockId: string, post: PickedPost | null) {
    this.patchFeaturedArticle(blockId, { postId: post?.id ?? null, post });
  }

  setFeaturedArticleShowDate(blockId: string, showDate: boolean) {
    this.patchFeaturedArticle(blockId, { showDate });
  }

  setFeaturedArticleShowAuthor(blockId: string, showAuthor: boolean) {
    this.patchFeaturedArticle(blockId, { showAuthor });
  }

  private patchFeaturedPhoto(
    blockId: string,
    patch: Partial<EditableLayout['featuredPhotoBlocks'][string]>,
  ) {
    this.updateCurrent((l) => {
      const current = l.featuredPhotoBlocks[blockId] ?? { title: '', caption: '', imageUrl: null };
      return {
        ...l,
        featuredPhotoBlocks: {
          ...l.featuredPhotoBlocks,
          [blockId]: { ...current, ...patch },
        },
      };
    });
  }

  setFeaturedPhotoTitle(blockId: string, title: string) {
    this.patchFeaturedPhoto(blockId, { title });
  }

  setFeaturedPhotoCaption(blockId: string, caption: string) {
    this.patchFeaturedPhoto(blockId, { caption });
  }

  clearFeaturedPhoto(blockId: string) {
    this.patchFeaturedPhoto(blockId, { imageUrl: null });
  }

  setFeaturedStackTitle(blockId: string, title: string) {
    this.updateCurrent((l) => {
      const current = l.featuredStackBlocks[blockId] ?? {
        title: '',
        secondaryCount: 3,
        slots: resizeSlots([], FEATURED_STACK_SLOT_CAPACITY),
      };
      return {
        ...l,
        featuredStackBlocks: {
          ...l.featuredStackBlocks,
          [blockId]: { ...current, title },
        },
      };
    });
  }

  setFeaturedStackSecondaryCount(blockId: string, value: number) {
    const secondaryCount = Math.max(1, Math.min(10, Math.floor(Number(value) || 3)));
    this.updateCurrent((l) => {
      const current = l.featuredStackBlocks[blockId] ?? {
        title: '',
        secondaryCount: 3,
        slots: resizeSlots([], FEATURED_STACK_SLOT_CAPACITY),
      };
      return {
        ...l,
        featuredStackBlocks: {
          ...l.featuredStackBlocks,
          [blockId]: { ...current, secondaryCount },
        },
      };
    });
  }

  sidebarSlotLabel(entry: SidebarBlockEntry, slotIndex: number): string {
    if (isSidebarFeaturedStackEntry(entry)) {
      return slotIndex === 0
        ? 'Articol principal (gol = automat)'
        : `Articol secundar ${slotIndex} (gol = automat)`;
    }
    return `Poziția ${slotIndex + 1} (gol = automat)`;
  }

  onFeaturedPhotoFileSelected(blockId: string, event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast.error('Fișierul selectat nu este o imagine.');
      if (input) input.value = '';
      return;
    }
    this.uploadingFeaturedPhotoId.set(blockId);
    this.api.uploadMedia(file).subscribe({
      next: (uploaded) => {
        this.patchFeaturedPhoto(blockId, { imageUrl: uploaded.url });
        this.toast.success('Imagine încărcată.');
        this.uploadingFeaturedPhotoId.set(null);
        if (input) input.value = '';
      },
      error: () => {
        this.toast.error('Eroare la încărcarea imaginii.');
        this.uploadingFeaturedPhotoId.set(null);
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

  setSidebarLatestShowCategory(showCategory: boolean) {
    this.updateCurrent((l) => ({ ...l, sidebarLatestShowCategory: showCategory }));
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

  private defaultMostViewedBlock(): EditableLayout['mostViewedBlocks'][string] {
    return {
      title: SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
      period: SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT,
      showCategory: true,
      categoryId: null,
      count: 5,
      slots: resizeSlots([], SIDEBAR_FEED_SLOT_CAPACITY),
    };
  }

  private patchMostViewedBlock(
    blockId: string,
    patch: Partial<EditableLayout['mostViewedBlocks'][string]>,
  ) {
    this.updateCurrent((l) => {
      const current = l.mostViewedBlocks[blockId] ?? this.defaultMostViewedBlock();
      return {
        ...l,
        mostViewedBlocks: {
          ...l.mostViewedBlocks,
          [blockId]: { ...current, ...patch },
        },
      };
    });
  }

  setMostViewedBlockCount(blockId: string, value: number) {
    const count = Math.max(1, Math.min(SIDEBAR_FEED_MAX_COUNT, Math.floor(Number(value) || 1)));
    this.patchMostViewedBlock(blockId, { count });
  }

  setMostViewedBlockTitle(blockId: string, value: string) {
    const title = value.trim() || SIDEBAR_MOST_VIEWED_TITLE_DEFAULT;
    this.patchMostViewedBlock(blockId, { title });
  }

  setMostViewedBlockPeriod(blockId: string, value: MostViewedPeriod) {
    this.patchMostViewedBlock(blockId, {
      period: value ?? SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT,
    });
  }

  setMostViewedBlockShowCategory(blockId: string, showCategory: boolean) {
    this.patchMostViewedBlock(blockId, { showCategory });
  }

  setMostViewedBlockCategoryId(blockId: string, categoryId: string | null) {
    this.patchMostViewedBlock(blockId, { categoryId });
  }

  setSingleCategoryBlockCount(blockId: string, value: number) {
    const count = Math.max(1, Math.min(SIDEBAR_FEED_MAX_COUNT, Math.floor(Number(value) || 1)));
    this.updateCurrent((l) => {
      const current = l.singleCategoryBlocks[blockId] ?? {
        categoryId: null,
        count: 4,
        slots: resizeSlots([], SIDEBAR_FEED_SLOT_CAPACITY),
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
        slots: resizeSlots([], SIDEBAR_FEED_SLOT_CAPACITY),
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

  sidebarSlotsForBlock(layout: EditableLayout, entry: SidebarBlockEntry): EditableSlot[] {
    const mode = sidebarBlockMode(entry);
    if (mode === 'featured-video' || mode === 'featured-article' || mode === 'featured-photo') {
      return [];
    }
    if (mode === 'categories') return layout.sidebarCategorySlots;
    if (mode === 'overlay-list') {
      return layout.sidebarOverlayListSlots.slice(0, layout.sidebarOverlayListCount);
    }
    if (mode === 'article-list') {
      return layout.sidebarArticleListSlots.slice(0, layout.sidebarArticleListCount);
    }
    if (isSidebarMostViewedEntry(entry)) {
      const config = layout.mostViewedBlocks[entry.id];
      if (!config) return [];
      return config.slots.slice(0, config.count);
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
    if (isSidebarFeaturedStackEntry(entry)) {
      const config = layout.featuredStackBlocks[entry.id];
      if (!config) return [];
      return config.slots.slice(0, 1 + config.secondaryCount);
    }
    if (mode === 'video') {
      return layout.sidebarLatestSlots.slice(0, layout.sidebarVideoCount);
    }
    if (mode === 'latest') {
      return layout.sidebarLatestSlots.slice(0, layout.sidebarLatestCount);
    }
    return layout.sidebarLatestSlots;
  }

  setSidebarSlotPost(entry: SidebarBlockEntry, slotIndex: number, post: PickedPost | null) {
    if (!sidebarSupportsArticlePinning(entry)) return;
    const mode = sidebarBlockMode(entry);
    this.updateCurrent((l) => {
      if (mode === 'latest') {
        const slots = [...l.sidebarLatestSlots];
        slots[slotIndex] = { ...slots[slotIndex], post };
        return { ...l, sidebarLatestSlots: slots };
      }
      if (isSidebarSlideshowEntry(entry)) {
        const config = l.slideshowBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], post };
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
        slots[slotIndex] = { ...slots[slotIndex], post };
        return { ...l, sidebarOverlayListSlots: slots };
      }
      if (mode === 'article-list') {
        const slots = [...l.sidebarArticleListSlots];
        slots[slotIndex] = { ...slots[slotIndex], post };
        return { ...l, sidebarArticleListSlots: slots };
      }
      if (isSidebarSingleCategoryEntry(entry)) {
        const config = l.singleCategoryBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], post };
        return {
          ...l,
          singleCategoryBlocks: {
            ...l.singleCategoryBlocks,
            [entry.id]: { ...config, slots },
          },
        };
      }
      if (isSidebarFeaturedStackEntry(entry)) {
        const config = l.featuredStackBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], post };
        return {
          ...l,
          featuredStackBlocks: {
            ...l.featuredStackBlocks,
            [entry.id]: { ...config, slots },
          },
        };
      }
      return l;
    });
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
      if (isSidebarMostViewedEntry(entry)) {
        const config = l.mostViewedBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        return {
          ...l,
          mostViewedBlocks: {
            ...l.mostViewedBlocks,
            [entry.id]: { ...config, slots },
          },
        };
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
      if (isSidebarFeaturedStackEntry(entry)) {
        const config = l.featuredStackBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], showDate };
        return {
          ...l,
          featuredStackBlocks: {
            ...l.featuredStackBlocks,
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
      if (isSidebarMostViewedEntry(entry)) {
        const config = l.mostViewedBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        return {
          ...l,
          mostViewedBlocks: {
            ...l.mostViewedBlocks,
            [entry.id]: { ...config, slots },
          },
        };
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
      if (isSidebarFeaturedStackEntry(entry)) {
        const config = l.featuredStackBlocks[entry.id];
        if (!config) return l;
        const slots = [...config.slots];
        slots[slotIndex] = { ...slots[slotIndex], showAuthor };
        return {
          ...l,
          featuredStackBlocks: {
            ...l.featuredStackBlocks,
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
    const page = this.activeTab();
    if (!layout || page === 'tickers') return;
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
        categoryId: item.categoryId ?? null,
        postId: item.postId ?? null,
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
          const backgroundColor = normalizeModuleBackgroundColor(m.backgroundColor);
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
              ...(backgroundColor ? { backgroundColor } : {}),
              showCategory: m.showCategory,
              showDate: m.showDate,
              showAuthor: m.showAuthor,
              showSummary: m.showSummary,
              showBumbi: m.showBumbi,
              ...(m.summaryRows != null ? { summaryRows: m.summaryRows } : {}),
              ...(m.summaryTypography ? { summaryTypography: m.summaryTypography } : {}),
              ...(m.dateFormat ? { dateFormat: m.dateFormat } : {}),
              ...(m.showReadingTime ? { showReadingTime: true } : {}),
            },
            slots: [],
          };
        }

        if (isCategoryColumnsModuleType(m.type)) {
          const typography = normalizeModuleTypography(m.typography);
          const backgroundColor = normalizeModuleBackgroundColor(m.backgroundColor);
          return {
            id: m.id,
            type: m.type,
            options: {
              name: moduleName,
              columnCount: m.columnCount,
              smallCount: m.smallCount,
              columns: m.columns.map((col) => ({
                id: col.id,
                categoryId: col.categoryId,
                name: col.name.trim() || null,
                slots: col.slots.map((slot) => ({
                  postId: slot.post?.id ?? null,
                  showDate: slot.showDate,
                  showAuthor: slot.showAuthor,
                })),
              })),
              ...(typography ? { typography } : {}),
              ...(backgroundColor ? { backgroundColor } : {}),
              showCategory: false,
              showDate: m.showDate,
              showAuthor: m.showAuthor,
              showSummary: false,
              showBumbi: m.showBumbi,
              ...(m.dateFormat ? { dateFormat: m.dateFormat } : {}),
              ...(m.showReadingTime ? { showReadingTime: true } : {}),
            },
            slots: [],
          };
        }

        if (m.type === 'video-list') {
          const typography = normalizeModuleTypography(m.typography);
          const backgroundColor = normalizeModuleBackgroundColor(m.backgroundColor);
          return {
            id: m.id,
            type: m.type,
            options: {
              name: moduleName,
              videoItems: this.normalizeSidebarVideoItems(m.videoItems).slice(
                0,
                VIDEO_LIST_MAX_ITEMS,
              ),
              showCategory: false,
              showSummary: false,
              showBumbi: m.showBumbi,
              ...(typography ? { typography } : {}),
              ...(backgroundColor ? { backgroundColor } : {}),
              ...(m.dateFormat ? { dateFormat: m.dateFormat } : {}),
              ...(m.showReadingTime ? { showReadingTime: true } : {}),
            },
            slots: [],
          };
        }

        const options: {
          name: string | null;
          categoryId?: string | null;
          count?: number;
          sideCount?: ModuleSideCount;
          typography?: ModuleTypography;
          backgroundColor?: string;
          showSummary?: boolean;
          showBumbi?: boolean;
          summaryRows?: number;
          summaryTypography?: ModuleTypographyStyle;
          heroSummaryTypography?: ModuleTypographyStyle;
          dateFormat?: PostDateFormat;
          showReadingTime?: boolean;
          showCategory?: boolean;
          showDate?: boolean;
          showAuthor?: boolean;
          splitReverse?: boolean;
        } = {
          name: moduleName,
          categoryId: m.categoryId,
        };
        if (
          m.type === 'list' ||
          m.type === 'grid' ||
          m.type === 'slideshow' ||
          m.type === 'hero-slideshow' ||
          isPicturesModuleType(m.type) ||
          isArticleListModuleType(m.type)
        ) {
          options.count = m.count;
        }
        if (supportsModuleSideCount(m.type)) {
          options.sideCount = m.sideCount;
        }
        if (isSplitModuleType(m.type)) {
          options.splitReverse = m.splitReverse;
        }
        if (moduleSupportsSummary(m.type)) {
          options.showSummary = m.showSummary;
          if (m.summaryRows != null) options.summaryRows = m.summaryRows;
          if (m.summaryTypography) options.summaryTypography = m.summaryTypography;
          if (m.heroSummaryTypography) options.heroSummaryTypography = m.heroSummaryTypography;
        }
        options.showBumbi = m.showBumbi;
        if (m.dateFormat) options.dateFormat = m.dateFormat;
        if (m.showReadingTime) options.showReadingTime = true;
        options.showCategory = m.showCategory;
        options.showDate = m.showDate;
        options.showAuthor = m.showAuthor;
        const typography = normalizeModuleTypography(m.typography);
        if (typography) {
          options.typography = typography;
        }
        const backgroundColor = normalizeModuleBackgroundColor(m.backgroundColor);
        if (backgroundColor) {
          options.backgroundColor = backgroundColor;
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
        stickyBlocks: this.repairStickyBlocks(layout, layout.sidebarStickyBlocks),
        ...stickyLegacyMirror(this.repairStickyBlocks(layout, layout.sidebarStickyBlocks)),
        slideshowCount: layout.sidebarSlideshowCount,
        latestCount: layout.sidebarLatestCount,
        videoCount: layout.sidebarVideoCount,
        videoItems: this.normalizeSidebarVideoItems(layout.sidebarVideoItems),
        overlayListCount: layout.sidebarOverlayListCount,
        latestTitle: layout.sidebarLatestTitle,
        latestShowCategory: layout.sidebarLatestShowCategory,
        overlayListTitle: layout.sidebarOverlayListTitle,
        articleListCount: layout.sidebarArticleListCount,
        articleListTitle: layout.sidebarArticleListTitle,
        mostViewedCount:
          Object.values(layout.mostViewedBlocks)[0]?.count ?? layout.sidebarMostViewedCount,
        mostViewedTitle:
          Object.values(layout.mostViewedBlocks)[0]?.title ?? layout.sidebarMostViewedTitle,
        mostViewedPeriod:
          Object.values(layout.mostViewedBlocks)[0]?.period ?? layout.sidebarMostViewedPeriod,
        mostViewedShowCategory:
          Object.values(layout.mostViewedBlocks)[0]?.showCategory ??
          layout.sidebarMostViewedShowCategory,
        mostViewedCategoryId:
          Object.values(layout.mostViewedBlocks)[0]?.categoryId ??
          layout.sidebarMostViewedCategoryId,
        slideshowTextPosition: layout.sidebarSlideshowTextPosition,
        latestSlots: layout.sidebarLatestSlots.map((slot) => toDisplaySlot(slot, true)),
        categorySlots: layout.sidebarCategorySlots.map((slot) => toDisplaySlot(slot, false)),
        overlayListSlots: layout.sidebarOverlayListSlots.map((slot) => toDisplaySlot(slot, true)),
        articleListSlots: layout.sidebarArticleListSlots.map((slot) => toDisplaySlot(slot, true)),
        mostViewedSlots: (
          Object.values(layout.mostViewedBlocks)[0]?.slots ?? layout.sidebarMostViewedSlots
        ).map((slot) => toDisplaySlot(slot, false)),
        singleCategoryBlocks: Object.fromEntries(
          Object.entries(layout.singleCategoryBlocks).map(([id, block]) => [
            id,
            {
              categoryId: block.categoryId,
              count: block.count,
              slots: block.slots.map((slot) => toDisplaySlot(slot, true)),
            },
          ]),
        ),
        slideshowBlocks: Object.fromEntries(
          Object.entries(layout.slideshowBlocks).map(([id, block]) => [
            id,
            {
              count: block.count,
              textPosition: block.textPosition,
              slots: block.slots.map((slot) => toDisplaySlot(slot, true)),
            },
          ]),
        ),
        featuredVideoBlocks: Object.fromEntries(
          Object.entries(layout.featuredVideoBlocks).map(([id, block]) => [
            id,
            {
              title: block.title ?? '',
              source: block.source ?? 'link',
              url: block.source === 'post' ? null : block.url?.trim() || null,
              videoTitle: block.videoTitle?.trim() || null,
              categoryId: block.categoryId ?? null,
              postId: block.postId ?? block.post?.id ?? null,
            },
          ]),
        ),
        featuredArticleBlocks: Object.fromEntries(
          Object.entries(layout.featuredArticleBlocks).map(([id, block]) => [
            id,
            {
              title: block.title ?? '',
              postId: block.postId ?? block.post?.id ?? null,
              showDate: block.showDate ?? true,
              showAuthor: block.showAuthor ?? true,
            },
          ]),
        ),
        featuredPhotoBlocks: Object.fromEntries(
          Object.entries(layout.featuredPhotoBlocks).map(([id, block]) => [
            id,
            {
              title: block.title ?? '',
              caption: block.caption ?? '',
              imageUrl: block.imageUrl?.trim() || null,
            },
          ]),
        ),
        featuredStackBlocks: Object.fromEntries(
          Object.entries(layout.featuredStackBlocks).map(([id, block]) => [
            id,
            {
              title: block.title ?? '',
              secondaryCount: block.secondaryCount ?? 3,
              slots: block.slots.map((slot) => toDisplaySlot(slot, true)),
            },
          ]),
        ),
        mostViewedBlocks: Object.fromEntries(
          Object.entries(layout.mostViewedBlocks).map(([id, block]) => [
            id,
            {
              title: block.title ?? SIDEBAR_MOST_VIEWED_TITLE_DEFAULT,
              period: block.period ?? SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT,
              showCategory: block.showCategory ?? true,
              categoryId: block.categoryId ?? null,
              count: block.count ?? 5,
              slots: block.slots.map((slot) => toDisplaySlot(slot, false)),
            },
          ]),
        ),
        blockTypography: layout.sidebarBlockTypography,
        blockBackgroundColor: layout.sidebarBlockBackgroundColor,
        singleCategoryBlockTypography: layout.singleCategoryBlockTypography,
        singleCategoryBlockBackgroundColor: layout.singleCategoryBlockBackgroundColor,
        slideshowBlockTypography: layout.slideshowBlockTypography,
        slideshowBlockBackgroundColor: layout.slideshowBlockBackgroundColor,
        featuredVideoBlockTypography: layout.featuredVideoBlockTypography,
        featuredVideoBlockBackgroundColor: layout.featuredVideoBlockBackgroundColor,
        featuredArticleBlockTypography: layout.featuredArticleBlockTypography,
        featuredArticleBlockBackgroundColor: layout.featuredArticleBlockBackgroundColor,
        featuredPhotoBlockTypography: layout.featuredPhotoBlockTypography,
        featuredPhotoBlockBackgroundColor: layout.featuredPhotoBlockBackgroundColor,
        featuredStackBlockTypography: layout.featuredStackBlockTypography,
        featuredStackBlockBackgroundColor: layout.featuredStackBlockBackgroundColor,
        blockSummarySettings: layout.sidebarBlockSummarySettings,
        singleCategoryBlockSummarySettings: layout.singleCategoryBlockSummarySettings,
        slideshowBlockSummarySettings: layout.slideshowBlockSummarySettings,
        featuredArticleBlockSummarySettings: layout.featuredArticleBlockSummarySettings,
        featuredStackBlockSummarySettings: layout.featuredStackBlockSummarySettings,
      },
      articleLayoutMode: layout.articleLayoutMode ?? DEFAULT_ARTICLE_LAYOUT_MODE,
      articleMainTypography: normalizeModuleTypography(layout.articleMainTypography),
      articleMainShowSummary: layout.articleMainShowSummary,
      articleMainShowReadingTime: layout.articleMainShowReadingTime,
      ...(layout.articleMainSummaryRows != null
        ? { articleMainSummaryRows: layout.articleMainSummaryRows }
        : {}),
      ...(layout.articleMainSummaryTypography
        ? { articleMainSummaryTypography: layout.articleMainSummaryTypography }
        : {}),
      ...(layout.articleMainBumbiTypography
        ? { articleMainBumbiTypography: layout.articleMainBumbiTypography }
        : {}),
      ...(layout.articleMainPhotoCaptionTypography
        ? { articleMainPhotoCaptionTypography: layout.articleMainPhotoCaptionTypography }
        : {}),
      moduleTypographyPresets: normalizeModuleTypographyPresets(layout.moduleTypographyPresets),
      mobileModuleTypographyPresets: normalizeMobileModuleTypographyPresets(
        layout.mobileModuleTypographyPresets,
      ),
      mobileOrder: layout.mobileOrder,
      mobileModules: layout.mobileModules.map((m) => {
        const typography = normalizeModuleTypography(m.typography);
        const backgroundColor = normalizeModuleBackgroundColor(m.backgroundColor);
        const options: MobileLayoutModule['options'] = {
          name: m.name.trim() || null,
          categoryId: m.categoryId,
          showCategory: m.showCategory,
          showDate: m.showDate,
          showAuthor: m.showAuthor,
          showSummary: m.showSummary,
          showBumbi: m.showBumbi,
          ...(m.summaryRows != null ? { summaryRows: m.summaryRows } : {}),
          ...(m.summaryTypography ? { summaryTypography: m.summaryTypography } : {}),
          ...(m.heroSummaryTypography ? { heroSummaryTypography: m.heroSummaryTypography } : {}),
          ...(m.dateFormat ? { dateFormat: m.dateFormat } : {}),
          ...(m.showReadingTime ? { showReadingTime: true } : {}),
          ...(typography ? { typography } : {}),
          ...(backgroundColor ? { backgroundColor } : {}),
        };
        if (m.type === 'grid-2') {
          options.rowCount = normalizeMobileRowCount(m.rowCount);
        } else if (m.type === 'hero-list') {
          options.sideCount = normalizeMobileSideCount(m.sideCount);
        } else if (m.type === 'slideshow') {
          options.count = Math.max(1, Math.min(10, m.count));
        } else {
          options.count = Math.max(1, Math.min(50, m.count));
        }
        if (supportsMobileTextPosition(m.type)) {
          options.textPosition = m.textPosition;
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
    };
  }
}
