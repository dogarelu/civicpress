import { z } from 'zod';

// ─── Media ────────────────────────────────────────────────────────────────────

export const MediaRefSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string().nullable(),
  caption: z.string().nullable(),
  mimeType: z.string(),
});
export type MediaRef = z.infer<typeof MediaRefSchema>;

// ─── Author ───────────────────────────────────────────────────────────────────

export const AuthorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  slug: z.string(),
  bio: z.string().nullable(),
  avatar: MediaRefSchema.nullable(),
});
export type Author = z.infer<typeof AuthorSchema>;

// ─── Category ─────────────────────────────────────────────────────────────────

export const CategorySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
});
export type CategorySummary = z.infer<typeof CategorySummarySchema>;

// ─── Pill (image overlay badge) ───────────────────────────────────────────────

export const PillSchema = z.object({
  id: z.string(),
  text: z.string(),
  color: z.string(),
  textColor: z.string(),
});
export type Pill = z.infer<typeof PillSchema>;

const pillHexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const PillCreateSchema = z.object({
  text: z.string().min(1).max(40),
  color: pillHexColor,
  textColor: pillHexColor.optional().default('#ffffff'),
});
export type PillCreate = z.infer<typeof PillCreateSchema>;

export const PillUpdateSchema = PillCreateSchema.partial();
export type PillUpdate = z.infer<typeof PillUpdateSchema>;

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const MenuItemSchema: z.ZodType<{
  id: string;
  name: string;
  slug: string;
  color: string | null;
  menuOrder: number;
  children?: MenuItem[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    color: z.string().nullable(),
    menuOrder: z.number().int(),
    children: z.array(MenuItemSchema).optional(),
  }),
);
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuResponseSchema = z.array(MenuItemSchema);
export type MenuResponse = z.infer<typeof MenuResponseSchema>;

// ─── Post ─────────────────────────────────────────────────────────────────────

export const PostSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  heroImage: MediaRefSchema.nullable(),
  primaryCategory: CategorySummarySchema.nullable(),
  author: z
    .object({
      id: z.string(),
      displayName: z.string(),
      slug: z.string(),
    })
    .nullable(),
  authorName: z.string().nullable().optional(),
  showDate: z.boolean().optional().default(true),
  showAuthor: z.boolean().optional().default(true),
  showSummary: z.boolean().optional().default(false),
  viewCount: z.number().int().nonnegative().optional().default(0),
  pill: PillSchema.nullable().optional(),
  videoUrl: z.string().nullable().optional(),
});
export type PostSummary = z.infer<typeof PostSummarySchema>;

export const PostBulbRefSchema = z.object({
  postId: z.string(),
  labelOverride: z.string().max(500).nullable().optional(),
});
export type PostBulbRef = z.infer<typeof PostBulbRefSchema>;

export const PostBulbResolvedSchema = z.object({
  postId: z.string(),
  labelOverride: z.string().nullable().optional(),
  post: PostSummarySchema,
});
export type PostBulbResolved = z.infer<typeof PostBulbResolvedSchema>;

// ─── Layout modules ───────────────────────────────────────────────────────────

export const CategoryStripSchema = z.object({
  category: CategorySummarySchema,
  posts: z.array(PostSummarySchema),
});
export type CategoryStrip = z.infer<typeof CategoryStripSchema>;

export const ModuleTypeSchema = z.enum([
  'hero',
  'hero-list',
  'hero-list-6',
  'hero-top-list',
  'hero-slideshow',
  'grid',
  'list',
  'rows-3',
  'rows-4',
  'rows-4-sm',
  'slideshow',
]);
export type ModuleType = z.infer<typeof ModuleTypeSchema>;

/** Module types that render full-width and interrupt the sidebar column. */
export const FULL_WIDTH_ONLY_MODULE_TYPES: ModuleType[] = ['rows-4', 'hero-list-6'];

export function isFullWidthModuleType(type: ModuleType): boolean {
  return FULL_WIDTH_ONLY_MODULE_TYPES.includes(type);
}

/**
 * Default `showCategory` when unset. Matches historical rendering:
 * hero/grid/list variants always displayed the category label, rows and
 * slideshow modules did not.
 */
export function defaultModuleShowCategory(type: ModuleType): boolean {
  switch (type) {
    case 'hero':
    case 'hero-list':
    case 'hero-list-6':
    case 'hero-top-list':
    case 'grid':
    case 'list':
      return true;
    case 'hero-slideshow':
    case 'slideshow':
    case 'rows-3':
    case 'rows-4':
    case 'rows-4-sm':
      return false;
  }
}

export const Rows4RowKindSchema = z.enum(['category', 'custom']);
export type Rows4RowKind = z.infer<typeof Rows4RowKindSchema>;

export const SidebarModeSchema = z.enum([
  'latest',
  'categories',
  'slideshow',
  'video',
  'overlay-list',
  'article-list',
  'most-viewed',
  'single-category',
]);
export type SidebarMode = z.infer<typeof SidebarModeSchema>;

export const SidebarSingleCategoryBlockRefSchema = z.object({
  mode: z.literal('single-category'),
  id: z.string().min(1),
});
export type SidebarSingleCategoryBlockRef = z.infer<typeof SidebarSingleCategoryBlockRefSchema>;

export const SidebarSlideshowBlockRefSchema = z.object({
  mode: z.literal('slideshow'),
  id: z.string().min(1),
});
export type SidebarSlideshowBlockRef = z.infer<typeof SidebarSlideshowBlockRefSchema>;

export const SidebarBlockEntrySchema = z.union([
  SidebarModeSchema,
  SidebarSingleCategoryBlockRefSchema,
  SidebarSlideshowBlockRefSchema,
]);
export type SidebarBlockEntry = z.infer<typeof SidebarBlockEntrySchema>;

