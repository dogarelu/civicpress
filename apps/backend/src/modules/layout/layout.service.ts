import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { mapPostSummary } from '../posts/posts.mapper';
import { PostStatus } from '@prisma/client';
import {
  PageLayoutConfigSchema,
  LayoutPageIdSchema,
  PinPostAtFrontSchema,
  countWithSidebarSections,
  sidebarFetchTotalForSections,
  sidebarBlockMode,
  isSidebarSingleCategoryEntry,
  isSidebarSlideshowEntry,
  isSidebarFeaturedVideoEntry,
  isSidebarFeaturedArticleEntry,
  isSidebarFeaturedPhotoEntry,
  isSidebarFeaturedStackEntry,
  isSidebarMostViewedEntry,
  effectiveMobileOrder,
  categoryColumnsSlotsPerColumn,
  defaultModuleShowCategory,
  defaultMobileModuleShowCategory,
  isCategoryColumnsModuleType,
  migrateLegacySummaryFromTypography,
  resolveShowBumbi,
  mobileModulePinnedIds,
  mobileModuleSlotCount,
  mobileTextPosition,
  normalizeMobileRowCount,
  normalizeMobileSideCount,
  normalizeModuleColumnCount,
  normalizeModulePicturesCount,
  normalizeModuleSideCount,
  normalizeModuleSmallCount,
  normalizeStickyBlocks,
  stickyLegacyMirror,
  ARTICLE_LIST_MAX_ITEMS,
  isArticleListModuleType,
  isPicturesModuleType,
  normalizeArticleListCount,
  standardModuleSlotCount,
  supportsModuleSideCount,
  SIDEBAR_SINGLE_CATEGORY_DEFAULT_ID,
  SIDEBAR_SLIDESHOW_DEFAULT_ID,
  SIDEBAR_MOST_VIEWED_DEFAULT_ID,
  type PageLayoutConfig,
  type LayoutDisplaySlot,
  type LayoutModule,
  type LayoutModuleSlot,
  type LayoutPageId,
  type CategoryStrip,
  type PostSummary,
  type ResolvedCategoryColumn,
  type ResolvedModule,
  type ResolvedMobileModule,
  type ResolvedRows4Row,
  type ResolvedSidebar,
  type SidebarConfig,
  type ModuleType,
  type MobileLayoutModule,
  type MobileLayoutUnit,
  type MostViewedPeriod,
} from '@civicpress/shared';

const POST_SUMMARY_INCLUDE = {
  heroMedia: true,
  postPills: { include: { pill: true } },
  author: true,
  categories: { include: { category: true } },
  bulbi: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      linkedPost: { select: { id: true, slug: true, title: true, status: true, deletedAt: true } },
    },
  },
} as const;

const PUBLISHED = { status: PostStatus.PUBLISHED };
/** Auto-fill pools skip video-module articles. Pinned slots still resolve them. */
const MODULE_POOL = { ...PUBLISHED, excludeFromModules: false };
const VIDEO_CATEGORY_SLUG = 'video';

/** Video-category surfaces still show articles created from a video module. */
function autoFillWhere(allowVideoModuleArticles: boolean) {
  return allowVideoModuleArticles ? PUBLISHED : MODULE_POOL;
}

/** Posts shown by a sidebar "latest" block. */
const SIDEBAR_LATEST_COUNT = 10;
/** Max metadata slots for sidebar list-like blocks. */
const SIDEBAR_SLOT_CAPACITY = 50;
/** Default slide count for right-sidebar slideshow blocks. */
const SIDEBAR_SLIDESHOW_COUNT = 5;
/** Posts per category widget in sidebar "categories" blocks. */
const SIDEBAR_STRIP_COUNT = 4;
/** Default video count for sidebar "video" blocks. */
const SIDEBAR_VIDEO_COUNT = 5;
/** Default article count for sidebar "overlay-list" blocks. */
const SIDEBAR_OVERLAY_LIST_COUNT = 5;
/** Default header label for sidebar "latest" blocks. */
const SIDEBAR_LATEST_TITLE = 'Ultimele știri';
/** Default header label for sidebar "overlay-list" blocks. */
const SIDEBAR_OVERLAY_LIST_TITLE = 'Ultimele știri';
/** Default article count for sidebar "article-list" blocks. */
const SIDEBAR_ARTICLE_LIST_COUNT = 5;
/** Default header label for sidebar "article-list" blocks. */
const SIDEBAR_ARTICLE_LIST_TITLE = 'Articole';
/** Default article count for sidebar "most-viewed" blocks. */
const SIDEBAR_MOST_VIEWED_COUNT = 5;
/** Default header label for sidebar "most-viewed" blocks. */
const SIDEBAR_MOST_VIEWED_TITLE = 'Cele mai citite';
/** Default publish-date window for sidebar "most-viewed" ranking. */
const SIDEBAR_MOST_VIEWED_PERIOD = 'year' as const;
/** Default article count for sidebar "single-category" blocks. */
const SIDEBAR_SINGLE_CATEGORY_COUNT = 4;
/** Default size of a `list` module when no count option is set. */
const DEFAULT_LIST_COUNT = 10;
/** Default slide count for `slideshow` modules. */
const DEFAULT_SLIDESHOW_COUNT = 5;
/** Default article count for `grid` modules (2×2). */
const DEFAULT_GRID_COUNT = 4;
const ROWS5_SLOT_COUNT = 5;
const ROWS4_SLOT_COUNT = 4;
const ROWS3_SLOT_COUNT = 3;
const CURRENT_YEAR_START = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

/** Earliest `publishedAt` for most-viewed ranking, or null for all published posts. */
function mostViewedGroupKey(period: MostViewedPeriod, categoryId: string | null): string {
  return `${period}:${categoryId ?? ''}`;
}

function resolveMostViewedBlockConfig(
  sidebar: SidebarConfig,
  blockEntry: PageLayoutConfig['sidebar']['blocks'][number],
): {
  blockId: string;
  title: string;
  period: MostViewedPeriod;
  showCategory: boolean;
  categoryId: string | null;
  count: number;
  slots: LayoutDisplaySlot[];
} {
  const blockId = isSidebarMostViewedEntry(blockEntry)
    ? blockEntry.id
    : SIDEBAR_MOST_VIEWED_DEFAULT_ID;
  const instance = sidebar.mostViewedBlocks?.[blockId];
  return {
    blockId,
    title: instance?.title ?? sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
    period: instance?.period ?? sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
    showCategory: instance?.showCategory ?? sidebar.mostViewedShowCategory ?? true,
    categoryId: instance?.categoryId ?? sidebar.mostViewedCategoryId ?? null,
    count: instance?.count ?? sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
    slots: instance?.slots?.length ? instance.slots : (sidebar.mostViewedSlots ?? []),
  };
}

