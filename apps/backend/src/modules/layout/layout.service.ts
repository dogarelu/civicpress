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
  effectiveMobileOrder,
  defaultModuleShowCategory,
  migrateLegacySummaryFromTypography,
  SIDEBAR_SINGLE_CATEGORY_DEFAULT_ID,
  SIDEBAR_SLIDESHOW_DEFAULT_ID,
  type PageLayoutConfig,
  type LayoutModule,
  type LayoutModuleSlot,
  type LayoutPageId,
  type CategoryStrip,
  type PostSummary,
  type ResolvedModule,
  type ResolvedRows4Row,
  type ResolvedSidebar,
  type ModuleType,
  type MobileLayoutUnit,
} from '@civicpress/shared';

const POST_SUMMARY_INCLUDE = {
  heroMedia: true,
  pill: true,
  author: true,
  categories: { include: { category: true } },
} as const;

const PUBLISHED = { status: PostStatus.PUBLISHED };

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
/** Default article count for sidebar "single-category" blocks. */
const SIDEBAR_SINGLE_CATEGORY_COUNT = 4;
/** Default size of a `list` module when no count option is set. */
const DEFAULT_LIST_COUNT = 10;
/** Default slide count for `slideshow` modules. */
const DEFAULT_SLIDESHOW_COUNT = 5;
/** Default article count for `grid` modules (2×2). */
const DEFAULT_GRID_COUNT = 4;
const ROWS4_SLOT_COUNT = 4;
const ROWS3_SLOT_COUNT = 3;
const CURRENT_YEAR_START = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

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
  return type === 'rows-4' || type === 'rows-3' || type === 'rows-4-sm';
}

function rowsModuleSlotCount(type: ModuleType): number {
  if (type === 'rows-4' || type === 'rows-4-sm') return ROWS4_SLOT_COUNT;
  if (type === 'rows-3') return ROWS3_SLOT_COUNT;
  return 0;
}
const DEFAULT_DISPLAY_SLOT = { showDate: true, showAuthor: true } as const;

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
      singleCategoryBlockSummarySettings: {},
      slideshowBlocks: {},
      slideshowBlockTypography: {},
      slideshowBlockSummarySettings: {},
      blockTypography: {},
      blockSummarySettings: {},
    },
    articleMainShowSummary: true,
    moduleTypographyPresets: {},
    mobileOrder: [],
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
      singleCategoryBlockSummarySettings: {},
      slideshowBlocks: {},
      slideshowBlockTypography: {},
      slideshowBlockSummarySettings: {},
      blockTypography: {},
      blockSummarySettings: {},
    },
    articleMainShowSummary: true,
    moduleTypographyPresets: {},
    mobileOrder: [],
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
      singleCategoryBlockSummarySettings: {},
      slideshowBlocks: {},
      slideshowBlockTypography: {},
      slideshowBlockSummarySettings: {},
      blockTypography: {},
      blockSummarySettings: {},
    },
    articleMainShowSummary: true,
    moduleTypographyPresets: {},
    mobileOrder: [],
  },
};

function moduleSlotCount(mod: LayoutModule): number {
  switch (mod.type) {
    case 'hero':
      return 1;
    case 'hero-list':
    case 'hero-top-list':
      return 4;
    case 'grid':
      return Math.max(1, Math.min(12, mod.options?.count ?? DEFAULT_GRID_COUNT));
    case 'hero-list-6':
      return 7;
    case 'list':
      return mod.options?.count ?? DEFAULT_LIST_COUNT;
    case 'hero-slideshow':
    case 'slideshow':
      return mod.options?.count ?? DEFAULT_SLIDESHOW_COUNT;
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
  }
}

function modulePinnedIds(mod: LayoutModule): string[] {
  if (isRowsModuleType(mod.type)) {
    return (mod.options?.rows ?? [])
      .flatMap((row) => row.slots)
      .map((slot) => slot.postId)
      .filter((id): id is string => id !== null);
  }
  return mod.slots.map((slot) => slot.postId).filter((id): id is string => id !== null);
}