export const SidebarBlocksSchema = z
  .array(SidebarBlockEntrySchema)
  .default([])
  .transform((blocks) => {
    const seenModes = new Set<SidebarMode>();
    const unique: SidebarBlockEntry[] = [];
    for (const block of blocks) {
      const mode = typeof block === 'string' ? block : block.mode;
      if (mode === 'single-category' || mode === 'slideshow') {
        unique.push(block);
      } else if (!seenModes.has(mode)) {
        seenModes.add(mode);
        unique.push(block);
      }
    }
    return unique;
  });
export type SidebarBlocks = z.infer<typeof SidebarBlocksSchema>;

export const SidebarSlideshowTextPositionSchema = z.enum(['on-image', 'below-image']);
export type SidebarSlideshowTextPosition = z.infer<typeof SidebarSlideshowTextPositionSchema>;

export const LayoutDisplaySlotSchema = z.object({
  showDate: z.boolean().default(true),
  showAuthor: z.boolean().default(true),
});
export type LayoutDisplaySlot = z.infer<typeof LayoutDisplaySlotSchema>;

export const SingleCategoryBlockConfigSchema = z.object({
  categoryId: z.string().nullable().optional().default(null),
  count: z.number().int().min(1).max(50).default(4),
  slots: z
    .array(LayoutDisplaySlotSchema)
    .default([])
    .transform((slots) =>
      slots.map((slot) => ({ showDate: slot.showDate, showAuthor: slot.showAuthor })),
    ),
});
export type SingleCategoryBlockConfig = z.infer<typeof SingleCategoryBlockConfigSchema>;

export const SlideshowBlockConfigSchema = z.object({
  count: z.number().int().min(1).max(10).default(5),
  textPosition: SidebarSlideshowTextPositionSchema.default('on-image'),
  slots: z
    .array(LayoutDisplaySlotSchema)
    .default([])
    .transform((slots) =>
      slots.map((slot) => ({ showDate: slot.showDate, showAuthor: slot.showAuthor })),
    ),
});
export type SlideshowBlockConfig = z.infer<typeof SlideshowBlockConfigSchema>;

export const SidebarVideoItemSchema = z.object({
  id: z.string().min(1),
  /** Optional label shown under the video player in sidebar. */
  title: z.string().max(200).nullable().optional().default(null),
  /** Accepts YouTube links or uploaded/self-hosted video URLs. */
  url: z.string().url(),
});
export type SidebarVideoItem = z.infer<typeof SidebarVideoItemSchema>;

const typographyHexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const typographyFontSize = z.number().int().min(10).max(60);
const typographyFontWeight = z.number().int().min(400).max(800);

/** Typography values for one text role (title or summary). */
export const ModuleTypographyStyleSchema = z.object({
  fontSize: typographyFontSize.optional(),
  fontWeight: typographyFontWeight.optional(),
  color: typographyHexColor.optional(),
});
export type ModuleTypographyStyle = z.infer<typeof ModuleTypographyStyleSchema>;

const MODULE_TYPOGRAPHY_ROLE_KEYS = [
  'title',
  'heroTitle',
  'smallTitle',
  'rowHeader',
  'category',
  'meta',
  'content',
] as const;
/** Text roles that can be styled independently per module. */
export type ModuleTypographyRole = (typeof MODULE_TYPOGRAPHY_ROLE_KEYS)[number];

function normalizeModuleTypographyValue(
  input: unknown,
): Partial<Record<ModuleTypographyRole, ModuleTypographyStyle>> {
  if (!input || typeof input !== 'object') return {};
  const value = input as Record<string, unknown>;
  const hasModernShape = MODULE_TYPOGRAPHY_ROLE_KEYS.some((key) => key in value);
  if (hasModernShape) {
    const result: Partial<Record<ModuleTypographyRole, ModuleTypographyStyle>> = {};
    for (const key of MODULE_TYPOGRAPHY_ROLE_KEYS) {
      if (value[key] != null) result[key] = value[key] as ModuleTypographyStyle;
    }
    return result;
  }
  // Backward compatibility with legacy flat typography objects.
  return { title: value as ModuleTypographyStyle };
}

/** Default visible summary lines when `summaryRows` is omitted (backward compatible). */
export const DEFAULT_SUMMARY_ROWS = 3;

/** Per-module text style overrides, one entry per text role. */
export const ModuleTypographySchema = z.preprocess(
  normalizeModuleTypographyValue,
  z.object({
    /** Main article titles (card / list titles). */
    title: ModuleTypographyStyleSchema.optional(),
    /** Hero overlay / slideshow titles (falls back to `title` for legacy configs). */
    heroTitle: ModuleTypographyStyleSchema.optional(),
    /** Small/secondary item titles (hero-list sidebar, hero-top-list cards, sidebar lists). */
    smallTitle: ModuleTypographyStyleSchema.optional(),
    /** Section/row header of rows modules. */
    rowHeader: ModuleTypographyStyleSchema.optional(),
    /** Category label shown above/next to titles. */
    category: ModuleTypographyStyleSchema.optional(),
    /** Meta row: date / author / view count. */
    meta: ModuleTypographyStyleSchema.optional(),
    /** Body/content text style (used by the article page main block). */
    content: ModuleTypographyStyleSchema.optional(),
  }),
);
export type ModuleTypography = z.infer<typeof ModuleTypographySchema>;

/** Module/block-level summary visibility + typography controls. */
export const SummaryDisplaySettingsSchema = z.object({
  showSummary: z.boolean().optional(),
  summaryRows: z.number().int().min(1).max(8).optional(),
  summaryTypography: ModuleTypographyStyleSchema.optional(),
});
export type SummaryDisplaySettings = z.infer<typeof SummaryDisplaySettingsSchema>;

/** Typography overrides for each sidebar block type. */
export const SidebarBlockTypographySchema = z.object({
  latest: ModuleTypographySchema.optional(),
  categories: ModuleTypographySchema.optional(),
  slideshow: ModuleTypographySchema.optional(),
  video: ModuleTypographySchema.optional(),
  'overlay-list': ModuleTypographySchema.optional(),
  'article-list': ModuleTypographySchema.optional(),
  'most-viewed': ModuleTypographySchema.optional(),
  'single-category': ModuleTypographySchema.optional(),
});
export type SidebarBlockTypography = z.infer<typeof SidebarBlockTypographySchema>;