function mostViewedPublishedSince(period: MostViewedPeriod): Date | null {
  const now = Date.now();
  switch (period) {
    case '24h':
      return new Date(now - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return CURRENT_YEAR_START;
    case 'all':
      return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function migrateLegacySummaryConfig(config: unknown): unknown {
  const root = asRecord(config);
  if (!root) return config;
  const next: Record<string, unknown> = { ...root };

  const modules = Array.isArray(root.modules) ? root.modules : null;
  if (modules) {
    next.modules = modules.map((moduleEntry) => {
      const moduleObj = asRecord(moduleEntry);
      if (!moduleObj) return moduleEntry;
      const options = asRecord(moduleObj.options) ?? {};
      const legacy = migrateLegacySummaryFromTypography(
        options.typography as Record<string, unknown> | null,
      );
      const migratedOptions: Record<string, unknown> = {
        ...options,
        ...(legacy.typography ? { typography: legacy.typography } : {}),
      };
      if (migratedOptions.summaryRows == null && legacy.summaryRows != null) {
        migratedOptions.summaryRows = legacy.summaryRows;
      }
      if (migratedOptions.summaryTypography == null && legacy.summaryTypography) {
        migratedOptions.summaryTypography = legacy.summaryTypography;
      }
      return { ...moduleObj, options: migratedOptions };
    });
  }

  const articleLegacy = migrateLegacySummaryFromTypography(
    root.articleMainTypography as Record<string, unknown> | null,
  );
  if (articleLegacy.typography) next.articleMainTypography = articleLegacy.typography;
  if (next.articleMainSummaryRows == null && articleLegacy.summaryRows != null) {
    next.articleMainSummaryRows = articleLegacy.summaryRows;
  }
  if (next.articleMainSummaryTypography == null && articleLegacy.summaryTypography) {
    next.articleMainSummaryTypography = articleLegacy.summaryTypography;
  }

  const sidebar = asRecord(root.sidebar);
  if (!sidebar) return next;
  const migratedSidebar: Record<string, unknown> = { ...sidebar };

  const blockTypography = asRecord(sidebar.blockTypography) ?? {};
  const blockSummarySettings = { ...(asRecord(sidebar.blockSummarySettings) ?? {}) };
  for (const [mode, typography] of Object.entries(blockTypography)) {
    const legacy = migrateLegacySummaryFromTypography(typography as Record<string, unknown>);
    blockTypography[mode] = legacy.typography as unknown;
    if (!blockSummarySettings[mode]) {
      const summary: Record<string, unknown> = {};
      if (legacy.summaryRows != null) summary.summaryRows = legacy.summaryRows;
      if (legacy.summaryTypography) summary.summaryTypography = legacy.summaryTypography;
      if (Object.keys(summary).length > 0) blockSummarySettings[mode] = summary;
    }
  }

  const singleTypo = asRecord(sidebar.singleCategoryBlockTypography) ?? {};
  const singleSummary = { ...(asRecord(sidebar.singleCategoryBlockSummarySettings) ?? {}) };
  for (const [blockId, typography] of Object.entries(singleTypo)) {
    const legacy = migrateLegacySummaryFromTypography(typography as Record<string, unknown>);
    singleTypo[blockId] = legacy.typography as unknown;
    if (!singleSummary[blockId]) {
      const summary: Record<string, unknown> = {};
      if (legacy.summaryRows != null) summary.summaryRows = legacy.summaryRows;
      if (legacy.summaryTypography) summary.summaryTypography = legacy.summaryTypography;
      if (Object.keys(summary).length > 0) singleSummary[blockId] = summary;
    }
  }

  const slideshowTypo = asRecord(sidebar.slideshowBlockTypography) ?? {};
  const slideshowSummary = { ...(asRecord(sidebar.slideshowBlockSummarySettings) ?? {}) };
  for (const [blockId, typography] of Object.entries(slideshowTypo)) {
    const legacy = migrateLegacySummaryFromTypography(typography as Record<string, unknown>);
    slideshowTypo[blockId] = legacy.typography as unknown;
    if (!slideshowSummary[blockId]) {
      const summary: Record<string, unknown> = {};
      if (legacy.summaryRows != null) summary.summaryRows = legacy.summaryRows;
      if (legacy.summaryTypography) summary.summaryTypography = legacy.summaryTypography;
      if (Object.keys(summary).length > 0) slideshowSummary[blockId] = summary;
    }
  }

  migratedSidebar.blockTypography = blockTypography;
  migratedSidebar.blockSummarySettings = blockSummarySettings;
  migratedSidebar.singleCategoryBlockTypography = singleTypo;
  migratedSidebar.singleCategoryBlockSummarySettings = singleSummary;
  migratedSidebar.slideshowBlockTypography = slideshowTypo;
  migratedSidebar.slideshowBlockSummarySettings = slideshowSummary;

  next.sidebar = migratedSidebar;
  return next;
}

function isRowsModuleType(type: ModuleType): boolean {
  return type === 'rows-5' || type === 'rows-4' || type === 'rows-3' || type === 'rows-4-sm';
}

function rowsModuleSlotCount(type: ModuleType): number {
  if (type === 'rows-5') return ROWS5_SLOT_COUNT;
  if (type === 'rows-4' || type === 'rows-4-sm') return ROWS4_SLOT_COUNT;
  if (type === 'rows-3') return ROWS3_SLOT_COUNT;
  return 0;
}

function categoryColumnsModuleSlotCount(mod: LayoutModule): number {
  const columnCount = normalizeModuleColumnCount(
    mod.options?.columnCount ?? mod.options?.columns?.length,
  );
  const perColumn = categoryColumnsSlotsPerColumn(mod.options?.smallCount);
  return columnCount * perColumn;
}
const DEFAULT_DISPLAY_SLOT = {
  postId: null as string | null,
  showDate: true,
  showAuthor: true,
} as const;

function applyModuleDisplayFlags(
  slot: { showDate: boolean; showAuthor: boolean },
  options?: { showDate?: boolean; showAuthor?: boolean } | null,
): { showDate: boolean; showAuthor: boolean } {
  return {
    showDate: (options?.showDate ?? true) && slot.showDate,
    showAuthor: (options?.showAuthor ?? true) && slot.showAuthor,
  };
}

function displaySlotPinnedIds(slots: LayoutDisplaySlot[] | undefined): string[] {
  return (slots ?? []).map((slot) => slot.postId).filter((id): id is string => id !== null);
}

/** Pinned article ids from sidebar blocks that support manual selection (not most-viewed). */
function sidebarPinnedIds(sidebar: SidebarConfig): string[] {
  if (!sidebar.enabled) return [];
  const ids: string[] = [];
  const modes = new Set(sidebar.blocks.map((entry) => sidebarBlockMode(entry)));
  if (modes.has('latest')) ids.push(...displaySlotPinnedIds(sidebar.latestSlots));
  if (modes.has('overlay-list')) ids.push(...displaySlotPinnedIds(sidebar.overlayListSlots));
  if (modes.has('article-list')) ids.push(...displaySlotPinnedIds(sidebar.articleListSlots));
  if (modes.has('video')) {
    for (const item of sidebar.videoItems ?? []) {
      if (item.postId) ids.push(item.postId);
    }
  }
  for (const entry of sidebar.blocks) {
    if (isSidebarSlideshowEntry(entry)) {
      const slots = sidebar.slideshowBlocks?.[entry.id]?.slots ?? sidebar.latestSlots;
      ids.push(...displaySlotPinnedIds(slots));
    } else if (sidebarBlockMode(entry) === 'slideshow') {
      const slots =
        sidebar.slideshowBlocks?.[SIDEBAR_SLIDESHOW_DEFAULT_ID]?.slots ?? sidebar.latestSlots;
      ids.push(...displaySlotPinnedIds(slots));
    }
    if (isSidebarSingleCategoryEntry(entry)) {
      const slots =
        sidebar.singleCategoryBlocks?.[entry.id]?.slots ?? sidebar.singleCategorySlots ?? [];
      ids.push(...displaySlotPinnedIds(slots));
    } else if (sidebarBlockMode(entry) === 'single-category') {
      const slots =
        sidebar.singleCategoryBlocks?.[SIDEBAR_SINGLE_CATEGORY_DEFAULT_ID]?.slots ??
        sidebar.singleCategorySlots ??
        [];
      ids.push(...displaySlotPinnedIds(slots));
    }
    if (isSidebarFeaturedVideoEntry(entry)) {
      const postId = sidebar.featuredVideoBlocks?.[entry.id]?.postId;
      if (postId) ids.push(postId);
    }
    if (isSidebarFeaturedArticleEntry(entry)) {
      const postId = sidebar.featuredArticleBlocks?.[entry.id]?.postId;
      if (postId) ids.push(postId);
    }
    if (isSidebarFeaturedStackEntry(entry)) {
      const slots = sidebar.featuredStackBlocks?.[entry.id]?.slots ?? [];
      ids.push(...displaySlotPinnedIds(slots));
    }
  }
  return ids;
}

/**
 * Pins already shown in the right column (video-list + any sidebar block).
 * Video-category modules may repeat these instead of holding them for the pin.
 */
function videoColumnPinnedIds(config: PageLayoutConfig): string[] {
  const ids: string[] = [];
  for (const mod of config.modules) {
    if (mod.type !== 'video-list') continue;
    for (const item of mod.options?.videoItems ?? []) {
      if (item.postId) ids.push(item.postId);
    }
  }
  ids.push(...sidebarPinnedIds(config.sidebar));
  return ids;
}

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function fillPostsFromSlots(
  count: number,
  slots: LayoutDisplaySlot[],
  pinnedById: Map<string, PostSummary>,
  usedIds: Set<string>,
  nextAuto: () => PostSummary | null,
  allowPin: boolean,
): PostSummary[] {
  const posts: PostSummary[] = [];
  for (let i = 0; i < count; i++) {
    const slotConfig = slots[i] ?? DEFAULT_DISPLAY_SLOT;
    const pinnedId = allowPin ? slotConfig.postId : null;
    let post: PostSummary | null = null;
    if (pinnedId && pinnedById.has(pinnedId) && !usedIds.has(pinnedId)) {
      post = pinnedById.get(pinnedId)!;
    } else {
      post = nextAuto();
    }
    if (!post) break;
    usedIds.add(post.id);
    posts.push(post);
  }
  return posts;
}

export const DEFAULT_LAYOUTS: Record<LayoutPageId, PageLayoutConfig> = {
  home: {
    modules: [
      {
        id: 'home-hero-top-list',
        type: 'hero-top-list',
        options: { name: null, categoryId: null, showCategory: false },
        slots: Array.from({ length: 4 }, () => ({
          postId: null,
          showDate: true,
          showAuthor: true,
        })),
      },
      {
        id: 'home-list',
        type: 'list',
        options: { name: null, categoryId: null, count: 10, showCategory: false },
        slots: [],
      },
    ],
    sidebar: {
      enabled: true,
      blocks: ['categories'],
      slideshowCount: SIDEBAR_SLIDESHOW_COUNT,
      latestCount: SIDEBAR_LATEST_COUNT,
      videoCount: SIDEBAR_VIDEO_COUNT,
      videoItems: [],
      overlayListCount: SIDEBAR_OVERLAY_LIST_COUNT,
      latestTitle: SIDEBAR_LATEST_TITLE,
      overlayListTitle: SIDEBAR_OVERLAY_LIST_TITLE,
      articleListCount: SIDEBAR_ARTICLE_LIST_COUNT,
      articleListTitle: SIDEBAR_ARTICLE_LIST_TITLE,
      mostViewedCount: SIDEBAR_MOST_VIEWED_COUNT,
      mostViewedTitle: SIDEBAR_MOST_VIEWED_TITLE,
      mostViewedPeriod: SIDEBAR_MOST_VIEWED_PERIOD,
      mostViewedShowCategory: true,
      mostViewedCategoryId: null,
      latestShowCategory: true,
      singleCategoryCount: SIDEBAR_SINGLE_CATEGORY_COUNT,
      singleCategoryId: null,
      slideshowTextPosition: 'on-image',
      latestSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      categorySlots: Array.from({ length: SIDEBAR_STRIP_COUNT }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      overlayListSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      articleListSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      mostViewedSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      singleCategorySlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      singleCategoryBlocks: {},
      singleCategoryBlockTypography: {},
      singleCategoryBlockBackgroundColor: {},
      singleCategoryBlockSummarySettings: {},
      slideshowBlocks: {},
      slideshowBlockTypography: {},
      slideshowBlockBackgroundColor: {},
      slideshowBlockSummarySettings: {},
      featuredVideoBlocks: {},
      featuredVideoBlockTypography: {},
      featuredVideoBlockBackgroundColor: {},
      featuredArticleBlocks: {},
      featuredArticleBlockTypography: {},
      featuredArticleBlockBackgroundColor: {},
      featuredArticleBlockSummarySettings: {},
      featuredPhotoBlocks: {},
      featuredPhotoBlockTypography: {},
      featuredPhotoBlockBackgroundColor: {},
      featuredStackBlocks: {},
      featuredStackBlockTypography: {},
      featuredStackBlockBackgroundColor: {},
      featuredStackBlockSummarySettings: {},
      mostViewedBlocks: {},
      blockTypography: {},
      blockBackgroundColor: {},
      blockSummarySettings: {},
      stickyBlocks: [],
      stickyFirstBlock: false,
      stickyUntilModuleId: null,
    },
    articleLayoutMode: 'classic',
    articleMainShowSummary: true,
    moduleTypographyPresets: {},
    mobileModuleTypographyPresets: {},
    mobileOrder: [],
    mobileModules: [],
  },
  category: {
    modules: [
      {
        id: 'cat-list',
        type: 'list',
        options: { name: null, categoryId: null, count: 15, showCategory: false },
        slots: [],
      },
    ],
    sidebar: {
      enabled: false,
      blocks: ['latest'],
      slideshowCount: SIDEBAR_SLIDESHOW_COUNT,
      latestCount: SIDEBAR_LATEST_COUNT,
      videoCount: SIDEBAR_VIDEO_COUNT,
      videoItems: [],
      overlayListCount: SIDEBAR_OVERLAY_LIST_COUNT,
      latestTitle: SIDEBAR_LATEST_TITLE,
      overlayListTitle: SIDEBAR_OVERLAY_LIST_TITLE,
      articleListCount: SIDEBAR_ARTICLE_LIST_COUNT,
      articleListTitle: SIDEBAR_ARTICLE_LIST_TITLE,
      mostViewedCount: SIDEBAR_MOST_VIEWED_COUNT,
      mostViewedTitle: SIDEBAR_MOST_VIEWED_TITLE,
      mostViewedPeriod: SIDEBAR_MOST_VIEWED_PERIOD,
      mostViewedShowCategory: true,
      mostViewedCategoryId: null,
      latestShowCategory: true,
      singleCategoryCount: SIDEBAR_SINGLE_CATEGORY_COUNT,
      singleCategoryId: null,
      slideshowTextPosition: 'on-image',
      latestSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      categorySlots: Array.from({ length: SIDEBAR_STRIP_COUNT }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      overlayListSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      articleListSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      mostViewedSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      singleCategorySlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      singleCategoryBlocks: {},
      singleCategoryBlockTypography: {},
      singleCategoryBlockBackgroundColor: {},
      singleCategoryBlockSummarySettings: {},
      slideshowBlocks: {},
      slideshowBlockTypography: {},
      slideshowBlockBackgroundColor: {},
      slideshowBlockSummarySettings: {},
      featuredVideoBlocks: {},
      featuredVideoBlockTypography: {},
      featuredVideoBlockBackgroundColor: {},
      featuredArticleBlocks: {},
      featuredArticleBlockTypography: {},
      featuredArticleBlockBackgroundColor: {},
      featuredArticleBlockSummarySettings: {},
      featuredPhotoBlocks: {},
      featuredPhotoBlockTypography: {},
      featuredPhotoBlockBackgroundColor: {},
      featuredStackBlocks: {},
      featuredStackBlockTypography: {},
      featuredStackBlockBackgroundColor: {},
      featuredStackBlockSummarySettings: {},
      mostViewedBlocks: {},
      blockTypography: {},
      blockBackgroundColor: {},
      blockSummarySettings: {},
      stickyBlocks: [],
      stickyFirstBlock: false,
      stickyUntilModuleId: null,
    },
    articleLayoutMode: 'classic',
    articleMainShowSummary: true,
    moduleTypographyPresets: {},
    mobileModuleTypographyPresets: {},
    mobileOrder: [],
    mobileModules: [],
  },
  article: {
    modules: [],
    sidebar: {
      enabled: false,
      blocks: ['latest'],
      slideshowCount: SIDEBAR_SLIDESHOW_COUNT,
      latestCount: SIDEBAR_LATEST_COUNT,
      videoCount: SIDEBAR_VIDEO_COUNT,
      videoItems: [],
      overlayListCount: SIDEBAR_OVERLAY_LIST_COUNT,
      latestTitle: SIDEBAR_LATEST_TITLE,
      overlayListTitle: SIDEBAR_OVERLAY_LIST_TITLE,
      articleListCount: SIDEBAR_ARTICLE_LIST_COUNT,
      articleListTitle: SIDEBAR_ARTICLE_LIST_TITLE,
      mostViewedCount: SIDEBAR_MOST_VIEWED_COUNT,
      mostViewedTitle: SIDEBAR_MOST_VIEWED_TITLE,
      mostViewedPeriod: SIDEBAR_MOST_VIEWED_PERIOD,
      mostViewedShowCategory: true,
      mostViewedCategoryId: null,
      latestShowCategory: true,
      singleCategoryCount: SIDEBAR_SINGLE_CATEGORY_COUNT,
      singleCategoryId: null,
      slideshowTextPosition: 'on-image',
      latestSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      categorySlots: Array.from({ length: SIDEBAR_STRIP_COUNT }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      overlayListSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      articleListSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      mostViewedSlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      singleCategorySlots: Array.from({ length: SIDEBAR_SLOT_CAPACITY }, () => ({
        ...DEFAULT_DISPLAY_SLOT,
      })),
      singleCategoryBlocks: {},
      singleCategoryBlockTypography: {},
      singleCategoryBlockBackgroundColor: {},
      singleCategoryBlockSummarySettings: {},
      slideshowBlocks: {},
      slideshowBlockTypography: {},
      slideshowBlockBackgroundColor: {},
      slideshowBlockSummarySettings: {},
      featuredVideoBlocks: {},
      featuredVideoBlockTypography: {},
      featuredVideoBlockBackgroundColor: {},
      featuredArticleBlocks: {},
      featuredArticleBlockTypography: {},
      featuredArticleBlockBackgroundColor: {},
      featuredArticleBlockSummarySettings: {},
      featuredPhotoBlocks: {},
      featuredPhotoBlockTypography: {},
      featuredPhotoBlockBackgroundColor: {},
      featuredStackBlocks: {},
      featuredStackBlockTypography: {},
      featuredStackBlockBackgroundColor: {},
      featuredStackBlockSummarySettings: {},
      mostViewedBlocks: {},
      blockTypography: {},
      blockBackgroundColor: {},
      blockSummarySettings: {},
      stickyBlocks: [],
      stickyFirstBlock: false,
      stickyUntilModuleId: null,
    },
    articleLayoutMode: 'classic',
    articleMainShowSummary: true,
    moduleTypographyPresets: {},
    mobileModuleTypographyPresets: {},
    mobileOrder: [],
    mobileModules: [],
  },
};

function moduleSlotCount(mod: LayoutModule): number {
  const standard = standardModuleSlotCount(mod.type, {
    count:
      mod.type === 'list'
        ? (mod.options?.count ?? DEFAULT_LIST_COUNT)
        : mod.type === 'grid'
          ? (mod.options?.count ?? DEFAULT_GRID_COUNT)
          : mod.type === 'slideshow' || mod.type === 'hero-slideshow'
            ? (mod.options?.count ?? DEFAULT_SLIDESHOW_COUNT)
            : isPicturesModuleType(mod.type)
              ? normalizeModulePicturesCount(mod.options?.count)
              : isArticleListModuleType(mod.type)
                ? normalizeArticleListCount(mod.options?.count)
                : mod.options?.count,
    sideCount: mod.options?.sideCount,
  });
  if (standard != null) return standard;

  switch (mod.type) {
    case 'rows-5':
      return (mod.options?.rows ?? []).reduce(
        (sum, row) => sum + (row.repeatCount ?? 1) * ROWS5_SLOT_COUNT,
        0,
      );
    case 'rows-4':
    case 'rows-4-sm':
      return (mod.options?.rows ?? []).reduce(
        (sum, row) => sum + (row.repeatCount ?? 1) * ROWS4_SLOT_COUNT,
        0,
      );
    case 'rows-3':
      return (mod.options?.rows ?? []).reduce(
        (sum, row) => sum + (row.repeatCount ?? 1) * ROWS3_SLOT_COUNT,
        0,
      );
    case 'category-columns':
      return categoryColumnsModuleSlotCount(mod);
    default:
      return 0;
  }
}

function modulePinnedIds(mod: LayoutModule): string[] {
  if (isRowsModuleType(mod.type)) {
    return (mod.options?.rows ?? [])
      .flatMap((row) => row.slots)
      .map((slot) => slot.postId)
      .filter((id): id is string => id !== null);
  }
  if (isCategoryColumnsModuleType(mod.type)) {
    return (mod.options?.columns ?? [])
      .flatMap((col) => col.slots)
      .map((slot) => slot.postId)
      .filter((id): id is string => id !== null);
  }
  if (mod.type === 'video-list') {
    return (mod.options?.videoItems ?? [])
      .map((item) => item.postId)
      .filter((id): id is string => !!id);
  }
  return mod.slots.map((slot) => slot.postId).filter((id): id is string => id !== null);
}

function resizeModuleSlots(slots: LayoutModuleSlot[], capacity: number): LayoutModuleSlot[] {
  const next = slots.slice(0, capacity);
  while (next.length < capacity) {
    next.push({ ...DEFAULT_DISPLAY_SLOT });
  }
  return next;
}

/** Move post to front of slot list, dedupe, and truncate to capacity. */
function frontInsertSlots(
  slots: LayoutModuleSlot[],
  capacity: number,
  postId: string,
): LayoutModuleSlot[] {
  const sized = resizeModuleSlots(slots, capacity);
  const existingIds = sized.map((s) => s.postId).filter((id): id is string => id !== null);
  const withoutTarget = existingIds.filter((id) => id !== postId);
  const newIds = [postId, ...withoutTarget].slice(0, capacity);

  const slotByPostId = new Map<string, LayoutModuleSlot>();
  for (const slot of sized) {
    if (slot.postId) slotByPostId.set(slot.postId, slot);
  }

  const result: LayoutModuleSlot[] = newIds.map(
    (id) => slotByPostId.get(id) ?? { ...DEFAULT_DISPLAY_SLOT, postId: id },
  );
  while (result.length < capacity) {
    result.push({ ...DEFAULT_DISPLAY_SLOT });
  }
  return result.slice(0, capacity);
}

@Injectable()
export class LayoutService {
  constructor(private prisma: PrismaService) {}

  private mapLayoutPostSummary(row: Parameters<typeof mapPostSummary>[0]) {
    return mapPostSummary(row, { forceShowSummary: true });
  }

  // ─── Config storage ──────────────────────────────────────────────────────

  async getConfig(page: LayoutPageId): Promise<PageLayoutConfig> {
    const row = await this.prisma.pageLayout.findUnique({ where: { id: page } });
    if (!row) return DEFAULT_LAYOUTS[page];
    const parsed = PageLayoutConfigSchema.safeParse(migrateLegacySummaryConfig(row.config));
    return parsed.success ? parsed.data : DEFAULT_LAYOUTS[page];
  }

  async getAdminLayouts() {
    const [home, category, article] = await Promise.all([
      this.getConfig('home'),
      this.getConfig('category'),
      this.getConfig('article'),
    ]);

    const pinnedIds = [
      ...new Set(
        [home, category, article].flatMap((c) => [
          ...c.modules.flatMap((m) => modulePinnedIds(m)),
          ...sidebarPinnedIds(c.sidebar),
        ]),
      ),
    ];

    const posts: Record<string, PostSummary> = {};
    if (pinnedIds.length > 0) {
      const rows = await this.prisma.post.findMany({
        where: { id: { in: pinnedIds } },
        include: POST_SUMMARY_INCLUDE,
      });
      for (const row of rows) posts[row.id] = this.mapLayoutPostSummary(row);
    }

    return { home, category, article, posts };
  }

  async saveLayout(page: string, config: unknown) {
    const pageId = LayoutPageIdSchema.safeParse(page);
    if (!pageId.success) throw new BadRequestException(`Unknown layout page: ${page}`);

    const parsed = PageLayoutConfigSchema.safeParse(config);
    if (!parsed.success) {
      throw new BadRequestException(`Invalid layout config: ${parsed.error.message}`);
    }
    if (parsed.data.modules.length > 20) {
      throw new BadRequestException('Too many modules (max 20)');
    }
    if (parsed.data.mobileModules.length > 20) {
      throw new BadRequestException('Too many mobile modules (max 20)');
    }

    for (const mod of parsed.data.mobileModules) {
      if (mod.type === 'slideshow') {
        const count = mod.options?.count ?? DEFAULT_SLIDESHOW_COUNT;
        if (count < 1 || count > 10) {
          throw new BadRequestException('Mobile slideshow count must be between 1 and 10');
        }
      }
      if (mod.type === 'grid-2') {
        const rows = normalizeMobileRowCount(mod.options?.rowCount);
        if (rows < 1 || rows > 20) {
          throw new BadRequestException('Mobile grid row count must be between 1 and 20');
        }
      }
    }

    for (const mod of parsed.data.modules) {
      if (mod.type === 'slideshow' || mod.type === 'hero-slideshow') {
        const count = mod.options?.count ?? DEFAULT_SLIDESHOW_COUNT;
        if (count < 1 || count > 10) {
          throw new BadRequestException('Slideshow count must be between 1 and 10');
        }
      }
      if (mod.type === 'grid') {
        const count = mod.options?.count ?? DEFAULT_GRID_COUNT;
        if (count < 1 || count > 12) {
          throw new BadRequestException('Grid count must be between 1 and 12');
        }
      }
      if (isArticleListModuleType(mod.type)) {
        const count = normalizeArticleListCount(mod.options?.count);
        if (count < 1 || count > ARTICLE_LIST_MAX_ITEMS) {
          throw new BadRequestException(
            `Article-list count must be between 1 and ${ARTICLE_LIST_MAX_ITEMS}`,
          );
        }
      }
      if (isRowsModuleType(mod.type)) {
        for (const row of mod.options?.rows ?? []) {
          if (row.kind === 'category' && !row.categoryId) {
            throw new BadRequestException('Category rows require a category');
          }
        }
      }
      if (isCategoryColumnsModuleType(mod.type)) {
        const columns = mod.options?.columns ?? [];
        if (columns.length < 3 || columns.length > 5) {
          throw new BadRequestException('Category columns modules require 3–5 columns');
        }
        for (const col of columns) {
          if (!col.categoryId) {
            throw new BadRequestException('Each category column requires a category');
          }
        }
      }
    }

    await this.prisma.pageLayout.upsert({
      where: { id: pageId.data },
      create: { id: pageId.data, config: parsed.data },
      update: { config: parsed.data },
    });

    return { ok: true };
  }

  /**
   * Pin a post at the front of a layout module's slot list (dedupe + drop overflow).
   * Used from the post editor when assigning an article to a named module.
   */
  async pinPostAtFront(body: unknown) {
    const parsed = PinPostAtFrontSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(`Invalid pin request: ${parsed.error.message}`);
    }

    const { postId, categoryId, page, moduleId, rowId } = parsed.data;

    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        categories: { some: { categoryId } },
      },
    });
    if (!post) {
      throw new BadRequestException('Post not found or does not belong to the selected category');
    }

    const config = await this.getConfig(page);
    const modIndex = config.modules.findIndex((m) => m.id === moduleId);
    if (modIndex === -1) {
      throw new BadRequestException('Module not found');
    }

    const mod = config.modules[modIndex];

    if (mod.type === 'video-list') {
      throw new BadRequestException('Video-list modules use manual video items, not pin slots');
    }

    if (isRowsModuleType(mod.type)) {
      if (!rowId) {
        throw new BadRequestException('rowId is required for rows modules');
      }
      const rows = mod.options?.rows ?? [];
      const rowIndex = rows.findIndex((r) => r.id === rowId);
      if (rowIndex === -1) {
        throw new BadRequestException('Row not found');
      }
      const row = rows[rowIndex];

      if (
        page === 'home' &&
        row.kind === 'category' &&
        row.categoryId &&
        row.categoryId !== categoryId
      ) {
        throw new BadRequestException('Row does not match the selected category');
      }

      const slotCapacity = rowsModuleSlotCount(mod.type);
      const updatedRows = [...rows];
      updatedRows[rowIndex] = {
        ...row,
        slots: frontInsertSlots(row.slots, slotCapacity, postId),
      };

      config.modules[modIndex] = {
        ...mod,
        options: { ...mod.options, rows: updatedRows },
      };
    } else if (isCategoryColumnsModuleType(mod.type)) {
      if (!rowId) {
        throw new BadRequestException('rowId is required for category-columns modules');
      }
      const columns = mod.options?.columns ?? [];
      const colIndex = columns.findIndex((c) => c.id === rowId);
      if (colIndex === -1) {
        throw new BadRequestException('Column not found');
      }
      const col = columns[colIndex];
      if (page === 'home' && col.categoryId && col.categoryId !== categoryId) {
        throw new BadRequestException('Column does not match the selected category');
      }
      const slotCapacity = categoryColumnsSlotsPerColumn(mod.options?.smallCount);
      const updatedColumns = [...columns];
      updatedColumns[colIndex] = {
        ...col,
        slots: frontInsertSlots(col.slots, slotCapacity, postId),
      };
      config.modules[modIndex] = {
        ...mod,
        options: { ...mod.options, columns: updatedColumns },
      };
    } else {
      const capacity = moduleSlotCount(mod);
      config.modules[modIndex] = {
        ...mod,
        slots: frontInsertSlots(mod.slots, capacity, postId),
      };
    }

    await this.saveLayout(page, config);
    return { ok: true };
  }

  // ─── Public resolution ───────────────────────────────────────────────────

  async getPublicHome() {
    const config = await this.getConfig('home');
    return this.resolve(config, { scaleSidebarForSegments: true });
  }

  /** Slot capacity used as category pagination page size (desktop/mobile max). */
  categoryLayoutPageSize(config: PageLayoutConfig): number {
    const moduleNeed = config.modules.map(moduleSlotCount).reduce((a, b) => a + b, 0);
    const mobileNeed = (config.mobileModules ?? [])
      .map(mobileModuleSlotCount)
      .reduce((a, b) => a + b, 0);
    return Math.max(moduleNeed, mobileNeed, 1);
  }

  /** Resolved category layout — modules auto-fill with the category's posts. */
  async resolveCategoryLayout(categoryId: string, opts?: { skip?: number }) {
    const config = await this.getConfig('category');
    return this.resolve(config, {
      categoryId,
      scaleSidebarForSegments: true,
      skip: opts?.skip ?? 0,
    });
  }

  /** Article page sidebar (null when disabled). Excludes the article itself. */
  async getArticleSidebar(excludePostId?: string): Promise<ResolvedSidebar | null> {
    const { sidebar } = await this.getArticleLayout(excludePostId);
    return sidebar;
  }

  /** Article page layout (main modules + sidebar). Excludes the article itself. */
  async getArticleLayout(excludePostId?: string): Promise<{
    modules: ResolvedModule[];
    sidebar: ResolvedSidebar | null;
    mobileModules: ResolvedMobileModule[];
    articleLayoutMode: PageLayoutConfig['articleLayoutMode'];
    articleMainTypography: PageLayoutConfig['articleMainTypography'] | null;
    articleMainShowSummary: boolean;
    articleMainShowReadingTime: boolean;
    articleMainSummaryRows: number | null;
    articleMainSummaryTypography: PageLayoutConfig['articleMainSummaryTypography'] | null;
    articleMainBumbiTypography: PageLayoutConfig['articleMainBumbiTypography'] | null;
    articleMainPhotoCaptionTypography: PageLayoutConfig['articleMainPhotoCaptionTypography'] | null;
    mobileOrder: MobileLayoutUnit[];
  }> {
    const config = await this.getConfig('article');
    const resolved = await this.resolve(config, {
      excludeIds: excludePostId ? [excludePostId] : [],
    });
    return {
      ...resolved,
      articleLayoutMode: config.articleLayoutMode ?? 'classic',
      articleMainTypography:
        migrateLegacySummaryFromTypography(config.articleMainTypography ?? null).typography ?? null,
      articleMainShowSummary: config.articleMainShowSummary ?? true,
      articleMainShowReadingTime: config.articleMainShowReadingTime ?? false,
      articleMainSummaryRows:
        config.articleMainSummaryRows ??
        migrateLegacySummaryFromTypography(config.articleMainTypography ?? null).summaryRows ??
        null,
      articleMainSummaryTypography:
        config.articleMainSummaryTypography ??
        migrateLegacySummaryFromTypography(config.articleMainTypography ?? null)
          .summaryTypography ??
        null,
      articleMainBumbiTypography: config.articleMainBumbiTypography ?? null,
      articleMainPhotoCaptionTypography: config.articleMainPhotoCaptionTypography ?? null,
    };
  }

  /**
   * Fill a layout config with posts, top to bottom, then the sidebar.
   * Pinned posts win when still published. Unfiltered modules fall back to the
   * most recent published post not yet used on the page. Modules, rows, and
   * columns with an exact category always take that category's newest posts,
   * even if those posts already appear in another homepage module.
   */
  private async resolve(
    config: PageLayoutConfig,
    opts: {
      categoryId?: string;
      excludeIds?: string[];
      scaleSidebarForSegments?: boolean;
      /** Skip this many newest category posts before auto-fill (category pagination). */
      skip?: number;
    },
  ): Promise<{
    modules: ResolvedModule[];
    sidebar: ResolvedSidebar | null;
    mobileOrder: MobileLayoutUnit[];
    mobileModules: ResolvedMobileModule[];
  }> {
    const usedIds = new Set<string>(opts.excludeIds ?? []);
    const poolSkip = Math.max(0, opts.skip ?? 0);
    // Pinned slots only apply on the first slice — later pages auto-fill only.
    const applyPins = poolSkip === 0;
    const sidebarSectionCount = opts.scaleSidebarForSegments
      ? Math.max(1, countWithSidebarSections(config.modules))
      : 1;
    const videoScopeIds = await this.videoCategoryScopeIds();

    const moduleWhere = {
      ...autoFillWhere(!!opts.categoryId && videoScopeIds.has(opts.categoryId)),
      ...(opts.categoryId ? { categories: { some: { categoryId: opts.categoryId } } } : {}),
    };

    const videoWhere = {
      ...MODULE_POOL,
      videoUrl: { not: null },
    };

    const slotCounts = config.modules.map(moduleSlotCount);
    const moduleNeed = slotCounts.reduce((a, b) => a + b, 0);
    const mobileModulesConfig = config.mobileModules ?? [];
    const mobileSlotCounts = mobileModulesConfig.map(mobileModuleSlotCount);
    const mobileNeed = mobileSlotCounts.reduce((a, b) => a + b, 0);
    const sidebarBlocks = config.sidebar.enabled ? config.sidebar.blocks : [];
    const sidebarFeedNeed = sidebarBlocks.reduce((total, blockEntry) => {
      const block = sidebarBlockMode(blockEntry);
      if (block === 'latest') {
        return (
          total +
          sidebarFetchTotalForSections(
            sidebarSectionCount,
            config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
          )
        );
      }
      if (block === 'slideshow') {
        const blockId = isSidebarSlideshowEntry(blockEntry)
          ? blockEntry.id
          : SIDEBAR_SLIDESHOW_DEFAULT_ID;
        const blockConfig = config.sidebar.slideshowBlocks?.[blockId];
        const count =
          blockConfig?.count ?? config.sidebar.slideshowCount ?? SIDEBAR_SLIDESHOW_COUNT;
        return total + sidebarFetchTotalForSections(sidebarSectionCount, count);
      }
      if (block === 'video') {
        return (
          total +
          sidebarFetchTotalForSections(
            sidebarSectionCount,
            config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
          )
        );
      }
      if (block === 'overlay-list') {
        return (
          total +
          sidebarFetchTotalForSections(
            sidebarSectionCount,
            config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
          )
        );
      }
      if (block === 'article-list') {
        return (
          total +
          sidebarFetchTotalForSections(
            sidebarSectionCount,
            config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
          )
        );
      }
      if (block === 'most-viewed') {
        const mostViewed = resolveMostViewedBlockConfig(config.sidebar, blockEntry);
        return total + sidebarFetchTotalForSections(sidebarSectionCount, mostViewed.count);
      }
      if (block === 'featured-stack' && isSidebarFeaturedStackEntry(blockEntry)) {
        const secondaryCount =
          config.sidebar.featuredStackBlocks?.[blockEntry.id]?.secondaryCount ?? 3;
        const count = 1 + secondaryCount;
        return total + sidebarFetchTotalForSections(sidebarSectionCount, count);
      }
      return total;
    }, 0);
    const mostViewedGroups = new Map<
      string,
      { period: MostViewedPeriod; categoryId: string | null; need: number }
    >();
    for (const blockEntry of sidebarBlocks) {
      if (sidebarBlockMode(blockEntry) !== 'most-viewed') continue;
      const mostViewed = resolveMostViewedBlockConfig(config.sidebar, blockEntry);
      const key = mostViewedGroupKey(mostViewed.period, mostViewed.categoryId);
      const existing = mostViewedGroups.get(key);
      const need = sidebarFetchTotalForSections(sidebarSectionCount, mostViewed.count);
      if (existing) {
        existing.need += need;
      } else {
        mostViewedGroups.set(key, {
          period: mostViewed.period,
          categoryId: mostViewed.categoryId,
          need,
        });
      }
    }
    const mostViewedGroupEntries = [...mostViewedGroups.entries()];
    const sidebarVideoNeed = sidebarBlocks
      .filter((blockEntry) => sidebarBlockMode(blockEntry) === 'video')
      .reduce(
        (total) =>
          total +
          sidebarFetchTotalForSections(
            sidebarSectionCount,
            config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
          ),
        0,
      );
    const useGlobalPoolForSidebarFeed =
      !!opts.categoryId &&
      config.sidebar.enabled &&
      sidebarBlocks.some((blockEntry) => {
        const mode = sidebarBlockMode(blockEntry);
        return (
          mode === 'latest' ||
          mode === 'slideshow' ||
          mode === 'video' ||
          mode === 'overlay-list' ||
          mode === 'article-list' ||
          mode === 'most-viewed' ||
          mode === 'featured-stack'
        );
      });

    const pinnedIds = applyPins
      ? [
          ...new Set([
            ...config.modules.flatMap((m) => modulePinnedIds(m)),
            ...mobileModulesConfig.flatMap((m) => mobileModulePinnedIds(m)),
            ...sidebarPinnedIds(config.sidebar),
          ]),
        ]
      : [];
    const poolTakeNeed = Math.max(moduleNeed, mobileNeed);

    const [
      pinnedRows,
      poolRows,
      sidebarLatestRows,
      sidebarVideoRows,
      ...sidebarMostViewedGroupRows
    ] = await Promise.all([
      pinnedIds.length > 0
        ? this.prisma.post.findMany({
            where: { id: { in: pinnedIds }, ...PUBLISHED },
            include: POST_SUMMARY_INCLUDE,
          })
        : Promise.resolve([]),
      poolTakeNeed > 0 || sidebarFeedNeed > 0
        ? this.prisma.post.findMany({
            where: moduleWhere,
            orderBy: { publishedAt: 'desc' },
            skip: poolSkip,
            // +1 extra row so we can tell whether more articles remain after filling.
            take: poolTakeNeed + sidebarFeedNeed + pinnedIds.length + usedIds.size + 1,
            include: POST_SUMMARY_INCLUDE,
          })
        : Promise.resolve([]),
      useGlobalPoolForSidebarFeed && sidebarFeedNeed > 0
        ? this.prisma.post.findMany({
            where: MODULE_POOL,
            orderBy: { publishedAt: 'desc' },
            // +1 extra row so we can tell whether more articles remain after filling.
            take: sidebarFeedNeed + poolTakeNeed + usedIds.size + 1,
            include: POST_SUMMARY_INCLUDE,
          })
        : Promise.resolve([]),
      config.sidebar.enabled && sidebarVideoNeed > 0
        ? this.prisma.post.findMany({
            where: videoWhere,
            orderBy: { publishedAt: 'desc' },
            take: sidebarVideoNeed + 1,
            include: POST_SUMMARY_INCLUDE,
          })
        : Promise.resolve([]),
      ...mostViewedGroupEntries.map(([, group]) =>
        config.sidebar.enabled && group.need > 0
          ? this.prisma.post.findMany({
              where: {
                ...autoFillWhere(!!group.categoryId && videoScopeIds.has(group.categoryId)),
                ...(mostViewedPublishedSince(group.period)
                  ? { publishedAt: { gte: mostViewedPublishedSince(group.period)! } }
                  : {}),
                ...(group.categoryId
                  ? { categories: { some: { categoryId: group.categoryId } } }
                  : {}),
              },
              orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
              take: group.need + moduleNeed + usedIds.size + 1,
              include: POST_SUMMARY_INCLUDE,
            })
          : Promise.resolve([]),
      ),
    ]);

    const sidebarVideoPool = sidebarVideoRows.map((row) => this.mapLayoutPostSummary(row));
    let sidebarVideoPoolIdx = 0;
    const nextFromVideoPool = (): PostSummary | null => {
      while (sidebarVideoPoolIdx < sidebarVideoPool.length) {
        const candidate = sidebarVideoPool[sidebarVideoPoolIdx++];
        if (!usedIds.has(candidate.id) && !reservedIds.has(candidate.id)) return candidate;
      }
      return null;
    };

    const pinnedById = new Map<string, PostSummary>(
      pinnedRows.map((row) => [row.id, this.mapLayoutPostSummary(row)] as const),
    );
    // Posts pinned to a slot are reserved: auto-fill must not consume them
    // before their own slot is reached. Video-list / sidebar video pins may
    // still be repeated in modules scoped to the Video category.
    const reservedIds = new Set(pinnedById.keys());
    const videoColumnPinIds = new Set(videoColumnPinnedIds(config));
    const pool = poolRows.map((row) => this.mapLayoutPostSummary(row));
    let poolIdx = 0;
    const nextFromPool = (): PostSummary | null => {
      while (poolIdx < pool.length) {
        const candidate = pool[poolIdx++];
        if (!usedIds.has(candidate.id) && !reservedIds.has(candidate.id)) return candidate;
      }
      return null;
    };
    const sidebarLatestPool = sidebarLatestRows.map((row) => this.mapLayoutPostSummary(row));
    let sidebarPoolIdx = 0;
    const nextFromSidebarPool = (): PostSummary | null => {
      while (sidebarPoolIdx < sidebarLatestPool.length) {
        const candidate = sidebarLatestPool[sidebarPoolIdx++];
        if (!usedIds.has(candidate.id) && !reservedIds.has(candidate.id)) return candidate;
      }
      return null;
    };
    const mostViewedPools = new Map<string, { posts: PostSummary[]; idx: number }>();
    mostViewedGroupEntries.forEach(([key], groupIndex) => {
      const rows = sidebarMostViewedGroupRows[groupIndex] ?? [];
      mostViewedPools.set(key, {
        posts: rows.map((row) => this.mapLayoutPostSummary(row)),
        idx: 0,
      });
    });
    const nextFromMostViewedPool = (groupKey: string): PostSummary | null => {
      const pool = mostViewedPools.get(groupKey);
      if (!pool) return null;
      while (pool.idx < pool.posts.length) {
        const candidate = pool.posts[pool.idx++];
        if (!usedIds.has(candidate.id) && !reservedIds.has(candidate.id)) return candidate;
      }
      return null;
    };

    // Home-only module category filters (ignored on category pages where opts.categoryId is set).
    const allowModuleCategoryFilter = !opts.categoryId;
    const moduleCategoryIds = allowModuleCategoryFilter
      ? [
          ...new Set(
            config.modules
              .filter(
                (mod) =>
                  !isRowsModuleType(mod.type) &&
                  !isCategoryColumnsModuleType(mod.type) &&
                  mod.options?.categoryId,
              )
              .map((mod) => mod.options!.categoryId!),
          ),
        ]
      : [];
    const mobileModuleCategoryIds = allowModuleCategoryFilter
      ? [
          ...new Set(
            mobileModulesConfig
              .filter((mod) => mod.options?.categoryId)
              .map((mod) => mod.options!.categoryId!),
          ),
        ]
      : [];
    const rowsCategoryIds = [
      ...new Set(
        config.modules
          .filter((mod) => isRowsModuleType(mod.type))
          .flatMap((mod) => mod.options?.rows ?? [])
          .filter((row) => row.kind === 'category' && row.categoryId)
          .map((row) => row.categoryId!),
      ),
    ];
    const columnsCategoryIds = [
      ...new Set(
        config.modules
          .filter((mod) => isCategoryColumnsModuleType(mod.type))
          .flatMap((mod) => mod.options?.columns ?? [])
          .map((col) => col.categoryId)
          .filter((id): id is string => !!id),
      ),
    ];
    const allCategoryIds = [
      ...new Set([
        ...rowsCategoryIds,
        ...columnsCategoryIds,
        ...moduleCategoryIds,
        ...mobileModuleCategoryIds,
      ]),
    ];

    const categoryNeedFor = (categoryId: string): number => {
      const rowsNeed = config.modules
        .filter((mod) => isRowsModuleType(mod.type))
        .flatMap((mod) =>
          (mod.options?.rows ?? [])
            .filter((row) => row.kind === 'category' && row.categoryId === categoryId)
            .map((row) => rowsModuleSlotCount(mod.type) * (row.repeatCount ?? 1)),
        )
        .reduce((sum, count) => sum + count, 0);
      const columnsNeed = config.modules
        .filter((mod) => isCategoryColumnsModuleType(mod.type))
        .flatMap((mod) =>
          (mod.options?.columns ?? [])
            .filter((col) => col.categoryId === categoryId)
            .map(() => categoryColumnsSlotsPerColumn(mod.options?.smallCount)),
        )
        .reduce((sum, count) => sum + count, 0);
      let moduleNeedForCategory = 0;
      if (allowModuleCategoryFilter) {
        for (let i = 0; i < config.modules.length; i++) {
          const mod = config.modules[i];
          if (isRowsModuleType(mod.type) || isCategoryColumnsModuleType(mod.type)) continue;
          if (mod.options?.categoryId !== categoryId) continue;
          moduleNeedForCategory += slotCounts[i] ?? moduleSlotCount(mod);
        }
        for (let i = 0; i < mobileModulesConfig.length; i++) {
          const mod = mobileModulesConfig[i];
          if (mod.options?.categoryId !== categoryId) continue;
          moduleNeedForCategory += mobileSlotCounts[i] ?? mobileModuleSlotCount(mod);
        }
      }
      return rowsNeed + columnsNeed + moduleNeedForCategory + pinnedIds.length + 1;
    };

    const [rowsCategories, ...rowsCategoryPostRows] = await Promise.all([
      allCategoryIds.length > 0
        ? this.prisma.category.findMany({ where: { id: { in: allCategoryIds } } })
        : Promise.resolve([]),
      ...allCategoryIds.map((categoryId) =>
        this.prisma.post.findMany({
          where: {
            ...autoFillWhere(videoScopeIds.has(categoryId)),
            categories: { some: { categoryId } },
          },
          orderBy: { publishedAt: 'desc' },
          // Extra rows cover pins reserved for later slots and the hasMore probe.
          take: categoryNeedFor(categoryId),
          include: POST_SUMMARY_INCLUDE,
        }),
      ),
    ]);

    const categoryById = new Map(rowsCategories.map((cat) => [cat.id, cat] as const));
    const categoryPoolById = new Map<string, PostSummary[]>();
    const categoryPoolIdx = new Map<string, number>();
    for (let i = 0; i < allCategoryIds.length; i++) {
      const categoryId = allCategoryIds[i];
      categoryPoolById.set(
        categoryId,
        rowsCategoryPostRows[i].map((row) => this.mapLayoutPostSummary(row)),
      );
      categoryPoolIdx.set(categoryId, 0);
    }

    const holdForUnplacedPin = (id: string, used: Set<string>, categoryId?: string) => {
      if (!reservedIds.has(id) || used.has(id)) return false;
      // Video-category modules may repeat videos already in the right-hand video column.
      if (categoryId && videoScopeIds.has(categoryId) && videoColumnPinIds.has(id)) {
        return false;
      }
      return true;
    };

    const nextFromCategoryPool = (categoryId: string): PostSummary | null => {
      const categoryPool = categoryPoolById.get(categoryId) ?? [];
      let idx = categoryPoolIdx.get(categoryId) ?? 0;
      while (idx < categoryPool.length) {
        const candidate = categoryPool[idx++];
        categoryPoolIdx.set(categoryId, idx);
        // Newest-in-category wins even when the post already appeared in another
        // homepage module. Still skip unplaced pins so their own slot can claim them.
        if (holdForUnplacedPin(candidate.id, usedIds, categoryId)) continue;
        return candidate;
      }
      categoryPoolIdx.set(categoryId, idx);
      return null;
    };

    const categoryPoolHasRemaining = (categoryId: string): boolean => {
      const categoryPool = categoryPoolById.get(categoryId) ?? [];
      let idx = categoryPoolIdx.get(categoryId) ?? 0;
      while (idx < categoryPool.length) {
        const candidate = categoryPool[idx++];
        if (holdForUnplacedPin(candidate.id, usedIds, categoryId)) continue;
        return true;
      }
      return false;
    };

    const resolveStandardModule = (mod: LayoutModule, count: number): ResolvedModule['posts'] => {
      const posts: ResolvedModule['posts'] = [];
      const filterCategoryId =
        allowModuleCategoryFilter && mod.options?.categoryId ? mod.options.categoryId : null;
      for (let slot = 0; slot < count; slot++) {
        const slotConfig = mod.slots[slot] ?? { ...DEFAULT_DISPLAY_SLOT };
        const pinnedId = slotConfig.postId;
        let post: PostSummary | null = null;
        if (pinnedId && pinnedById.has(pinnedId) && !usedIds.has(pinnedId)) {
          post = pinnedById.get(pinnedId)!;
        } else if (filterCategoryId) {
          post = nextFromCategoryPool(filterCategoryId);
        } else {
          post = nextFromPool();
        }
        if (!post) break;
        usedIds.add(post.id);
        posts.push({
          post,
          ...applyModuleDisplayFlags(slotConfig, mod.options),
        });
      }
      return posts;
    };

    const resolveModuleHeading = (
      mod: LayoutModule,
    ): { title: string | null; category: ResolvedModule['category'] } => {
      if (isRowsModuleType(mod.type) || isCategoryColumnsModuleType(mod.type)) {
        return { title: null, category: null };
      }
      const customName = mod.options?.name?.trim() || null;
      const filterCategoryId =
        allowModuleCategoryFilter && mod.options?.categoryId ? mod.options.categoryId : null;
      const cat = filterCategoryId ? (categoryById.get(filterCategoryId) ?? null) : null;
      const category = cat
        ? { id: cat.id, name: cat.name, slug: cat.slug, color: cat.color }
        : null;
      return {
        title: customName || category?.name || null,
        category,
      };
    };

    const resolveRowsModule = (mod: LayoutModule, slotCount: number): ResolvedRows4Row[] => {
      const rows = mod.options?.rows ?? [];
      const resolvedRows: ResolvedRows4Row[] = [];

      for (const row of rows) {
        const repeatCount = row.repeatCount ?? 1;
        const category =
          row.kind === 'category' && row.categoryId
            ? (categoryById.get(row.categoryId) ?? null)
            : null;
        const title = row.name?.trim() || (category ? category.name : '');

        for (let repeat = 0; repeat < repeatCount; repeat++) {
          const posts: ResolvedModule['posts'] = [];
          for (let slot = 0; slot < slotCount; slot++) {
            const slotConfig = row.slots[slot] ?? { ...DEFAULT_DISPLAY_SLOT };
            const pinnedId = slotConfig.postId;
            let post: PostSummary | null = null;
            if (pinnedId && pinnedById.has(pinnedId) && !usedIds.has(pinnedId)) {
              post = pinnedById.get(pinnedId)!;
            } else if (row.kind === 'category' && row.categoryId) {
              post = nextFromCategoryPool(row.categoryId);
            } else {
              post = nextFromPool();
            }
            if (!post) break;
            usedIds.add(post.id);
            posts.push({
              post,
              ...applyModuleDisplayFlags(slotConfig, mod.options),
            });
          }

          resolvedRows.push({
            id: repeatCount > 1 ? `${row.id}:${repeat}` : row.id,
            kind: row.kind,
            title,
            category: category
              ? {
                  id: category.id,
                  name: category.name,
                  slug: category.slug,
                  color: category.color,
                }
              : null,
            posts,
          });
        }
      }

      return resolvedRows;
    };

    const resolveCategoryColumnsModule = (mod: LayoutModule): ResolvedCategoryColumn[] => {
      const smallCount = normalizeModuleSmallCount(mod.options?.smallCount);
      const columnCount = normalizeModuleColumnCount(
        mod.options?.columnCount ?? mod.options?.columns?.length,
      );
      const slotsPerColumn = categoryColumnsSlotsPerColumn(smallCount);
      const configured = mod.options?.columns ?? [];
      const columns: ResolvedCategoryColumn[] = [];

      for (let i = 0; i < columnCount; i++) {
        const col = configured[i];
        if (!col) continue;
        const category = col.categoryId ? (categoryById.get(col.categoryId) ?? null) : null;
        const title = col.name?.trim() || (category ? category.name : '');
        const posts: ResolvedModule['posts'] = [];
        for (let slot = 0; slot < slotsPerColumn; slot++) {
          const slotConfig = col.slots[slot] ?? { ...DEFAULT_DISPLAY_SLOT };
          const pinnedId = slotConfig.postId;
          let post: PostSummary | null = null;
          if (pinnedId && pinnedById.has(pinnedId) && !usedIds.has(pinnedId)) {
            post = pinnedById.get(pinnedId)!;
          } else if (col.categoryId) {
            post = nextFromCategoryPool(col.categoryId);
          } else {
            post = nextFromPool();
          }
          if (!post) break;
          usedIds.add(post.id);
          posts.push({
            post,
            ...applyModuleDisplayFlags(slotConfig, mod.options),
          });
        }
        columns.push({
          id: col.id,
          title,
          category: category
            ? {
                id: category.id,
                name: category.name,
                slug: category.slug,
                color: category.color,
              }
            : null,
          posts,
        });
      }

      return columns;
    };

    const modules: ResolvedModule[] = config.modules.map((mod, i) => {
      const legacyTypography = migrateLegacySummaryFromTypography(mod.options?.typography ?? null);
      const typography = legacyTypography.typography;
      const backgroundColor = mod.options?.backgroundColor;
      const showSummary = mod.options?.showSummary ?? true;
      const showBumbi = resolveShowBumbi(
        mod.options?.showBumbi,
        mod.type === 'pictures-7' || mod.type === 'category-columns' || mod.type === 'video-list'
          ? false
          : showSummary,
      );
      const summaryRows = mod.options?.summaryRows ?? legacyTypography.summaryRows;
      const summaryTypography =
        mod.options?.summaryTypography ?? legacyTypography.summaryTypography;
      const heroSummaryTypography =
        mod.options?.heroSummaryTypography ?? legacyTypography.heroSummaryTypography;
      const dateFormat = mod.options?.dateFormat;
      const showReadingTime = !!mod.options?.showReadingTime;
      if (mod.type === 'category-columns') {
        const columns = resolveCategoryColumnsModule(mod);
        const showCategory = mod.options?.showCategory ?? false;
        return {
          id: mod.id,
          type: mod.type,
          posts: [],
          columns,
          title: mod.options?.name?.trim() || null,
          category: null,
          typography: typography ?? undefined,
          backgroundColor,
          showCategory,
          showSummary: false,
          showBumbi,
          summaryRows,
          summaryTypography,
          heroSummaryTypography,
          dateFormat,
          showReadingTime,
          smallCount: normalizeModuleSmallCount(mod.options?.smallCount),
        };
      }
      if (mod.type === 'rows-5') {
        const rows = resolveRowsModule(mod, ROWS5_SLOT_COUNT);
        const showCategory = mod.options?.showCategory ?? false;
        return {
          id: mod.id,
          type: mod.type,
          posts: [],
          rows,
          title: null,
          category: null,
          typography: typography ?? undefined,
          backgroundColor,
          showCategory,
          showSummary,
          showBumbi,
          summaryRows,
          summaryTypography,
          heroSummaryTypography,
          dateFormat,
          showReadingTime,
        };
      }
      if (mod.type === 'rows-4' || mod.type === 'rows-4-sm') {
        const rows = resolveRowsModule(mod, ROWS4_SLOT_COUNT);
        const showCategory = mod.options?.showCategory ?? false;
        return {
          id: mod.id,
          type: mod.type,
          posts: [],
          rows,
          title: null,
          category: null,
          typography: typography ?? undefined,
          backgroundColor,
          showCategory,
          showSummary,
          showBumbi,
          summaryRows,
          summaryTypography,
          heroSummaryTypography,
          dateFormat,
          showReadingTime,
        };
      }
      if (mod.type === 'rows-3') {
        const rows = resolveRowsModule(mod, ROWS3_SLOT_COUNT);
        const showCategory = mod.options?.showCategory ?? false;
        return {
          id: mod.id,
          type: mod.type,
          posts: [],
          rows,
          title: null,
          category: null,
          typography: typography ?? undefined,
          backgroundColor,
          showCategory,
          showSummary,
          showBumbi,
          summaryRows,
          summaryTypography,
          heroSummaryTypography,
          dateFormat,
          showReadingTime,
        };
      }
      if (mod.type === 'video-list') {
        const posts: ResolvedModule['posts'] = [];
        const placed = new Set<string>();
        for (const item of mod.options?.videoItems ?? []) {
          const postId = item.postId;
          if (!postId || !pinnedById.has(postId) || placed.has(postId)) continue;
          const post = pinnedById.get(postId)!;
          if (!post.videoUrl) continue;
          placed.add(post.id);
          usedIds.add(post.id);
          posts.push({ post, showDate: true, showAuthor: true });
        }
        return {
          id: mod.id,
          type: mod.type,
          posts,
          title: mod.options?.name?.trim() || null,
          category: null,
          typography: typography ?? undefined,
          backgroundColor,
          showCategory: false,
          showSummary: false,
          showBumbi,
          summaryRows,
          summaryTypography,
          heroSummaryTypography,
          dateFormat,
          showReadingTime,
        };
      }

      const count = slotCounts[i];
      const posts = resolveStandardModule(mod, count);
      const showCategory = mod.options?.showCategory ?? defaultModuleShowCategory(mod.type);
      const heading = resolveModuleHeading(mod);
      return {
        id: mod.id,
        type: mod.type,
        posts,
        title: heading.title,
        category: heading.category,
        typography: typography ?? undefined,
        backgroundColor,
        showCategory,
        showSummary,
        showBumbi,
        summaryRows,
        summaryTypography,
        heroSummaryTypography,
        dateFormat,
        showReadingTime,
        ...(supportsModuleSideCount(mod.type)
          ? { sideCount: normalizeModuleSideCount(mod.options?.sideCount) }
          : {}),
        ...(isPicturesModuleType(mod.type)
          ? { count: normalizeModulePicturesCount(mod.options?.count) }
          : {}),
        ...(mod.type === 'split' ? { splitReverse: !!mod.options?.splitReverse } : {}),
      };
    });

    let sidebar: ResolvedSidebar | null = null;
    const blockTypography = config.sidebar.blockTypography ?? {};
    const blockBackgroundColor = config.sidebar.blockBackgroundColor ?? {};
    const singleCategoryBlockTypography = config.sidebar.singleCategoryBlockTypography ?? {};
    const singleCategoryBlockBackgroundColor =
      config.sidebar.singleCategoryBlockBackgroundColor ?? {};
    const slideshowBlockTypography = config.sidebar.slideshowBlockTypography ?? {};
    const slideshowBlockBackgroundColor = config.sidebar.slideshowBlockBackgroundColor ?? {};
    const featuredVideoBlockTypography = config.sidebar.featuredVideoBlockTypography ?? {};
    const featuredVideoBlockBackgroundColor =
      config.sidebar.featuredVideoBlockBackgroundColor ?? {};
    const featuredArticleBlockTypography = config.sidebar.featuredArticleBlockTypography ?? {};
    const featuredArticleBlockBackgroundColor =
      config.sidebar.featuredArticleBlockBackgroundColor ?? {};
    const featuredPhotoBlockTypography = config.sidebar.featuredPhotoBlockTypography ?? {};
    const featuredPhotoBlockBackgroundColor =
      config.sidebar.featuredPhotoBlockBackgroundColor ?? {};
    const featuredStackBlockTypography = config.sidebar.featuredStackBlockTypography ?? {};
    const featuredStackBlockBackgroundColor =
      config.sidebar.featuredStackBlockBackgroundColor ?? {};
    const blockSummarySettings = config.sidebar.blockSummarySettings ?? {};
    const singleCategoryBlockSummarySettings =
      config.sidebar.singleCategoryBlockSummarySettings ?? {};
    const slideshowBlockSummarySettings = config.sidebar.slideshowBlockSummarySettings ?? {};
    const featuredArticleBlockSummarySettings =
      config.sidebar.featuredArticleBlockSummarySettings ?? {};
    const featuredStackBlockSummarySettings =
      config.sidebar.featuredStackBlockSummarySettings ?? {};
    if (config.sidebar.enabled && config.sidebar.blocks.length > 0) {
      const blocks: ResolvedSidebar['blocks'] = [];
      for (const blockEntry of config.sidebar.blocks) {
        const block = sidebarBlockMode(blockEntry);
        if (block === 'latest') {
          const latestCount = config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT;
          const latestTotal = sidebarFetchTotalForSections(sidebarSectionCount, latestCount);
          const posts = fillPostsFromSlots(
            latestTotal,
            config.sidebar.latestSlots ?? [],
            pinnedById,
            usedIds,
            () => (useGlobalPoolForSidebarFeed ? nextFromSidebarPool() : nextFromPool()),
            true,
          );
          blocks.push({
            mode: 'latest',
            posts,
            categoryStrips: [],
            latestSlots: config.sidebar.latestSlots,
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: [],
            singleCategorySlots: [],
            latestCount,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
            videoItems: [],
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            latestShowCategory: config.sidebar.latestShowCategory ?? true,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
          });
          continue;
        }

        if (block === 'slideshow') {
          const blockId = isSidebarSlideshowEntry(blockEntry)
            ? blockEntry.id
            : SIDEBAR_SLIDESHOW_DEFAULT_ID;
          const blockConfig = config.sidebar.slideshowBlocks?.[blockId];
          const slideshowCount =
            blockConfig?.count ?? config.sidebar.slideshowCount ?? SIDEBAR_SLIDESHOW_COUNT;
          const slideshowTextPosition =
            blockConfig?.textPosition ?? config.sidebar.slideshowTextPosition ?? 'on-image';
          const latestSlots = blockConfig?.slots?.length
            ? blockConfig.slots
            : config.sidebar.latestSlots;
          const slideshowTotal = sidebarFetchTotalForSections(sidebarSectionCount, slideshowCount);
          const posts = fillPostsFromSlots(
            slideshowTotal,
            latestSlots,
            pinnedById,
            usedIds,
            () => (useGlobalPoolForSidebarFeed ? nextFromSidebarPool() : nextFromPool()),
            true,
          );
          blocks.push({
            mode: 'slideshow',
            blockId,
            posts,
            categoryStrips: [],
            latestSlots,
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: [],
            singleCategorySlots: [],
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount,
            videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
            videoItems: [],
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition,
          });
          continue;
        }

        if (block === 'video') {
          const videoCount = config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT;
          const videoItems = config.sidebar.videoItems ?? [];
          const videoTotal = sidebarFetchTotalForSections(sidebarSectionCount, videoCount);
          const posts: PostSummary[] = [];
          const placed = new Set<string>();
          for (const item of videoItems) {
            if (!item.postId || placed.has(item.postId)) continue;
            const post = pinnedById.get(item.postId);
            if (!post?.videoUrl) continue;
            placed.add(post.id);
            usedIds.add(post.id);
            posts.push(post);
          }
          for (let i = 0; i < videoTotal; i++) {
            const post = nextFromVideoPool();
            if (!post) break;
            usedIds.add(post.id);
            posts.push(post);
          }
          blocks.push({
            mode: 'video',
            posts,
            categoryStrips: [],
            latestSlots: config.sidebar.latestSlots,
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: [],
            singleCategorySlots: [],
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount,
            videoItems,
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
            hasMore: sidebarVideoPool
              .slice(sidebarVideoPoolIdx)
              .some((candidate) => !usedIds.has(candidate.id)),
          });
          continue;
        }

        if (block === 'overlay-list') {
          const overlayListCount = config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT;
          const overlayListTotal = sidebarFetchTotalForSections(
            sidebarSectionCount,
            overlayListCount,
          );
          const posts = fillPostsFromSlots(
            overlayListTotal,
            config.sidebar.overlayListSlots ?? [],
            pinnedById,
            usedIds,
            () => (useGlobalPoolForSidebarFeed ? nextFromSidebarPool() : nextFromPool()),
            true,
          );
          blocks.push({
            mode: 'overlay-list',
            posts,
            categoryStrips: [],
            latestSlots: [],
            categorySlots: [],
            overlayListSlots: config.sidebar.overlayListSlots,
            articleListSlots: [],
            mostViewedSlots: [],
            singleCategorySlots: [],
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
            videoItems: [],
            overlayListCount,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
          });
          continue;
        }

        if (block === 'article-list') {
          const articleListCount = config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT;
          const articleListTotal = sidebarFetchTotalForSections(
            sidebarSectionCount,
            articleListCount,
          );
          const posts = fillPostsFromSlots(
            articleListTotal,
            config.sidebar.articleListSlots ?? [],
            pinnedById,
            usedIds,
            () => (useGlobalPoolForSidebarFeed ? nextFromSidebarPool() : nextFromPool()),
            true,
          );
          blocks.push({
            mode: 'article-list',
            posts,
            categoryStrips: [],
            latestSlots: [],
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: config.sidebar.articleListSlots,
            mostViewedSlots: [],
            singleCategorySlots: [],
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
            videoItems: [],
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
          });
          continue;
        }

        if (block === 'most-viewed') {
          const mostViewed = resolveMostViewedBlockConfig(config.sidebar, blockEntry);
          const mostViewedTotal = sidebarFetchTotalForSections(
            sidebarSectionCount,
            mostViewed.count,
          );
          const groupKey = mostViewedGroupKey(mostViewed.period, mostViewed.categoryId);
          const posts: PostSummary[] = [];
          for (let i = 0; i < mostViewedTotal; i++) {
            const post = nextFromMostViewedPool(groupKey);
            if (!post) break;
            usedIds.add(post.id);
            posts.push(post);
          }
          blocks.push({
            mode: 'most-viewed',
            blockId: mostViewed.blockId,
            posts,
            categoryStrips: [],
            latestSlots: [],
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: mostViewed.slots,
            singleCategorySlots: [],
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
            videoItems: [],
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: mostViewed.count,
            mostViewedTitle: mostViewed.title,
            mostViewedPeriod: mostViewed.period,
            mostViewedShowCategory: mostViewed.showCategory,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
          });
          continue;
        }

        if (block === 'single-category') {
          const blockId = isSidebarSingleCategoryEntry(blockEntry)
            ? blockEntry.id
            : SIDEBAR_SINGLE_CATEGORY_DEFAULT_ID;
          const blockConfig = config.sidebar.singleCategoryBlocks?.[blockId];
          const singleCategoryCount =
            blockConfig?.count ??
            config.sidebar.singleCategoryCount ??
            SIDEBAR_SINGLE_CATEGORY_COUNT;
          const singleCategoryTotal = sidebarFetchTotalForSections(
            sidebarSectionCount,
            singleCategoryCount,
          );
          const categoryId = blockConfig?.categoryId ?? config.sidebar.singleCategoryId ?? null;
          const singleCategorySlots =
            blockConfig?.slots ?? config.sidebar.singleCategorySlots ?? [];
          let categoryStrips: CategoryStrip[] = [];
          if (categoryId) {
            const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
            if (cat) {
              const rows = await this.prisma.post.findMany({
                where: {
                  ...autoFillWhere(videoScopeIds.has(cat.id)),
                  categories: { some: { categoryId: cat.id } },
                },
                orderBy: { publishedAt: 'desc' },
                take: singleCategoryTotal + reservedIds.size + 1,
                include: POST_SUMMARY_INCLUDE,
              });
              const categoryPool = rows.map((row) => this.mapLayoutPostSummary(row));
              let categoryPoolIdx = 0;
              const nextFromSingleCategoryPool = (): PostSummary | null => {
                while (categoryPoolIdx < categoryPool.length) {
                  const candidate = categoryPool[categoryPoolIdx++];
                  if (reservedIds.has(candidate.id) && !usedIds.has(candidate.id)) continue;
                  return candidate;
                }
                return null;
              };
              const posts = fillPostsFromSlots(
                singleCategoryTotal,
                singleCategorySlots,
                pinnedById,
                usedIds,
                nextFromSingleCategoryPool,
                true,
              );
              categoryStrips = [
                {
                  category: { id: cat.id, name: cat.name, slug: cat.slug, color: cat.color },
                  posts,
                },
              ];
            }
          }
          blocks.push({
            mode: 'single-category',
            blockId,
            posts: [],
            categoryStrips,
            latestSlots: [],
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: [],
            singleCategorySlots,
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
            videoItems: [],
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
          });
          continue;
        }

        if (block === 'featured-video' && isSidebarFeaturedVideoEntry(blockEntry)) {
          const blockId = blockEntry.id;
          const blockConfig = config.sidebar.featuredVideoBlocks?.[blockId];
          const featuredTitle = blockConfig?.title?.trim() ?? '';
          const source = blockConfig?.source ?? 'link';
          const posts: PostSummary[] = [];
          const videoItems: ResolvedSidebar['blocks'][number]['videoItems'] = [];
          if (blockConfig?.postId) {
            const post = pinnedById.get(blockConfig.postId);
            if (post?.videoUrl) {
              usedIds.add(post.id);
              posts.push(post);
            }
          } else if (source !== 'post' && isHttpUrl(blockConfig?.url)) {
            videoItems.push({
              id: blockId,
              title: blockConfig?.videoTitle?.trim() || featuredTitle || null,
              url: blockConfig!.url!.trim(),
              categoryId: blockConfig?.categoryId ?? null,
              postId: null,
            });
          }
          blocks.push({
            mode: 'featured-video',
            blockId,
            posts,
            categoryStrips: [],
            latestSlots: [],
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: [],
            singleCategorySlots: [],
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount: 1,
            videoItems,
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
            featuredTitle,
            featuredPhotoUrl: null,
          });
          continue;
        }

        if (block === 'featured-article' && isSidebarFeaturedArticleEntry(blockEntry)) {
          const blockId = blockEntry.id;
          const blockConfig = config.sidebar.featuredArticleBlocks?.[blockId];
          const featuredTitle = blockConfig?.title?.trim() ?? '';
          const posts: PostSummary[] = [];
          if (blockConfig?.postId) {
            const post = pinnedById.get(blockConfig.postId);
            if (post) {
              usedIds.add(post.id);
              posts.push(post);
            }
          }
          const articleListSlots = [
            {
              postId: blockConfig?.postId ?? null,
              showDate: blockConfig?.showDate ?? true,
              showAuthor: blockConfig?.showAuthor ?? true,
            },
          ];
          blocks.push({
            mode: 'featured-article',
            blockId,
            posts,
            categoryStrips: [],
            latestSlots: [],
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots,
            mostViewedSlots: [],
            singleCategorySlots: [],
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
            videoItems: [],
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: 1,
            articleListTitle: featuredTitle,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
            featuredTitle,
            featuredPhotoUrl: null,
          });
          continue;
        }

        if (block === 'featured-photo' && isSidebarFeaturedPhotoEntry(blockEntry)) {
          const blockId = blockEntry.id;
          const blockConfig = config.sidebar.featuredPhotoBlocks?.[blockId];
          const featuredTitle = blockConfig?.title?.trim() ?? '';
          const featuredPhotoCaption = blockConfig?.caption?.trim() ?? '';
          const featuredPhotoUrl = isHttpUrl(blockConfig?.imageUrl)
            ? blockConfig!.imageUrl!.trim()
            : null;
          blocks.push({
            mode: 'featured-photo',
            blockId,
            posts: [],
            categoryStrips: [],
            latestSlots: [],
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: [],
            singleCategorySlots: [],
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
            videoItems: [],
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
            featuredTitle,
            featuredPhotoUrl,
            featuredPhotoCaption,
          });
          continue;
        }

        if (block === 'featured-stack' && isSidebarFeaturedStackEntry(blockEntry)) {
          const blockId = blockEntry.id;
          const blockConfig = config.sidebar.featuredStackBlocks?.[blockId];
          const featuredTitle = blockConfig?.title?.trim() ?? '';
          const featuredSecondaryCount = Math.max(
            1,
            Math.min(10, blockConfig?.secondaryCount ?? 3),
          );
          const stackCount = 1 + featuredSecondaryCount;
          const latestSlots = blockConfig?.slots ?? [];
          const stackTotal = sidebarFetchTotalForSections(sidebarSectionCount, stackCount);
          const posts = fillPostsFromSlots(
            stackTotal,
            latestSlots,
            pinnedById,
            usedIds,
            () => (useGlobalPoolForSidebarFeed ? nextFromSidebarPool() : nextFromPool()),
            true,
          );
          blocks.push({
            mode: 'featured-stack',
            blockId,
            posts,
            categoryStrips: [],
            latestSlots,
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: [],
            singleCategorySlots: [],
            latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
            slideshowCount: config.sidebar.slideshowCount,
            videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
            videoItems: [],
            overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
            latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
            mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
            featuredTitle,
            featuredSecondaryCount,
          });
          continue;
        }

        blocks.push({
          mode: 'categories',
          posts: [],
          categoryStrips: await this.buildCategoryStrips(
            usedIds,
            sidebarFetchTotalForSections(sidebarSectionCount, SIDEBAR_STRIP_COUNT),
          ),
          latestSlots: [],
          categorySlots: config.sidebar.categorySlots,
          overlayListSlots: [],
          articleListSlots: [],
          mostViewedSlots: [],
          singleCategorySlots: [],
          latestCount: config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT,
          slideshowCount: config.sidebar.slideshowCount,
          videoCount: config.sidebar.videoCount ?? SIDEBAR_VIDEO_COUNT,
          videoItems: [],
          overlayListCount: config.sidebar.overlayListCount ?? SIDEBAR_OVERLAY_LIST_COUNT,
          latestTitle: config.sidebar.latestTitle ?? SIDEBAR_LATEST_TITLE,
          overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
          articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
          articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
          mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
          mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
          mostViewedPeriod: config.sidebar.mostViewedPeriod ?? SIDEBAR_MOST_VIEWED_PERIOD,
          singleCategoryCount: config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
          slideshowTextPosition: config.sidebar.slideshowTextPosition,
        });
      }

      const stickyBlocks = normalizeStickyBlocks(config.sidebar, blocks.length);
      const stickyMirror = stickyLegacyMirror(stickyBlocks);
      sidebar = {
        blocks,
        stickyBlocks,
        stickyFirstBlock: stickyMirror.stickyFirstBlock,
        stickyUntilModuleId: stickyMirror.stickyUntilModuleId,
        blockTypography,
        blockBackgroundColor,
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
        blockSummarySettings,
        singleCategoryBlockSummarySettings,
        slideshowBlockSummarySettings,
        featuredArticleBlockSummarySettings,
        featuredStackBlockSummarySettings,
      };
    }

    // Flag list modules when unused published articles remain in the pool, so
    // the public UI can show a "Mai multe" (load more) button.
    let remaining = false;
    for (let idx = poolIdx; idx < pool.length; idx++) {
      const candidate = pool[idx];
      if (!usedIds.has(candidate.id) && !reservedIds.has(candidate.id)) {
        remaining = true;
        break;
      }
    }
    for (const mod of modules) {
      if (mod.type !== 'list') continue;
      if (mod.category?.id) {
        mod.hasMore = categoryPoolHasRemaining(mod.category.id);
      } else {
        mod.hasMore = remaining;
      }
    }

    // Same flag for "latest" sidebar blocks, which have their own "Mai multe" button.
    if (sidebar) {
      for (const block of sidebar.blocks) {
        if (block.mode !== 'latest') continue;
        block.hasMore = useGlobalPoolForSidebarFeed
          ? sidebarLatestPool.slice(sidebarPoolIdx).some((candidate) => !usedIds.has(candidate.id))
          : remaining;
      }
    }

    // Mobile modules resolve independently (own used set) so desktop + mobile can share articles.
    const mobileUsedIds = new Set<string>(opts.excludeIds ?? []);
    const mobileReservedIds = new Set(
      mobileModulesConfig
        .flatMap((mod) => mobileModulePinnedIds(mod))
        .filter((id) => pinnedById.has(id)),
    );
    let mobilePoolIdx = 0;
    const nextFromPoolForMobile = (): PostSummary | null => {
      while (mobilePoolIdx < pool.length) {
        const candidate = pool[mobilePoolIdx++];
        if (!mobileUsedIds.has(candidate.id) && !mobileReservedIds.has(candidate.id)) {
          return candidate;
        }
      }
      return null;
    };
    const mobileCategoryPoolIdx = new Map<string, number>();
    for (const categoryId of allCategoryIds) {
      mobileCategoryPoolIdx.set(categoryId, 0);
    }
    const nextFromCategoryPoolForMobile = (categoryId: string): PostSummary | null => {
      const categoryPool = categoryPoolById.get(categoryId) ?? [];
      let idx = mobileCategoryPoolIdx.get(categoryId) ?? 0;
      while (idx < categoryPool.length) {
        const candidate = categoryPool[idx++];
        mobileCategoryPoolIdx.set(categoryId, idx);
        if (
          mobileReservedIds.has(candidate.id) &&
          !mobileUsedIds.has(candidate.id) &&
          !(videoScopeIds.has(categoryId) && videoColumnPinIds.has(candidate.id))
        ) {
          continue;
        }
        return candidate;
      }
      mobileCategoryPoolIdx.set(categoryId, idx);
      return null;
    };

    const resolveMobileStandardModule = (
      mod: MobileLayoutModule,
      count: number,
    ): ResolvedMobileModule['posts'] => {
      const posts: ResolvedMobileModule['posts'] = [];
      const filterCategoryId =
        allowModuleCategoryFilter && mod.options?.categoryId ? mod.options.categoryId : null;
      for (let slot = 0; slot < count; slot++) {
        const slotConfig = mod.slots[slot] ?? { ...DEFAULT_DISPLAY_SLOT };
        const pinnedId = slotConfig.postId;
        let post: PostSummary | null = null;
        if (pinnedId && pinnedById.has(pinnedId) && !mobileUsedIds.has(pinnedId)) {
          post = pinnedById.get(pinnedId)!;
        } else if (filterCategoryId) {
          post = nextFromCategoryPoolForMobile(filterCategoryId);
        } else {
          post = nextFromPoolForMobile();
        }
        if (!post) break;
        mobileUsedIds.add(post.id);
        posts.push({
          post,
          ...applyModuleDisplayFlags(slotConfig, mod.options),
        });
      }
      return posts;
    };

    const mobileModules: ResolvedMobileModule[] = mobileModulesConfig.map((mod, i) => {
      const legacyTypography = migrateLegacySummaryFromTypography(mod.options?.typography ?? null);
      const typography = legacyTypography.typography;
      const backgroundColor = mod.options?.backgroundColor;
      const showSummary = mod.options?.showSummary ?? true;
      const showBumbi = resolveShowBumbi(mod.options?.showBumbi, showSummary);
      const summaryRows = mod.options?.summaryRows ?? legacyTypography.summaryRows;
      const summaryTypography =
        mod.options?.summaryTypography ?? legacyTypography.summaryTypography;
      const heroSummaryTypography =
        mod.options?.heroSummaryTypography ?? legacyTypography.heroSummaryTypography;
      const dateFormat = mod.options?.dateFormat;
      const showReadingTime = !!mod.options?.showReadingTime;
      const count = mobileSlotCounts[i] ?? mobileModuleSlotCount(mod);
      const posts = resolveMobileStandardModule(mod, count);
      const showCategory = mod.options?.showCategory ?? defaultMobileModuleShowCategory(mod.type);
      const filterCategoryId =
        allowModuleCategoryFilter && mod.options?.categoryId ? mod.options.categoryId : null;
      const cat = filterCategoryId ? (categoryById.get(filterCategoryId) ?? null) : null;
      const customName = mod.options?.name?.trim() || null;
      const title = customName || (cat ? cat.name : null);
      const textPosition = mobileTextPosition(mod.type, mod.options?.textPosition);
      return {
        id: mod.id,
        type: mod.type,
        posts,
        title,
        category: cat ? { id: cat.id, name: cat.name, slug: cat.slug, color: cat.color } : null,
        typography: typography ?? undefined,
        backgroundColor,
        showCategory,
        showSummary,
        showBumbi,
        summaryRows,
        summaryTypography,
        heroSummaryTypography,
        dateFormat,
        showReadingTime,
        textPosition,
        ...(mod.type === 'grid-2'
          ? { rowCount: normalizeMobileRowCount(mod.options?.rowCount) }
          : {}),
        ...(mod.type === 'hero-list'
          ? { sideCount: normalizeMobileSideCount(mod.options?.sideCount) }
          : {}),
      };
    });

    return {
      modules,
      sidebar,
      mobileOrder: effectiveMobileOrder(config),
      mobileModules,
    };
  }

  /** Video category and its children — video-module articles stay visible here. */
  private async videoCategoryScopeIds(): Promise<Set<string>> {
    const video = await this.prisma.category.findUnique({
      where: { slug: VIDEO_CATEGORY_SLUG },
      select: { id: true, children: { select: { id: true } } },
    });
    if (!video) return new Set();
    return new Set([video.id, ...video.children.map((child) => child.id)]);
  }

  /**
   * Next published articles for a "Mai multe" button: latest posts not already
   * shown on the page (excludeIds), optionally scoped to a category.
   */
  async getMorePosts(opts: {
    excludeIds: string[];
    categorySlug?: string;
    take?: number;
    hasVideo?: boolean;
  }) {
    const take = Math.min(Math.max(opts.take ?? DEFAULT_LIST_COUNT, 1), 50);

    let categoryFilter = {};
    let allowVideoModuleArticles = false;
    if (opts.categorySlug) {
      const category = await this.prisma.category.findUnique({
        where: { slug: opts.categorySlug },
        select: { id: true, slug: true, parent: { select: { slug: true } } },
      });
      if (!category) return { posts: [], hasMore: false };
      const isVideoCategory = category.slug === VIDEO_CATEGORY_SLUG;
      allowVideoModuleArticles = isVideoCategory || category.parent?.slug === VIDEO_CATEGORY_SLUG;
      categoryFilter = isVideoCategory
        ? { videoUrl: { not: null }, externalId: null }
        : { categories: { some: { categoryId: category.id } } };
    }

    const rows = await this.prisma.post.findMany({
      where: {
        ...autoFillWhere(allowVideoModuleArticles),
        ...categoryFilter,
        ...(opts.hasVideo ? { videoUrl: { not: null } } : {}),
        ...(opts.excludeIds.length > 0 ? { id: { notIn: opts.excludeIds } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: take + 1,
      include: POST_SUMMARY_INCLUDE,
    });

    return {
      posts: rows.slice(0, take).map((row) => this.mapLayoutPostSummary(row)),
      hasMore: rows.length > take,
    };
  }

  /** One strip per menu category with its latest posts, deduped page-wide. */
  private async buildCategoryStrips(usedIds: Set<string>, postsPerStrip = SIDEBAR_STRIP_COUNT) {
    const [menuCategories, videoScopeIds] = await Promise.all([
      this.prisma.category.findMany({
        where: { showInMenu: true },
        orderBy: { menuOrder: 'asc' },
      }),
      this.videoCategoryScopeIds(),
    ]);

    const strips: CategoryStrip[] = [];
    for (const cat of menuCategories) {
      const rows = await this.prisma.post.findMany({
        where: {
          ...autoFillWhere(videoScopeIds.has(cat.id)),
          id: { notIn: [...usedIds] },
          categories: { some: { categoryId: cat.id } },
        },
        orderBy: { publishedAt: 'desc' },
        take: postsPerStrip,
        include: POST_SUMMARY_INCLUDE,
      });
      const posts = rows.map((row) => this.mapLayoutPostSummary(row));
      for (const p of posts) usedIds.add(p.id);
      strips.push({
        category: { id: cat.id, name: cat.name, slug: cat.slug, color: cat.color },
        posts,
      });
    }
    return strips;
  }
}