function resizeModuleSlots(slots: LayoutModuleSlot[], capacity: number): LayoutModuleSlot[] {
  const next = slots.slice(0, capacity);
  while (next.length < capacity) {
    next.push({ ...DEFAULT_DISPLAY_SLOT, postId: null });
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
    (id) => slotByPostId.get(id) ?? { postId: id, ...DEFAULT_DISPLAY_SLOT },
  );
  while (result.length < capacity) {
    result.push({ postId: null, ...DEFAULT_DISPLAY_SLOT });
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
        [home, category, article].flatMap((c) => c.modules).flatMap((m) => modulePinnedIds(m)),
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
      if (isRowsModuleType(mod.type)) {
        for (const row of mod.options?.rows ?? []) {
          if (row.kind === 'category' && !row.categoryId) {
            throw new BadRequestException('Category rows require a category');
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

  /** Resolved category layout — modules auto-fill with the category's posts. */
  async resolveCategoryLayout(categoryId: string) {
    const config = await this.getConfig('category');
    return this.resolve(config, { categoryId, scaleSidebarForSegments: true });
  }

  /** Article page sidebar (null when disabled). Excludes the article itself. */
  async getArticleSidebar(excludePostId: string): Promise<ResolvedSidebar | null> {
    const { sidebar } = await this.getArticleLayout(excludePostId);
    return sidebar;
  }

  /** Article page layout (main modules + sidebar). Excludes the article itself. */
  async getArticleLayout(excludePostId: string): Promise<{
    modules: ResolvedModule[];
    sidebar: ResolvedSidebar | null;
    articleMainTypography: PageLayoutConfig['articleMainTypography'] | null;
    articleMainShowSummary: boolean;
    articleMainSummaryRows: number | null;
    articleMainSummaryTypography: PageLayoutConfig['articleMainSummaryTypography'] | null;
    mobileOrder: MobileLayoutUnit[];
  }> {
    const config = await this.getConfig('article');
    const resolved = await this.resolve(config, { excludeIds: [excludePostId] });
    return {
      ...resolved,
      articleMainTypography:
        migrateLegacySummaryFromTypography(config.articleMainTypography ?? null).typography ?? null,
      articleMainShowSummary: config.articleMainShowSummary ?? true,
      articleMainSummaryRows:
        config.articleMainSummaryRows ??
        migrateLegacySummaryFromTypography(config.articleMainTypography ?? null).summaryRows ??
        null,
      articleMainSummaryTypography:
        config.articleMainSummaryTypography ??
        migrateLegacySummaryFromTypography(config.articleMainTypography ?? null)
          .summaryTypography ??
        null,
    };
  }

  /**
   * Fill a layout config with posts, top to bottom, then the sidebar.
   * Pinned posts win when still published; everything else falls back to the
   * most recent published post not yet used anywhere on the page.
   */
  private async resolve(
    config: PageLayoutConfig,
    opts: { categoryId?: string; excludeIds?: string[]; scaleSidebarForSegments?: boolean },
  ): Promise<{
    modules: ResolvedModule[];
    sidebar: ResolvedSidebar | null;
    mobileOrder: MobileLayoutUnit[];
  }> {
    const usedIds = new Set<string>(opts.excludeIds ?? []);
    const sidebarSectionCount = opts.scaleSidebarForSegments
      ? Math.max(1, countWithSidebarSections(config.modules))
      : 1;

    const moduleWhere = {
      ...PUBLISHED,
      ...(opts.categoryId ? { categories: { some: { categoryId: opts.categoryId } } } : {}),
    };

    const videoWhere = {
      ...PUBLISHED,
      videoUrl: { not: null },
    };

    const slotCounts = config.modules.map(moduleSlotCount);
    const moduleNeed = slotCounts.reduce((a, b) => a + b, 0);
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
        return (
          total +
          sidebarFetchTotalForSections(
            sidebarSectionCount,
            config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
          )
        );
      }
      return total;
    }, 0);
    const sidebarMostViewedNeed = sidebarBlocks
      .filter((blockEntry) => sidebarBlockMode(blockEntry) === 'most-viewed')
      .reduce(
        (total) =>
          total +
          sidebarFetchTotalForSections(
            sidebarSectionCount,
            config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
          ),
        0,
      );
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
          mode === 'most-viewed'
        );
      });

    const pinnedIds = [...new Set(config.modules.flatMap((m) => modulePinnedIds(m)))];

    const [pinnedRows, poolRows, sidebarLatestRows, sidebarVideoRows, sidebarMostViewedRows] =
      await Promise.all([
        pinnedIds.length > 0
          ? this.prisma.post.findMany({
              where: { id: { in: pinnedIds }, ...PUBLISHED },
              include: POST_SUMMARY_INCLUDE,
            })
          : Promise.resolve([]),
        moduleNeed > 0 || sidebarFeedNeed > 0
          ? this.prisma.post.findMany({
              where: moduleWhere,
              orderBy: { publishedAt: 'desc' },
              // +1 extra row so we can tell whether more articles remain after filling.
              take: moduleNeed + sidebarFeedNeed + pinnedIds.length + usedIds.size + 1,
              include: POST_SUMMARY_INCLUDE,
            })
          : Promise.resolve([]),
        useGlobalPoolForSidebarFeed && sidebarFeedNeed > 0
          ? this.prisma.post.findMany({
              where: PUBLISHED,
              orderBy: { publishedAt: 'desc' },
              // +1 extra row so we can tell whether more articles remain after filling.
              take: sidebarFeedNeed + moduleNeed + usedIds.size + 1,
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
        config.sidebar.enabled && sidebarMostViewedNeed > 0
          ? this.prisma.post.findMany({
              where: {
                ...PUBLISHED,
                publishedAt: { gte: CURRENT_YEAR_START },
              },
              orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
              take: sidebarMostViewedNeed + moduleNeed + usedIds.size + 1,
              include: POST_SUMMARY_INCLUDE,
            })
          : Promise.resolve([]),
      ]);

    const sidebarVideoPool = sidebarVideoRows.map((row) => this.mapLayoutPostSummary(row));
    let sidebarVideoPoolIdx = 0;
    const nextFromVideoPool = (): PostSummary | null => {
      while (sidebarVideoPoolIdx < sidebarVideoPool.length) {
        const candidate = sidebarVideoPool[sidebarVideoPoolIdx++];
        if (!usedIds.has(candidate.id)) return candidate;
      }
      return null;
    };

    const pinnedById = new Map<string, PostSummary>(
      pinnedRows.map((row) => [row.id, this.mapLayoutPostSummary(row)] as const),
    );
    // Posts pinned to a slot are reserved: auto-fill must not consume them
    // before their own slot is reached.
    const reservedIds = new Set(pinnedById.keys());
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
        if (!usedIds.has(candidate.id)) return candidate;
      }
      return null;
    };
    const sidebarMostViewedPool = sidebarMostViewedRows.map((row) =>
      this.mapLayoutPostSummary(row),
    );
    let sidebarMostViewedPoolIdx = 0;
    const nextFromMostViewedPool = (): PostSummary | null => {
      while (sidebarMostViewedPoolIdx < sidebarMostViewedPool.length) {
        const candidate = sidebarMostViewedPool[sidebarMostViewedPoolIdx++];
        if (!usedIds.has(candidate.id)) return candidate;
      }
      return null;
    };

    const rowsCategoryIds = [
      ...new Set(
        config.modules
          .filter((mod) => isRowsModuleType(mod.type))
          .flatMap((mod) => mod.options?.rows ?? [])
          .filter((row) => row.kind === 'category' && row.categoryId)
          .map((row) => row.categoryId!),
      ),
    ];

    const [rowsCategories, ...rowsCategoryPostRows] = await Promise.all([
      rowsCategoryIds.length > 0
        ? this.prisma.category.findMany({ where: { id: { in: rowsCategoryIds } } })
        : Promise.resolve([]),
      ...rowsCategoryIds.map((categoryId) =>
        this.prisma.post.findMany({
          where: {
            ...PUBLISHED,
            categories: { some: { categoryId } },
          },
          orderBy: { publishedAt: 'desc' },
          take:
            config.modules
              .filter((mod) => isRowsModuleType(mod.type))
              .flatMap((mod) =>
                (mod.options?.rows ?? [])
                  .filter((row) => row.kind === 'category' && row.categoryId === categoryId)
                  .map((row) => rowsModuleSlotCount(mod.type) * (row.repeatCount ?? 1)),
              )
              .reduce((sum, count) => sum + count, 0) +
            pinnedIds.length +
            usedIds.size +
            1,
          include: POST_SUMMARY_INCLUDE,
        }),
      ),
    ]);

    const categoryById = new Map(rowsCategories.map((cat) => [cat.id, cat] as const));
    const categoryPoolById = new Map<string, PostSummary[]>();
    const categoryPoolIdx = new Map<string, number>();
    for (let i = 0; i < rowsCategoryIds.length; i++) {
      const categoryId = rowsCategoryIds[i];
      categoryPoolById.set(
        categoryId,
        rowsCategoryPostRows[i].map((row) => this.mapLayoutPostSummary(row)),
      );
      categoryPoolIdx.set(categoryId, 0);
    }

    const nextFromCategoryPool = (categoryId: string): PostSummary | null => {
      const categoryPool = categoryPoolById.get(categoryId) ?? [];
      let idx = categoryPoolIdx.get(categoryId) ?? 0;
      while (idx < categoryPool.length) {
        const candidate = categoryPool[idx++];
        categoryPoolIdx.set(categoryId, idx);
        if (!usedIds.has(candidate.id) && !reservedIds.has(candidate.id)) return candidate;
      }
      categoryPoolIdx.set(categoryId, idx);
      return null;
    };

    const resolveStandardModule = (mod: LayoutModule, count: number): ResolvedModule['posts'] => {
      const posts: ResolvedModule['posts'] = [];
      for (let slot = 0; slot < count; slot++) {
        const slotConfig = mod.slots[slot] ?? { postId: null, ...DEFAULT_DISPLAY_SLOT };
        const pinnedId = slotConfig.postId;
        let post: PostSummary | null = null;
        if (pinnedId && pinnedById.has(pinnedId) && !usedIds.has(pinnedId)) {
          post = pinnedById.get(pinnedId)!;
        } else {
          post = nextFromPool();
        }
        if (!post) break;
        usedIds.add(post.id);
        posts.push({
          post,
          showDate: slotConfig.showDate,
          showAuthor: slotConfig.showAuthor,
        });
      }
      return posts;
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
            const slotConfig = row.slots[slot] ?? { postId: null, ...DEFAULT_DISPLAY_SLOT };
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
              showDate: slotConfig.showDate,
              showAuthor: slotConfig.showAuthor,
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

    const modules: ResolvedModule[] = config.modules.map((mod, i) => {
      const legacyTypography = migrateLegacySummaryFromTypography(mod.options?.typography ?? null);
      const typography = legacyTypography.typography;
      const showSummary = mod.options?.showSummary ?? true;
      const summaryRows = mod.options?.summaryRows ?? legacyTypography.summaryRows;
      const summaryTypography =
        mod.options?.summaryTypography ?? legacyTypography.summaryTypography;
      if (mod.type === 'rows-4' || mod.type === 'rows-4-sm') {
        const rows = resolveRowsModule(mod, ROWS4_SLOT_COUNT);
        const showCategory = mod.options?.showCategory ?? false;
        return {
          id: mod.id,
          type: mod.type,
          posts: [],
          rows,
          typography: typography ?? undefined,
          showCategory,
          showSummary,
          summaryRows,
          summaryTypography,
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
          typography: typography ?? undefined,
          showCategory,
          showSummary,
          summaryRows,
          summaryTypography,
        };
      }

      const count = slotCounts[i];
      const posts = resolveStandardModule(mod, count);
      const showCategory = mod.options?.showCategory ?? defaultModuleShowCategory(mod.type);
      return {
        id: mod.id,
        type: mod.type,
        posts,
        typography: typography ?? undefined,
        showCategory,
        showSummary,
        summaryRows,
        summaryTypography,
      };
    });

    let sidebar: ResolvedSidebar | null = null;
    const blockTypography = config.sidebar.blockTypography ?? {};
    const singleCategoryBlockTypography = config.sidebar.singleCategoryBlockTypography ?? {};
    const slideshowBlockTypography = config.sidebar.slideshowBlockTypography ?? {};
    const blockSummarySettings = config.sidebar.blockSummarySettings ?? {};
    const singleCategoryBlockSummarySettings =
      config.sidebar.singleCategoryBlockSummarySettings ?? {};
    const slideshowBlockSummarySettings = config.sidebar.slideshowBlockSummarySettings ?? {};
    if (config.sidebar.enabled && config.sidebar.blocks.length > 0) {
      const blocks: ResolvedSidebar['blocks'] = [];
      for (const blockEntry of config.sidebar.blocks) {
        const block = sidebarBlockMode(blockEntry);
        if (block === 'latest') {
          const latestCount = config.sidebar.latestCount ?? SIDEBAR_LATEST_COUNT;
          const latestTotal = sidebarFetchTotalForSections(sidebarSectionCount, latestCount);
          const posts: PostSummary[] = [];
          for (let i = 0; i < latestTotal; i++) {
            const post = useGlobalPoolForSidebarFeed ? nextFromSidebarPool() : nextFromPool();
            if (!post) break;
            usedIds.add(post.id);
            posts.push(post);
          }
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
            overlayListTitle: config.sidebar.overlayListTitle ?? SIDEBAR_OVERLAY_LIST_TITLE,
            articleListCount: config.sidebar.articleListCount ?? SIDEBAR_ARTICLE_LIST_COUNT,
            articleListTitle: config.sidebar.articleListTitle ?? SIDEBAR_ARTICLE_LIST_TITLE,
            mostViewedCount: config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
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
          const posts: PostSummary[] = [];
          for (let i = 0; i < slideshowTotal; i++) {
            const post = useGlobalPoolForSidebarFeed ? nextFromSidebarPool() : nextFromPool();
            if (!post) break;
            usedIds.add(post.id);
            posts.push(post);
          }
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
          const posts: PostSummary[] = [];
          for (let i = 0; i < overlayListTotal; i++) {
            const post = useGlobalPoolForSidebarFeed ? nextFromSidebarPool() : nextFromPool();
            if (!post) break;
            usedIds.add(post.id);
            posts.push(post);
          }
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
          const posts: PostSummary[] = [];
          for (let i = 0; i < articleListTotal; i++) {
            const post = useGlobalPoolForSidebarFeed ? nextFromSidebarPool() : nextFromPool();
            if (!post) break;
            usedIds.add(post.id);
            posts.push(post);
          }
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
            singleCategoryCount:
              config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
          });
          continue;
        }

        if (block === 'most-viewed') {
          const mostViewedCount = config.sidebar.mostViewedCount ?? SIDEBAR_MOST_VIEWED_COUNT;
          const mostViewedTotal = sidebarFetchTotalForSections(
            sidebarSectionCount,
            mostViewedCount,
          );
          const posts: PostSummary[] = [];
          for (let i = 0; i < mostViewedTotal; i++) {
            const post = nextFromMostViewedPool();
            if (!post) break;
            usedIds.add(post.id);
            posts.push(post);
          }
          blocks.push({
            mode: 'most-viewed',
            posts,
            categoryStrips: [],
            latestSlots: [],
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: config.sidebar.mostViewedSlots ?? [],
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
            mostViewedCount,
            mostViewedTitle: config.sidebar.mostViewedTitle ?? SIDEBAR_MOST_VIEWED_TITLE,
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
                  ...PUBLISHED,
                  id: { notIn: [...usedIds] },
                  categories: { some: { categoryId: cat.id } },
                },
                orderBy: { publishedAt: 'desc' },
                take: singleCategoryTotal,
                include: POST_SUMMARY_INCLUDE,
              });
              const posts = rows.map((row) => this.mapLayoutPostSummary(row));
              for (const p of posts) usedIds.add(p.id);
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
            singleCategoryCount,
            slideshowTextPosition: config.sidebar.slideshowTextPosition,
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
          singleCategoryCount: config.sidebar.singleCategoryCount ?? SIDEBAR_SINGLE_CATEGORY_COUNT,
          slideshowTextPosition: config.sidebar.slideshowTextPosition,
        });
      }

      sidebar = {
        blocks,
        blockTypography,
        singleCategoryBlockTypography,
        slideshowBlockTypography,
        blockSummarySettings,
        singleCategoryBlockSummarySettings,
        slideshowBlockSummarySettings,
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
      if (mod.type === 'list') mod.hasMore = remaining;
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

    return { modules, sidebar, mobileOrder: effectiveMobileOrder(config) };
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
    if (opts.categorySlug) {
      const category = await this.prisma.category.findUnique({
        where: { slug: opts.categorySlug },
      });
      if (!category) return { posts: [], hasMore: false };
      categoryFilter = { categories: { some: { categoryId: category.id } } };
    }

    const rows = await this.prisma.post.findMany({
      where: {
        ...PUBLISHED,
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
    const menuCategories = await this.prisma.category.findMany({
      where: { showInMenu: true },
      orderBy: { menuOrder: 'asc' },
    });

    const strips: CategoryStrip[] = [];
    for (const cat of menuCategories) {
      const rows = await this.prisma.post.findMany({
        where: {
          ...PUBLISHED,
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