/** Summary overrides for each sidebar block type. */
export const SidebarBlockSummarySettingsSchema = z.object({
  latest: SummaryDisplaySettingsSchema.optional(),
  categories: SummaryDisplaySettingsSchema.optional(),
  slideshow: SummaryDisplaySettingsSchema.optional(),
  video: SummaryDisplaySettingsSchema.optional(),
  'overlay-list': SummaryDisplaySettingsSchema.optional(),
  'article-list': SummaryDisplaySettingsSchema.optional(),
  'most-viewed': SummaryDisplaySettingsSchema.optional(),
  'single-category': SummaryDisplaySettingsSchema.optional(),
});
export type SidebarBlockSummarySettings = z.infer<typeof SidebarBlockSummarySettingsSchema>;

/** Typography presets per module type (admin re-add memory). */
export const ModuleTypographyPresetsSchema = z.object({
  hero: ModuleTypographySchema.optional(),
  'hero-list': ModuleTypographySchema.optional(),
  'hero-list-6': ModuleTypographySchema.optional(),
  'hero-top-list': ModuleTypographySchema.optional(),
  'hero-slideshow': ModuleTypographySchema.optional(),
  grid: ModuleTypographySchema.optional(),
  list: ModuleTypographySchema.optional(),
  'rows-3': ModuleTypographySchema.optional(),
  'rows-4': ModuleTypographySchema.optional(),
  'rows-4-sm': ModuleTypographySchema.optional(),
  slideshow: ModuleTypographySchema.optional(),
});
export type ModuleTypographyPresets = z.infer<typeof ModuleTypographyPresetsSchema>;

export const LayoutModuleSlotSchema = z.object({
  postId: z.string().nullable().default(null),
  showDate: z.boolean().default(true),
  showAuthor: z.boolean().default(true),
});
export type LayoutModuleSlot = z.infer<typeof LayoutModuleSlotSchema>;

export const Rows4RowSchema = z.object({
  id: z.string().min(1),
  kind: Rows4RowKindSchema,
  /** Required when `kind` is `category`. */
  categoryId: z.string().nullable().optional().default(null),
  /** Optional display name; category rows fall back to the category name when empty. */
  name: z.string().max(200).nullable().optional().default(null),
  /** How many identical rows to render from this configuration (1–10). */
  repeatCount: z.number().int().min(1).max(10).optional().default(1),
  slots: z
    .array(z.union([z.string().nullable(), LayoutModuleSlotSchema]))
    .default([])
    .transform((slots) => {
      const normalized = slots.map((slot) =>
        typeof slot === 'string' || slot === null
          ? { postId: slot, showDate: true, showAuthor: true }
          : slot,
      );
      while (normalized.length < 4) {
        normalized.push({ postId: null, showDate: true, showAuthor: true });
      }
      return normalized.slice(0, 4);
    }),
});
export type Rows4Row = z.infer<typeof Rows4RowSchema>;

export const Rows3RowSchema = z.object({
  id: z.string().min(1),
  kind: Rows4RowKindSchema,
  /** Required when `kind` is `category`. */
  categoryId: z.string().nullable().optional().default(null),
  /** Optional display name; category rows fall back to the category name when empty. */
  name: z.string().max(200).nullable().optional().default(null),
  /** How many identical rows to render from this configuration (1–10). */
  repeatCount: z.number().int().min(1).max(10).optional().default(1),
  slots: z
    .array(z.union([z.string().nullable(), LayoutModuleSlotSchema]))
    .default([])
    .transform((slots) => {
      const normalized = slots.map((slot) =>
        typeof slot === 'string' || slot === null
          ? { postId: slot, showDate: true, showAuthor: true }
          : slot,
      );
      while (normalized.length < 3) {
        normalized.push({ postId: null, showDate: true, showAuthor: true });
      }
      return normalized.slice(0, 3);
    }),
});
export type Rows3Row = z.infer<typeof Rows3RowSchema>;

export const LayoutModuleSchema = z.object({
  id: z.string().min(1),
  type: ModuleTypeSchema,
  options: z
    .object({
      /** User-defined display name for the module (shown in admin placement dropdown). */
      name: z.string().max(200).nullable().optional().default(null),
      /** Article count for `list` (1–50), `grid` (1–12), `slideshow` / `hero-slideshow` (1–10). */
      count: z.number().int().min(1).max(50).optional(),
      /** Ordered rows for `rows-3` / `rows-4` modules. */
      rows: z.array(z.union([Rows3RowSchema, Rows4RowSchema])).optional(),
      /** When set on home standard modules, auto-fill slots from this category only. */
      categoryId: z.string().nullable().optional().default(null),
      /** Optional text style override for all text in this module. */
      typography: ModuleTypographySchema.optional(),
      /**
       * When true, each article card shows its primary category on the meta row.
       * Left unset, consumers apply a per-module-type default (hero-list variants show it).
       */
      showCategory: z.boolean().optional(),
      /** Toggle summary (excerpt) text visibility under titles. */
      showSummary: z.boolean().optional(),
      /** Optional per-module summary line-clamp override (1–8). */
      summaryRows: z.number().int().min(1).max(8).optional(),
      /** Optional per-module summary text style override. */
      summaryTypography: ModuleTypographyStyleSchema.optional(),
    })
    .optional()
    .default({}),
  /**
   * Per-slot config:
   * - postId: pinned post id (null = auto-fill)
   * - showDate / showAuthor: display toggles used by public rendering
   */
  slots: z
    .array(z.union([z.string().nullable(), LayoutModuleSlotSchema]))
    .default([])
    .transform((slots) =>
      slots.map((slot) =>
        typeof slot === 'string' || slot === null
          ? { postId: slot, showDate: true, showAuthor: true }
          : slot,
      ),
    ),
});
export type LayoutModule = z.infer<typeof LayoutModuleSchema>;

const SidebarConfigInnerSchema = z
  .object({
    enabled: z.boolean(),
    blocks: SidebarBlocksSchema,
    slideshowCount: z.number().int().min(1).max(10).default(5),
    /** Number of articles shown in a `latest` sidebar block. */
    latestCount: z.number().int().min(1).max(50).default(10),
    /** Number of videos shown when a `video` block is enabled. */
    videoCount: z.number().int().min(1).max(50).default(5),
    /** Manual videos for sidebar `video` blocks (YouTube or uploaded file URLs). */
    videoItems: z.array(SidebarVideoItemSchema).default([]),
    slideshowTextPosition: SidebarSlideshowTextPositionSchema.default('on-image'),
    /** Number of articles shown in an `overlay-list` sidebar block. */
    overlayListCount: z.number().int().min(1).max(50).default(5),
    /** Header label for the `latest` sidebar block. Empty hides the header. */
    latestTitle: z.string().max(100).default('Ultimele știri'),
    /** Header label for the `overlay-list` sidebar block. */
    overlayListTitle: z.string().max(100).default('Ultimele știri'),
    /** Number of articles shown in an `article-list` sidebar block. */
    articleListCount: z.number().int().min(1).max(50).default(5),
    /** Header label for the `article-list` sidebar block. Empty hides the header. */
    articleListTitle: z.string().max(100).default('Articole'),
    /** Number of articles shown in a `most-viewed` sidebar block. */
    mostViewedCount: z.number().int().min(1).max(50).default(5),
    /** Header label for the `most-viewed` sidebar block. */
    mostViewedTitle: z.string().max(100).default('Cele mai citite'),
    /** Number of articles shown in a `single-category` sidebar block. */
    singleCategoryCount: z.number().int().min(1).max(50).default(4),
    /** Category id for the `single-category` sidebar block. */
    singleCategoryId: z.string().nullable().optional().default(null),
    /** Per-instance config for `single-category` sidebar blocks (keyed by block id). */
    singleCategoryBlocks: z
      .record(z.string(), SingleCategoryBlockConfigSchema)
      .optional()
      .default({}),
    /** Per-instance typography for `single-category` sidebar blocks (keyed by block id). */
    singleCategoryBlockTypography: z
      .record(z.string(), ModuleTypographySchema)
      .optional()
      .default({}),
    /** Per-instance summary settings for `single-category` blocks (keyed by block id). */
    singleCategoryBlockSummarySettings: z
      .record(z.string(), SummaryDisplaySettingsSchema)
      .optional()
      .default({}),
    /** Per-instance config for `slideshow` sidebar blocks (keyed by block id). */
    slideshowBlocks: z.record(z.string(), SlideshowBlockConfigSchema).optional().default({}),
    /** Per-instance typography for `slideshow` sidebar blocks (keyed by block id). */
    slideshowBlockTypography: z.record(z.string(), ModuleTypographySchema).optional().default({}),
    /** Per-instance summary settings for `slideshow` blocks (keyed by block id). */
    slideshowBlockSummarySettings: z
      .record(z.string(), SummaryDisplaySettingsSchema)
      .optional()
      .default({}),
    latestSlots: z
      .array(LayoutDisplaySlotSchema)
      .default([])
      .transform((slots) =>
        slots.map((slot) => ({ showDate: slot.showDate, showAuthor: slot.showAuthor })),
      ),
    categorySlots: z
      .array(LayoutDisplaySlotSchema)
      .default([])
      .transform((slots) =>
        slots.map((slot) => ({ showDate: slot.showDate, showAuthor: slot.showAuthor })),
      ),
    overlayListSlots: z
      .array(LayoutDisplaySlotSchema)
      .default([])
      .transform((slots) =>
        slots.map((slot) => ({ showDate: slot.showDate, showAuthor: slot.showAuthor })),
      ),
    articleListSlots: z
      .array(LayoutDisplaySlotSchema)
      .default([])
      .transform((slots) =>
        slots.map((slot) => ({ showDate: slot.showDate, showAuthor: slot.showAuthor })),
      ),
    mostViewedSlots: z
      .array(LayoutDisplaySlotSchema)
      .default([])
      .transform((slots) =>
        slots.map((slot) => ({ showDate: slot.showDate, showAuthor: slot.showAuthor })),
      ),
    singleCategorySlots: z
      .array(LayoutDisplaySlotSchema)
      .default([])
      .transform((slots) =>
        slots.map((slot) => ({ showDate: slot.showDate, showAuthor: slot.showAuthor })),
      ),
    /** Per-block typography overrides (latest, categories, slideshow, video). */
    blockTypography: SidebarBlockTypographySchema.optional().default({}),
    /** Per-block summary overrides (latest, categories, slideshow, video). */
    blockSummarySettings: SidebarBlockSummarySettingsSchema.optional().default({}),
  })
  .superRefine((value, ctx) => {
    if (value.blocks.includes('latest') && value.blocks.includes('categories')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sidebar blocks cannot contain both latest and categories.',
        path: ['blocks'],
      });
    }
  });

export const SidebarConfigSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object') return input;
  const value = input as Record<string, unknown>;
  const rawBlocks = Array.isArray(value.blocks)
    ? value.blocks
    : typeof value.mode === 'string'
      ? [value.mode]
      : [];
  const blocks = rawBlocks.map((block) => {
    if (block === 'single-category') return { mode: 'single-category', id: 'sc-default' };
    if (block === 'slideshow') return { mode: 'slideshow', id: 'ss-default' };
    return block;
  });

  const singleCategoryBlocks = {
    ...((value.singleCategoryBlocks as Record<string, unknown>) ?? {}),
  };
  const hasDefaultBlock = blocks.some(
    (block) =>
      typeof block === 'object' &&
      block !== null &&
      (block as { mode?: string; id?: string }).mode === 'single-category' &&
      (block as { id?: string }).id === 'sc-default',
  );
  if (hasDefaultBlock && !singleCategoryBlocks['sc-default']) {
    singleCategoryBlocks['sc-default'] = {
      categoryId: value.singleCategoryId ?? null,
      count: value.singleCategoryCount ?? 4,
      slots: value.singleCategorySlots ?? [],
    };
  }

  const slideshowBlocks = {
    ...((value.slideshowBlocks as Record<string, unknown>) ?? {}),
  };
  const hasDefaultSlideshow = blocks.some(
    (block) =>
      typeof block === 'object' &&
      block !== null &&
      (block as { mode?: string; id?: string }).mode === 'slideshow' &&
      (block as { id?: string }).id === 'ss-default',
  );
  if (hasDefaultSlideshow && !slideshowBlocks['ss-default']) {
    slideshowBlocks['ss-default'] = {
      count: value.slideshowCount ?? 5,
      textPosition: value.slideshowTextPosition ?? 'on-image',
      slots: value.latestSlots ?? [],
    };
  }

  return { ...value, blocks, singleCategoryBlocks, slideshowBlocks };
}, SidebarConfigInnerSchema);
export type SidebarConfig = z.infer<typeof SidebarConfigSchema>;

export const MobileLayoutUnitSchema = z.object({
  kind: z.enum(['module', 'sidebar']),
  /** module.id for kind=module; sidebar block ref for kind=sidebar */
  ref: z.string().min(1),
});
export type MobileLayoutUnit = z.infer<typeof MobileLayoutUnitSchema>;

export const PageLayoutConfigSchema = z.object({
  modules: z.array(LayoutModuleSchema).default([]),
  sidebar: SidebarConfigSchema,
  /** Drag-and-drop order of main modules + sidebar blocks on mobile. */
  mobileOrder: z.array(MobileLayoutUnitSchema).optional().default([]),
  /** Typography override for the main article block on the article page. */
  articleMainTypography: ModuleTypographySchema.optional(),
  /** Article page summary visibility override (default true). */
  articleMainShowSummary: z.boolean().optional().default(true),
  /** Article page summary line-clamp override (1–8). */
  articleMainSummaryRows: z.number().int().min(1).max(8).optional(),
  /** Article page summary typography override. */
  articleMainSummaryTypography: ModuleTypographyStyleSchema.optional(),
  /** Per module-type typography presets for admin re-add (not used in public rendering). */
  moduleTypographyPresets: ModuleTypographyPresetsSchema.optional().default({}),
});
export type PageLayoutConfig = z.infer<typeof PageLayoutConfigSchema>;

export const LayoutPageIdSchema = z.enum(['home', 'category', 'article']);
export type LayoutPageId = z.infer<typeof LayoutPageIdSchema>;

export const AdminLayoutsSchema = z.object({
  home: PageLayoutConfigSchema,
  category: PageLayoutConfigSchema,
  article: PageLayoutConfigSchema,
  /** Summaries of all posts pinned anywhere, keyed by post id (for the editor UI). */
  posts: z.record(PostSummarySchema),
});
export type AdminLayouts = z.infer<typeof AdminLayoutsSchema>;

/** Target page for placing an article into a layout module. */
export const ModulePlacementPageSchema = z.enum(['home', 'category']);
export type ModulePlacementPage = z.infer<typeof ModulePlacementPageSchema>;

/** Request body for pinning a post at the front of a layout module slot list. */
export const PinPostAtFrontSchema = z.object({
  postId: z.string().min(1),
  /** Primary category of the post — used to validate home-page row targets. */
  categoryId: z.string().min(1),
  page: ModulePlacementPageSchema,
  moduleId: z.string().min(1),
  /** Required when the target module is `rows-3` / `rows-4`. */
  rowId: z.string().min(1).optional(),
});
export type PinPostAtFront = z.infer<typeof PinPostAtFrontSchema>;

// ─── Resolved layout (public) ─────────────────────────────────────────────────

export const ResolvedModulePostSchema = z.object({
  post: PostSummarySchema,
  showDate: z.boolean(),
  showAuthor: z.boolean(),
});
export type ResolvedModulePost = z.infer<typeof ResolvedModulePostSchema>;

export const ResolvedRows4RowSchema = z.object({
  id: z.string(),
  kind: Rows4RowKindSchema,
  title: z.string(),
  category: CategorySummarySchema.nullable().optional(),
  posts: z.array(ResolvedModulePostSchema),
});
export type ResolvedRows4Row = z.infer<typeof ResolvedRows4RowSchema>;

export const ResolvedRows3RowSchema = z.object({
  id: z.string(),
  kind: Rows4RowKindSchema,
  title: z.string(),
  category: CategorySummarySchema.nullable().optional(),
  posts: z.array(ResolvedModulePostSchema),
});
export type ResolvedRows3Row = z.infer<typeof ResolvedRows3RowSchema>;

export const ResolvedModuleSchema = z.object({
  id: z.string(),
  type: ModuleTypeSchema,
  posts: z.array(ResolvedModulePostSchema),
  /** Populated for `rows-3` / `rows-4` modules. */
  rows: z.array(z.union([ResolvedRows3RowSchema, ResolvedRows4RowSchema])).optional(),
  /** When true, article cards show their primary category label. */
  showCategory: z.boolean().optional().default(false),
  /** Set on `list` modules: more published articles exist beyond this page. */
  hasMore: z.boolean().optional(),
  /** Whether summary (excerpt) text is visible on article cards. */
  showSummary: z.boolean().optional(),
  /** Optional per-module summary line-clamp override (1–8). */
  summaryRows: z.number().int().min(1).max(8).optional(),
  /** Optional per-module summary typography override. */
  summaryTypography: ModuleTypographyStyleSchema.optional(),
  /** Optional text style override for all text in this module. */
  typography: ModuleTypographySchema.optional(),
});
export type ResolvedModule = z.infer<typeof ResolvedModuleSchema>;

/** Response of the public "load more articles" feed endpoint. */
export const PostsFeedResponseSchema = z.object({
  posts: z.array(PostSummarySchema),
  hasMore: z.boolean(),
});
export type PostsFeedResponse = z.infer<typeof PostsFeedResponseSchema>;

export const ResolvedSidebarBlockSchema = z.object({
  mode: SidebarModeSchema,
  /** Set on multi-instance sidebar blocks for per-instance config/typography. */
  blockId: z.string().optional(),
  posts: z.array(PostSummarySchema).default([]),
  categoryStrips: z.array(CategoryStripSchema).default([]),
  latestSlots: z.array(LayoutDisplaySlotSchema).default([]),
  categorySlots: z.array(LayoutDisplaySlotSchema).default([]),
  overlayListSlots: z.array(LayoutDisplaySlotSchema).default([]),
  articleListSlots: z.array(LayoutDisplaySlotSchema).default([]),
  mostViewedSlots: z.array(LayoutDisplaySlotSchema).default([]),
  singleCategorySlots: z.array(LayoutDisplaySlotSchema).default([]),
  latestCount: z.number().int().min(1).max(50).default(10),
  slideshowCount: z.number().int().min(1).max(10).default(5),
  videoCount: z.number().int().min(1).max(50).default(5),
  /** Manual videos configured in admin (shown before post-attached videos). */
  videoItems: z.array(SidebarVideoItemSchema).default([]),
  overlayListCount: z.number().int().min(1).max(50).default(5),
  latestTitle: z.string().max(100).default('Ultimele știri'),
  overlayListTitle: z.string().max(100).default('Ultimele știri'),
  articleListCount: z.number().int().min(1).max(50).default(5),
  articleListTitle: z.string().max(100).default('Articole'),
  mostViewedCount: z.number().int().min(1).max(50).default(5),
  mostViewedTitle: z.string().max(100).default('Cele mai citite'),
  singleCategoryCount: z.number().int().min(1).max(50).default(4),
  slideshowTextPosition: SidebarSlideshowTextPositionSchema.default('on-image'),
  /** Set for blocks that support "Mai multe" (latest/video). */
  hasMore: z.boolean().optional(),
});
export type ResolvedSidebarBlock = z.infer<typeof ResolvedSidebarBlockSchema>;

export const SIDEBAR_LATEST_TITLE_DEFAULT = 'Ultimele știri';
export const SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT = 'Ultimele știri';
export const SIDEBAR_MOST_VIEWED_TITLE_DEFAULT = 'Cele mai citite';

export const ResolvedSidebarSchema = z.object({
  blocks: z.array(ResolvedSidebarBlockSchema).default([]),
  /** Per-block typography overrides from layout config. */
  blockTypography: SidebarBlockTypographySchema.optional().default({}),
  /** Per-block summary overrides from layout config. */
  blockSummarySettings: SidebarBlockSummarySettingsSchema.optional().default({}),
  /** Per-instance typography for `single-category` blocks (keyed by block id). */
  singleCategoryBlockTypography: z
    .record(z.string(), ModuleTypographySchema)
    .optional()
    .default({}),
  /** Per-instance summary settings for `single-category` blocks (keyed by block id). */
  singleCategoryBlockSummarySettings: z
    .record(z.string(), SummaryDisplaySettingsSchema)
    .optional()
    .default({}),
  /** Per-instance typography for `slideshow` blocks (keyed by block id). */
  slideshowBlockTypography: z.record(z.string(), ModuleTypographySchema).optional().default({}),
  /** Per-instance summary settings for `slideshow` blocks (keyed by block id). */
  slideshowBlockSummarySettings: z
    .record(z.string(), SummaryDisplaySettingsSchema)
    .optional()
    .default({}),
});
export type ResolvedSidebar = z.infer<typeof ResolvedSidebarSchema>;

// ─── Post detail ──────────────────────────────────────────────────────────────

export const PostDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  contentHtml: z.string(),
  publishedAt: z.string().datetime().nullable(),
  heroImage: MediaRefSchema.nullable(),
  videoUrl: z.string().nullable(),
  author: AuthorSchema.nullable(),
  authorName: z.string().nullable().optional(),
  showDate: z.boolean().optional().default(true),
  showAuthor: z.boolean().optional().default(true),
  showSummary: z.boolean().optional().default(false),
  viewCount: z.number().int().nonnegative().optional().default(0),
  categories: z.array(CategorySummarySchema),
  tags: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  relatedPosts: z.array(PostSummarySchema),
  latestPosts: z.array(PostSummarySchema).optional().default([]),
  /** Typography override for the main article block (title + content). */
  articleMainTypography: ModuleTypographySchema.nullable().optional(),
  /** Article main summary visibility override (default true). */
  articleMainShowSummary: z.boolean().optional().default(true),
  /** Article main summary line-clamp override (1–8). */
  articleMainSummaryRows: z.number().int().min(1).max(8).optional(),
  /** Article main summary typography override. */
  articleMainSummaryTypography: ModuleTypographyStyleSchema.nullable().optional(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  pill: PillSchema.nullable().optional(),
  bulbi: z.array(PostBulbResolvedSchema).optional().default([]),
  modules: z.array(ResolvedModuleSchema).optional().default([]),
  sidebar: ResolvedSidebarSchema.nullable().optional(),
  mobileOrder: z.array(MobileLayoutUnitSchema).optional().default([]),
});
export type PostDetail = z.infer<typeof PostDetailSchema>;

// ─── Admin category schemas ───────────────────────────────────────────────────

export const AdminCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  parentId: z.string().nullable(),
  showInMenu: z.boolean(),
  menuOrder: z.number().int(),
  postCount: z.number().int(),
});
export type AdminCategory = z.infer<typeof AdminCategorySchema>;

export const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  description: z.string().max(500).nullable().optional(),
  parentId: z.string().nullable().optional(),
  showInMenu: z.boolean().optional(),
});
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;

export const CategoryUpdateSchema = CategoryCreateSchema.partial();
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;

export const CategoryReorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});
export type CategoryReorder = z.infer<typeof CategoryReorderSchema>;

// ─── Category detail ──────────────────────────────────────────────────────────

export const CategoryDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  parent: CategorySummarySchema.nullable().optional(),
  subcategories: z.array(MenuItemSchema).optional(),
  posts: z.array(PostSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  perPage: z.number().int(),
  /** Resolved module layout — only present on page 1. */
  modules: z.array(ResolvedModuleSchema).nullable().optional(),
  /** Whether paginated category list cards should show summary text. */
  showSummary: z.boolean().optional(),
  sidebar: ResolvedSidebarSchema.nullable().optional(),
  mobileOrder: z.array(MobileLayoutUnitSchema).optional().default([]),
});
export type CategoryDetail = z.infer<typeof CategoryDetailSchema>;

// ─── Home response ────────────────────────────────────────────────────────────

export const HomeResponseSchema = z.object({
  modules: z.array(ResolvedModuleSchema),
  sidebar: ResolvedSidebarSchema.nullable(),
  mobileOrder: z.array(MobileLayoutUnitSchema).optional().default([]),
});
export type HomeResponse = z.infer<typeof HomeResponseSchema>;

// ─── Exchange rates (BNR) ───────────────────────────────────────────────────

export const ExchangeRateSchema = z.object({
  currency: z.string(),
  name: z.string(),
  rate: z.number(),
  multiplier: z.number().int().default(1),
});
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>;

export const ExchangeRatesResponseSchema = z.object({
  publishedAt: z.string(),
  rates: z.array(ExchangeRateSchema),
});
export type ExchangeRatesResponse = z.infer<typeof ExchangeRatesResponseSchema>;

// ─── Public settings ──────────────────────────────────────────────────────────

export const PublicSettingsSchema = z.object({
  siteName: z.string(),
  tagline: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  headingFont: z.string(),
  bodyFont: z.string(),
  headerMaxCategories: z.number().int(),
  headerShowMoreDropdown: z.boolean(),
  headerMoreCategoryIds: z.array(z.string()),
  newsTitleFontSize: z.number().int(),
  newsTitleFontWeight: z.number().int(),
  newsSummaryFontSize: z.number().int(),
  newsSummaryFontWeight: z.number().int(),
  defaultSummaryRows: z.number().int(),
  heroTitleFontSize: z.number().int(),
  heroTitleFontWeight: z.number().int(),
  sidebarTitleFontSize: z.number().int(),
  sidebarTitleFontWeight: z.number().int(),
  articleTitleFontSize: z.number().int(),
  articleTitleFontWeight: z.number().int(),
  articleContentFontSize: z.number().int(),
  articleContentFontWeight: z.number().int(),
  showArticleViews: z.boolean(),
  facebookUrl: z.string().url().nullable(),
  twitterUrl: z.string().url().nullable(),
  youtubeUrl: z.string().url().nullable(),
  instagramUrl: z.string().url().nullable(),
  footerHtml: z.string().nullable(),
  footerContactInfo: z.string().nullable(),
  contactPageHtml: z.string().nullable(),
  termsPageHtml: z.string().nullable(),
  privacyPageHtml: z.string().nullable(),
  cookiePageHtml: z.string().nullable(),
});
export type PublicSettings = z.infer<typeof PublicSettingsSchema>;

// ─── Admin settings ───────────────────────────────────────────────────────────

export const AdminSettingsSchema = z.object({
  siteName: z.string(),
  tagline: z.string().nullable(),
  logoMediaId: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  headingFont: z.string(),
  bodyFont: z.string(),
  headerMaxCategories: z.number().int(),
  headerShowMoreDropdown: z.boolean(),
  headerMoreCategoryIds: z.array(z.string()),
  newsTitleFontSize: z.number().int(),
  newsTitleFontWeight: z.number().int(),
  newsSummaryFontSize: z.number().int(),
  newsSummaryFontWeight: z.number().int(),
  defaultSummaryRows: z.number().int(),
  heroTitleFontSize: z.number().int(),
  heroTitleFontWeight: z.number().int(),
  sidebarTitleFontSize: z.number().int(),
  sidebarTitleFontWeight: z.number().int(),
  articleTitleFontSize: z.number().int(),
  articleTitleFontWeight: z.number().int(),
  articleContentFontSize: z.number().int(),
  articleContentFontWeight: z.number().int(),
  showArticleViews: z.boolean(),
  facebookUrl: z.string().nullable(),
  twitterUrl: z.string().nullable(),
  youtubeUrl: z.string().nullable(),
  instagramUrl: z.string().nullable(),
  footerHtml: z.string().nullable(),
  footerContactInfo: z.string().nullable(),
  contactPageHtml: z.string().nullable(),
  termsPageHtml: z.string().nullable(),
  privacyPageHtml: z.string().nullable(),
  cookiePageHtml: z.string().nullable(),
});
export type AdminSettings = z.infer<typeof AdminSettingsSchema>;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const urlOrEmpty = z.union([z.string().url(), z.literal('')]).nullable();
const fontSize = z.number().int().min(10).max(60);
const fontWeight = z.number().int().min(400).max(800);
const summaryRows = z.number().int().min(1).max(8);

export const SettingsUpdateSchema = z.object({
  siteName: z.string().min(1).max(200).optional(),
  tagline: z.string().max(300).nullable().optional(),
  logoMediaId: z.string().nullable().optional(),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  backgroundColor: hexColor.optional(),
  textColor: hexColor.optional(),
  headingFont: z.string().min(1).max(120).optional(),
  bodyFont: z.string().min(1).max(120).optional(),
  headerMaxCategories: z.number().int().min(1).max(20).optional(),
  headerShowMoreDropdown: z.boolean().optional(),
  headerMoreCategoryIds: z.array(z.string()).max(100).optional(),
  newsTitleFontSize: fontSize.optional(),
  newsTitleFontWeight: fontWeight.optional(),
  newsSummaryFontSize: fontSize.optional(),
  newsSummaryFontWeight: fontWeight.optional(),
  defaultSummaryRows: summaryRows.optional(),
  heroTitleFontSize: fontSize.optional(),
  heroTitleFontWeight: fontWeight.optional(),
  sidebarTitleFontSize: fontSize.optional(),
  sidebarTitleFontWeight: fontWeight.optional(),
  articleTitleFontSize: fontSize.optional(),
  articleTitleFontWeight: fontWeight.optional(),
  articleContentFontSize: fontSize.optional(),
  articleContentFontWeight: fontWeight.optional(),
  showArticleViews: z.boolean().optional(),
  facebookUrl: urlOrEmpty.optional(),
  twitterUrl: urlOrEmpty.optional(),
  youtubeUrl: urlOrEmpty.optional(),
  instagramUrl: urlOrEmpty.optional(),
  footerHtml: z.string().nullable().optional(),
  footerContactInfo: z.string().max(2000).nullable().optional(),
  contactPageHtml: z.string().max(50000).nullable().optional(),
  termsPageHtml: z.string().max(50000).nullable().optional(),
  privacyPageHtml: z.string().max(50000).nullable().optional(),
  cookiePageHtml: z.string().max(50000).nullable().optional(),
});
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;

// ─── Auth & Users ─────────────────────────────────────────────────────────────

export const RoleSchema = z.enum(['AUTHOR', 'EDITOR', 'ADMIN']);
export type Role = z.infer<typeof RoleSchema>;

export const PostStatusSchema = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
]);
export type PostStatus = z.infer<typeof PostStatusSchema>;

export const AdminPillPostRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: PostStatusSchema,
});
export type AdminPillPostRef = z.infer<typeof AdminPillPostRefSchema>;

export const AdminPillSchema = z.object({
  id: z.string(),
  text: z.string(),
  color: z.string(),
  textColor: z.string(),
  postCount: z.number().int(),
  posts: z.array(AdminPillPostRefSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminPill = z.infer<typeof AdminPillSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthorPseudonymSchema = z.string().trim().min(1).max(200);
export type AuthorPseudonym = z.infer<typeof AuthorPseudonymSchema>;

export const MeSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  slug: z.string(),
  role: RoleSchema,
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
  notificationEmail: z.string().nullable(),
  signalNumber: z.string().nullable(),
  notifyReviewEmail: z.boolean(),
  notifyReviewSignal: z.boolean(),
  pseudonyms: z.array(AuthorPseudonymSchema).default([]),
});
export type Me = z.infer<typeof MeSchema>;

export const NotificationPrefsUpdateSchema = z.object({
  notificationEmail: z.string().email().nullable().optional(),
  signalNumber: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Must be a valid E.164 phone number')
    .nullable()
    .optional(),
  notifyReviewEmail: z.boolean().optional(),
  notifyReviewSignal: z.boolean().optional(),
});
export type NotificationPrefsUpdate = z.infer<typeof NotificationPrefsUpdateSchema>;

export const MeUpdateSchema = NotificationPrefsUpdateSchema.extend({
  displayName: z.string().min(1).max(200).optional(),
  bio: z.string().optional(),
  avatarMediaId: z.string().nullable().optional(),
  pseudonyms: z.array(AuthorPseudonymSchema).max(20).optional(),
});
export type MeUpdate = z.infer<typeof MeUpdateSchema>;

export const UserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  slug: z.string(),
  role: RoleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable().optional(),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const UserDetailSchema = UserSummarySchema.extend({
  bio: z.string().nullable().optional(),
  postCount: z.number().int().optional(),
});
export type UserDetail = z.infer<typeof UserDetailSchema>;

export const UserCreateSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(200),
  role: RoleSchema,
  password: z.string().min(6).optional(),
});
export type UserCreate = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  role: RoleSchema.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

// ─── Post write DTOs ──────────────────────────────────────────────────────────

export const PostCreateSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  contentHtml: z.string().optional().default(''),
  publishedAt: z.string().datetime().optional().nullable(),
  heroMediaId: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]),
  primaryCategoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional().default([]),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  authorName: z.string().max(200).optional().nullable(),
  showDate: z.boolean().optional(),
  showAuthor: z.boolean().optional(),
  showSummary: z.boolean().optional(),
  pillId: z.string().optional().nullable(),
  /** Inline pill creation from post editor; auto-saved as global pill. */
  pillText: z.string().min(1).max(40).optional().nullable(),
  pillColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  pillTextColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  bulbi: z.array(PostBulbRefSchema).optional().default([]),
});
export type PostCreate = z.infer<typeof PostCreateSchema>;

export const PostUpdateSchema = PostCreateSchema.partial();
export type PostUpdate = z.infer<typeof PostUpdateSchema>;

export const PostTransitionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'publish', 'archive', 'republish']),
  message: z.string().optional(),
});
export type PostTransition = z.infer<typeof PostTransitionSchema>;

// ─── Admin post list ──────────────────────────────────────────────────────────

export const AdminPostSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: PostStatusSchema,
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({ id: z.string(), displayName: z.string(), slug: z.string() }).nullable(),
  authorName: z.string().nullable().optional(),
  showDate: z.boolean().optional().default(true),
  showAuthor: z.boolean().optional().default(true),
  showSummary: z.boolean().optional().default(false),
  viewCount: z.number().int().nonnegative().optional().default(0),
  primaryCategory: CategorySummarySchema.nullable(),
});
export type AdminPostSummary = z.infer<typeof AdminPostSummarySchema>;

// ─── Revision ─────────────────────────────────────────────────────────────────

export const RevisionSummarySchema = z.object({
  id: z.string(),
  postId: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  message: z.string().nullable(),
  createdAt: z.string(),
  editor: z.object({ id: z.string(), displayName: z.string() }).nullable(),
});
export type RevisionSummary = z.infer<typeof RevisionSummarySchema>;

// ─── Audit ────────────────────────────────────────────────────────────────────

export const AuditEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  diff: z.unknown().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  actor: z.object({ id: z.string(), displayName: z.string(), email: z.string() }).nullable(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
