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

export const PillCornerSchema = z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
export type PillCorner = z.infer<typeof PillCornerSchema>;

/** Per-article pill size, relative to the layout/global default. */
export const PillSizeSchema = z.enum(['smaller', 'default', 'bigger']);
export type PillSize = z.infer<typeof PillSizeSchema>;

const pillHexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const PillCreateSchema = z.object({
  text: z.string().min(1).max(40),
  color: pillHexColor,
  textColor: pillHexColor.optional().default('#ffffff'),
});
export type PillCreate = z.infer<typeof PillCreateSchema>;

export const PillUpdateSchema = PillCreateSchema.partial();
export type PillUpdate = z.infer<typeof PillUpdateSchema>;

/** Pill placement on a post image (corner null = use global SiteSettings when sole pill). */
export const PostPillPlacementSchema = z.object({
  pill: PillSchema,
  corner: PillCornerSchema.nullable(),
  size: PillSizeSchema.optional().default('default'),
});
export type PostPillPlacement = z.infer<typeof PostPillPlacementSchema>;

/** Write DTO for attaching a pill to a post. */
export const PostPillRefSchema = z
  .object({
    pillId: z.string().optional().nullable(),
    /** Inline pill creation; auto-saved as global pill. */
    pillText: z.string().min(1).max(40).optional().nullable(),
    pillColor: pillHexColor.optional().nullable(),
    pillTextColor: pillHexColor.optional().nullable(),
    /** Required when the post has more than one pill. */
    corner: PillCornerSchema.optional().nullable(),
    size: PillSizeSchema.optional().default('default'),
  })
  .refine((v) => !!(v.pillId || (v.pillText?.trim() && v.pillColor)), {
    message: 'Each pill row needs pillId or pillText+pillColor',
  });
export type PostPillRef = z.infer<typeof PostPillRefSchema>;

const MAX_POST_PILLS = 4;

function refinePostPills(
  pills: Array<{
    pillId?: string | null;
    pillText?: string | null;
    pillColor?: string | null;
    corner?: PillCorner | null;
  }>,
  ctx: z.RefinementCtx,
) {
  if (pills.length > MAX_POST_PILLS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Maximum ${MAX_POST_PILLS} pills per article`,
      path: ['pills'],
    });
  }
  const pillIds = pills.map((p) => p.pillId).filter((id): id is string => !!id);
  if (new Set(pillIds).size !== pillIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Same pill cannot be attached more than once',
      path: ['pills'],
    });
  }
  if (pills.length > 1) {
    for (let i = 0; i < pills.length; i++) {
      if (!pills[i].corner) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Corner is required when multiple pills are set',
          path: ['pills', i, 'corner'],
        });
      }
    }
  }
  const corners = pills.map((p) => p.corner).filter((c): c is PillCorner => !!c);
  if (new Set(corners).size !== corners.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Each pill must use a different corner',
      path: ['pills'],
    });
  }
}

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

/** Linked article target for a subtitle bumb (optional). */
export const PostBumbLinkedPostSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
});
export type PostBumbLinkedPost = z.infer<typeof PostBumbLinkedPostSchema>;

/** Subtitle bullet ("bumb") — text with an optional article link or external URL. */
export const PostBumbSchema = z.object({
  id: z.string(),
  label: z.string(),
  linkedPost: PostBumbLinkedPostSchema.nullable().optional(),
  /** http(s) URL. Present only when the bumb is not linked to an article. */
  externalUrl: z.string().nullable().optional(),
});
export type PostBumb = z.infer<typeof PostBumbSchema>;

/** @deprecated use PostBumbSchema — kept as alias during rename Bulbi → Bumbi */
export const PostBulbResolvedSchema = PostBumbSchema;
export type PostBulbResolved = PostBumb;

export const PostSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  /** Supratitlu — plain text above the title (modules/sidebar when present). */
  kicker: z.string().nullable().optional(),
  /** Legacy plain summary; preferred display is `bulbi` (subtitle bumbi). */
  excerpt: z.string().nullable(),
  /** Subtitle bullets shown in modules/lists when summary is enabled. */
  bulbi: z.array(PostBumbSchema).optional().default([]),
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
  /** Estimated reading time from article body, in seconds. */
  readingTimeSeconds: z.number().int().nonnegative().optional().default(0),
  /** Image overlay pills (max 4); each has its own corner. */
  pills: z.array(PostPillPlacementSchema).optional().default([]),
  /** @deprecated first of `pills` — kept for older clients */
  pill: PillSchema.nullable().optional(),
  /** @deprecated corner of first of `pills` */
  pillCorner: PillCornerSchema.nullable().optional(),
  videoUrl: z.string().nullable().optional(),
});
export type PostSummary = z.infer<typeof PostSummarySchema>;

/** Trimmed http(s) URL, or null when the value is empty or not a safe web address. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed.length > 2000) return null;
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return null;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return trimmed;
  } catch {
    return null;
  }
}

/** Write DTO for a subtitle bumb. `postId` = optional linked article; `externalUrl` = optional http(s) link. */
export const PostBulbRefSchema = z
  .object({
    label: z.string().min(1).max(500),
    postId: z.string().optional().nullable(),
    externalUrl: z.string().max(2000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const postId = data.postId?.trim() || null;
    const rawUrl = data.externalUrl?.trim() || null;
    if (postId && rawUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un bumb poate avea fie un articol, fie un link extern',
        path: ['externalUrl'],
      });
    }
    if (rawUrl && !safeHttpUrl(rawUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Linkul extern trebuie să fie o adresă http sau https',
        path: ['externalUrl'],
      });
    }
  });
export type PostBulbRef = z.infer<typeof PostBulbRefSchema>;

/** Caption under one article photo (hero first when visible, then body images). */
export const PostPhotoCaptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type PostPhotoCaption = z.infer<typeof PostPhotoCaptionSchema>;

/** Write DTO for a photo caption. Empty label keeps the slot so later photos stay aligned. */
export const PostPhotoCaptionRefSchema = z.object({
  label: z.string().max(1000),
});
export type PostPhotoCaptionRef = z.infer<typeof PostPhotoCaptionRefSchema>;

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
  'hero-list-center',
  'hero-top-list',
  'hero-slideshow',
  'grid',
  'list',
  'rows-3',
  'rows-4',
  'rows-4-sm',
  'rows-5',
  'pictures-7',
  'category-columns',
  'slideshow',
  /** Main-column: 1 featured video + scrollable side list (manual only). */
  'video-list',
  /** Main-column: 1 featured article + scrollable side list. */
  'article-list',
  /** Main-column: 1 article, media + title/meta side by side (optional reverse). */
  'split',
]);
export type ModuleType = z.infer<typeof ModuleTypeSchema>;

/** Max secondary videos in a `video-list` module (right column). */
export const VIDEO_LIST_MAX_SIDE = 10;
/** Max total videos in a `video-list` module (1 main + side). */
export const VIDEO_LIST_MAX_ITEMS = VIDEO_LIST_MAX_SIDE + 1;

/** Max secondary articles in an `article-list` module (right column). */
export const ARTICLE_LIST_MAX_SIDE = 10;
/** Max total articles in an `article-list` module (1 main + side). */
export const ARTICLE_LIST_MAX_ITEMS = ARTICLE_LIST_MAX_SIDE + 1;
/** Default total articles in an `article-list` module. */
export const ARTICLE_LIST_DEFAULT_COUNT = 8;

/** Small-item count (1–3) for hero-list style modules. */
export const ModuleSideCountSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type ModuleSideCount = z.infer<typeof ModuleSideCountSchema>;

/** Column count (3–5) for `category-columns` modules. */
export const ModuleColumnCountSchema = z.union([z.literal(3), z.literal(4), z.literal(5)]);
export type ModuleColumnCount = z.infer<typeof ModuleColumnCountSchema>;

/** Small articles under the main one (1–5) for `category-columns`. */
export const ModuleSmallCountSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type ModuleSmallCount = z.infer<typeof ModuleSmallCountSchema>;

/** Picture count (5–7) for `pictures-7` modules. Default 7. */
export const ModulePicturesCountSchema = z.union([z.literal(5), z.literal(6), z.literal(7)]);
export type ModulePicturesCount = z.infer<typeof ModulePicturesCountSchema>;

/** Module types that accept `options.sideCount` (small items per side / below). */
export const SIDE_COUNT_MODULE_TYPES: ModuleType[] = [
  'hero-list',
  'hero-list-6',
  'hero-list-center',
  'hero-top-list',
];

export function supportsModuleSideCount(type: ModuleType): boolean {
  return SIDE_COUNT_MODULE_TYPES.includes(type);
}

export function isPicturesModuleType(type: ModuleType): boolean {
  return type === 'pictures-7';
}

/** Clamp / default pictures count to 5 | 6 | 7 (default 7). */
export function normalizeModulePicturesCount(
  value: number | null | undefined,
): ModulePicturesCount {
  const n = Math.floor(Number(value) || 7);
  if (n <= 5) return 5;
  if (n === 6) return 6;
  return 7;
}

/** Clamp / default sideCount to 1 | 2 | 3 (default 3). */
export function normalizeModuleSideCount(value: number | null | undefined): ModuleSideCount {
  const n = Math.floor(Number(value) || 3);
  if (n <= 1) return 1;
  if (n === 2) return 2;
  return 3;
}

/** Clamp / default columnCount to 3 | 4 | 5 (default 4). */
export function normalizeModuleColumnCount(value: number | null | undefined): ModuleColumnCount {
  const n = Math.floor(Number(value) || 4);
  if (n <= 3) return 3;
  if (n >= 5) return 5;
  return 4;
}

/** Clamp / default smallCount to 1–5 (default 3). */
export function normalizeModuleSmallCount(value: number | null | undefined): ModuleSmallCount {
  const n = Math.floor(Number(value) || 3);
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 4) return 4;
  if (n >= 5) return 5;
  return 3;
}

/** Clamp / default article-list count to 1–11 (default 8). */
export function normalizeArticleListCount(value: number | null | undefined): number {
  const n = Math.floor(Number(value) || ARTICLE_LIST_DEFAULT_COUNT);
  return Math.max(1, Math.min(ARTICLE_LIST_MAX_ITEMS, n));
}

export function isArticleListModuleType(type: ModuleType): boolean {
  return type === 'article-list';
}

/** Slots per column for `category-columns` (1 main + N small). */
export function categoryColumnsSlotsPerColumn(smallCount: number | null | undefined): number {
  return 1 + normalizeModuleSmallCount(smallCount);
}

export function isCategoryColumnsModuleType(type: ModuleType): boolean {
  return type === 'category-columns';
}

/** Resolved sideCount for a module (0 when the type does not support it). */
export function moduleSideCount(
  type: ModuleType,
  options?: { sideCount?: number | null } | null,
): number {
  if (!supportsModuleSideCount(type)) return 0;
  return normalizeModuleSideCount(options?.sideCount);
}

/**
 * Total pin/auto-fill slots for a standard (non-rows) module.
 * Returns null for rows / category-columns modules (derived from options).
 */
export function standardModuleSlotCount(
  type: ModuleType,
  options?: { count?: number | null; sideCount?: number | null } | null,
): number | null {
  const side = moduleSideCount(type, options);
  switch (type) {
    case 'hero':
      return 1;
    case 'hero-list':
    case 'hero-top-list':
      return 1 + side;
    case 'hero-list-6':
    case 'hero-list-center':
      return 1 + 2 * side;
    case 'pictures-7':
      return normalizeModulePicturesCount(options?.count);
    case 'grid':
      return Math.max(1, Math.min(12, options?.count ?? 4));
    case 'list':
      return Math.max(1, Math.min(50, options?.count ?? 10));
    case 'hero-slideshow':
    case 'slideshow':
      return Math.max(1, Math.min(10, options?.count ?? 5));
    case 'video-list':
      // Manual video items only — no pool auto-fill slots.
      return 0;
    case 'article-list':
      return normalizeArticleListCount(options?.count);
    case 'split':
      return 1;
    case 'rows-3':
    case 'rows-4':
    case 'rows-4-sm':
    case 'rows-5':
    case 'category-columns':
      return null;
  }
}

export function isSplitModuleType(type: ModuleType): boolean {
  return type === 'split';
}

/**
 * Module types that always render full-width and interrupt the sidebar column.
 * `pictures-7` is handled separately (full-width only at 6–7 pictures).
 */
export const FULL_WIDTH_ONLY_MODULE_TYPES: ModuleType[] = [
  'rows-4',
  'rows-5',
  'hero-list-6',
  'hero-list-center',
  'category-columns',
];

/**
 * Whether a module instance spans the full page width (interrupts the sidebar).
 * `pictures-7` is full-width at 6–7 pictures; at 5 it stays in the main column.
 */
export function isFullWidthModuleType(
  type: ModuleType,
  options?: { count?: number | null } | null,
): boolean {
  if (type === 'pictures-7') {
    return normalizeModulePicturesCount(options?.count) >= 6;
  }
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
    case 'hero-list-center':
    case 'hero-top-list':
    case 'grid':
    case 'list':
      return true;
    case 'hero-slideshow':
    case 'slideshow':
    case 'rows-3':
    case 'rows-4':
    case 'rows-4-sm':
    case 'rows-5':
    case 'pictures-7':
    case 'category-columns':
    case 'video-list':
      return false;
    case 'article-list':
    case 'split':
      return true;
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
  'featured-video',
  'featured-article',
  'featured-photo',
  'featured-stack',
]);
export type SidebarMode = z.infer<typeof SidebarModeSchema>;

/** Publish-date window for ranking `most-viewed` sidebar articles by viewCount. */
export const MostViewedPeriodSchema = z.enum(['year', '24h', '7d', '30d', 'all']);
export type MostViewedPeriod = z.infer<typeof MostViewedPeriodSchema>;

/** Sidebar block modes that allow multiple instances (each with its own id). */
export const SIDEBAR_MULTI_INSTANCE_MODES = [
  'single-category',
  'slideshow',
  'featured-video',
  'featured-article',
  'featured-photo',
  'featured-stack',
  'most-viewed',
] as const satisfies readonly SidebarMode[];
export type SidebarMultiInstanceMode = (typeof SIDEBAR_MULTI_INSTANCE_MODES)[number];

export function isSidebarMultiInstanceMode(mode: SidebarMode): mode is SidebarMultiInstanceMode {
  return (SIDEBAR_MULTI_INSTANCE_MODES as readonly string[]).includes(mode);
}

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

export const SidebarFeaturedVideoBlockRefSchema = z.object({
  mode: z.literal('featured-video'),
  id: z.string().min(1),
});
export type SidebarFeaturedVideoBlockRef = z.infer<typeof SidebarFeaturedVideoBlockRefSchema>;

export const SidebarFeaturedArticleBlockRefSchema = z.object({
  mode: z.literal('featured-article'),
  id: z.string().min(1),
});
export type SidebarFeaturedArticleBlockRef = z.infer<typeof SidebarFeaturedArticleBlockRefSchema>;

export const SidebarFeaturedPhotoBlockRefSchema = z.object({
  mode: z.literal('featured-photo'),
  id: z.string().min(1),
});
export type SidebarFeaturedPhotoBlockRef = z.infer<typeof SidebarFeaturedPhotoBlockRefSchema>;

export const SidebarFeaturedStackBlockRefSchema = z.object({
  mode: z.literal('featured-stack'),
  id: z.string().min(1),
});
export type SidebarFeaturedStackBlockRef = z.infer<typeof SidebarFeaturedStackBlockRefSchema>;

export const SidebarMostViewedBlockRefSchema = z.object({
  mode: z.literal('most-viewed'),
  id: z.string().min(1),
});
export type SidebarMostViewedBlockRef = z.infer<typeof SidebarMostViewedBlockRefSchema>;

export const SidebarBlockEntrySchema = z.union([
  SidebarModeSchema,
  SidebarSingleCategoryBlockRefSchema,
  SidebarSlideshowBlockRefSchema,
  SidebarFeaturedVideoBlockRefSchema,
  SidebarFeaturedArticleBlockRefSchema,
  SidebarFeaturedPhotoBlockRefSchema,
  SidebarFeaturedStackBlockRefSchema,
  SidebarMostViewedBlockRefSchema,
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
      if (isSidebarMultiInstanceMode(mode)) {
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
  /** Pinned post id (null = auto-fill). Ignored for deterministic blocks like most-viewed. */
  postId: z.string().nullable().default(null),
  showDate: z.boolean().default(true),
  showAuthor: z.boolean().default(true),
});
export type LayoutDisplaySlot = z.infer<typeof LayoutDisplaySlotSchema>;

export const SingleCategoryBlockConfigSchema = z.object({
  categoryId: z.string().nullable().optional().default(null),
  count: z.number().int().min(1).max(50).default(4),
  slots: z.array(LayoutDisplaySlotSchema).default([]),
});
export type SingleCategoryBlockConfig = z.infer<typeof SingleCategoryBlockConfigSchema>;

export const SlideshowBlockConfigSchema = z.object({
  count: z.number().int().min(1).max(10).default(5),
  textPosition: SidebarSlideshowTextPositionSchema.default('on-image'),
  slots: z.array(LayoutDisplaySlotSchema).default([]),
});
export type SlideshowBlockConfig = z.infer<typeof SlideshowBlockConfigSchema>;

export const FeaturedVideoSourceSchema = z.enum(['link', 'upload', 'post', 'livestream']);
export type FeaturedVideoSource = z.infer<typeof FeaturedVideoSourceSchema>;

/** Single featured video block in the right column (link, upload, livestream, or article). */
export const FeaturedVideoBlockConfigSchema = z.object({
  /** Optional section header (e.g. „Video-ul zilei”). Empty hides the header. */
  title: z.string().max(100).default(''),
  source: FeaturedVideoSourceSchema.default('link'),
  /** YouTube, YouTube Live, or uploaded/self-hosted video URL when source is link/upload/livestream. */
  url: z.string().nullable().optional().default(null),
  /**
   * Article title used when creating a published post from link/upload.
   * Distinct from the optional section header (`title`).
   */
  videoTitle: z.string().max(200).nullable().optional().default(null),
  /** Category for the auto-created article (link/upload). */
  categoryId: z.string().nullable().optional().default(null),
  /** Selected or auto-created article id. */
  postId: z.string().nullable().optional().default(null),
});
export type FeaturedVideoBlockConfig = z.infer<typeof FeaturedVideoBlockConfigSchema>;

/** Single featured article block in the right column. */
export const FeaturedArticleBlockConfigSchema = z.object({
  /** Optional section header (e.g. „Articolul zilei”). Empty hides the header. */
  title: z.string().max(100).default(''),
  postId: z.string().nullable().optional().default(null),
  showDate: z.boolean().default(true),
  showAuthor: z.boolean().default(true),
});
export type FeaturedArticleBlockConfig = z.infer<typeof FeaturedArticleBlockConfigSchema>;

/** Single featured photo block in the right column (visual only). */
export const FeaturedPhotoBlockConfigSchema = z.object({
  /** Optional section header (e.g. „Caricatura zilei”). Empty hides the header. */
  title: z.string().max(100).default(''),
  /** Optional title shown under the image. Empty hides it. */
  caption: z.string().max(200).default(''),
  imageUrl: z.string().nullable().optional().default(null),
});
export type FeaturedPhotoBlockConfig = z.infer<typeof FeaturedPhotoBlockConfigSchema>;

/**
 * Sidebar column: one main article (large image + title) plus secondary rows
 * (title left, small thumb right).
 */
export const FeaturedStackBlockConfigSchema = z.object({
  /** Optional section header (e.g. category-style label). Empty hides the header. */
  title: z.string().max(100).default(''),
  /** Secondary articles under the main one (1–10). */
  secondaryCount: z.number().int().min(1).max(10).default(3),
  slots: z.array(LayoutDisplaySlotSchema).default([]),
});
export type FeaturedStackBlockConfig = z.infer<typeof FeaturedStackBlockConfigSchema>;

export const MostViewedBlockConfigSchema = z.object({
  title: z.string().max(100).default('Cele mai citite'),
  period: MostViewedPeriodSchema.default('year'),
  showCategory: z.boolean().optional().default(true),
  categoryId: z.string().nullable().optional().default(null),
  count: z.number().int().min(1).max(50).default(5),
  slots: z.array(LayoutDisplaySlotSchema).default([]),
});
export type MostViewedBlockConfig = z.infer<typeof MostViewedBlockConfigSchema>;

export const SidebarVideoItemSchema = z.object({
  id: z.string().min(1),
  /** Label / article title (required when creating a post from this item). */
  title: z.string().max(200).nullable().optional().default(null),
  /** Accepts YouTube links or uploaded/self-hosted video URLs. */
  url: z.string().url(),
  /** Category chosen when creating the linked article. */
  categoryId: z.string().nullable().optional().default(null),
  /** Published article created (or selected) for this video — used for /video/:slug links. */
  postId: z.string().nullable().optional().default(null),
});
export type SidebarVideoItem = z.infer<typeof SidebarVideoItemSchema>;

const typographyHexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const typographyFontSize = z.number().int().min(10).max(60);
const typographyFontWeight = z.number().int().min(400).max(900);
/** Unitless line-height for article body (and optional typography roles). */
const typographyLineHeight = z.number().min(1).max(3);

/** How category labels render in modules that show per-article category. */
export const ModuleCategoryDisplaySchema = z.enum(['plain', 'pill']);
export type ModuleCategoryDisplay = z.infer<typeof ModuleCategoryDisplaySchema>;

/** Typography values for one text role (title or summary). */
export const ModuleTypographyStyleSchema = z.object({
  fontSize: typographyFontSize.optional(),
  fontWeight: typographyFontWeight.optional(),
  /**
   * Text color for plain labels. For category/heroCategory with `display: 'pill'`,
   * this is the pill background color instead.
   */
  color: typographyHexColor.optional(),
  /** Category label style (`plain` text vs colored pill). Only used for category roles. */
  display: ModuleCategoryDisplaySchema.optional(),
  /** Pill text color when `display` is `pill`. Defaults to white when omitted. */
  textColor: typographyHexColor.optional(),
  /** Background for boxed section titles (e.g. "Cele mai citite"). */
  backgroundColor: typographyHexColor.optional(),
  /** Unitless line-height (mainly for article `content`). */
  lineHeight: typographyLineHeight.optional(),
});
export type ModuleTypographyStyle = z.infer<typeof ModuleTypographyStyleSchema>;

const MODULE_TYPOGRAPHY_ROLE_KEYS = [
  'title',
  'heroTitle',
  'smallTitle',
  'rowHeader',
  'category',
  'heroCategory',
  'meta',
  'heroMeta',
  'content',
  'kicker',
  'author',
  'date',
  'views',
  'bumbi',
  'heroBumbi',
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

/**
 * How published dates render on lists and modules.
 * `time-if-today` = hour when the post is from today, otherwise the date.
 * `always-date` = calendar date only, including for today's posts.
 */
export const PostDateFormatSchema = z.enum(['time-if-today', 'always-date']);
export type PostDateFormat = z.infer<typeof PostDateFormatSchema>;
export const DEFAULT_POST_DATE_FORMAT: PostDateFormat = 'time-if-today';

export function isPostDateFormat(value: unknown): value is PostDateFormat {
  return value === 'time-if-today' || value === 'always-date';
}

/** Module/block override wins; otherwise the site setting (default time-if-today). */
export function resolvePostDateFormat(
  override: PostDateFormat | null | undefined,
  siteFormat: PostDateFormat | null | undefined,
): PostDateFormat {
  if (isPostDateFormat(override)) return override;
  return isPostDateFormat(siteFormat) ? siteFormat : DEFAULT_POST_DATE_FORMAT;
}

/** Global article page chrome layout (admin → Pagina articol). */
export const ArticleLayoutModeSchema = z.enum([
  'classic',
  'media-first',
  'overlay-hero',
  'split',
  'split-reverse',
  'compact-news',
  'longform',
]);
export type ArticleLayoutMode = z.infer<typeof ArticleLayoutModeSchema>;
export const DEFAULT_ARTICLE_LAYOUT_MODE: ArticleLayoutMode = 'classic';

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
    /** Category label on small/default cards (also fallback for hero when heroCategory unset). */
    category: ModuleTypographyStyleSchema.optional(),
    /** Category label on the large/hero article in dual modules. */
    heroCategory: ModuleTypographyStyleSchema.optional(),
    /** Meta row on small/default cards: date / author / views. */
    meta: ModuleTypographyStyleSchema.optional(),
    /** Meta row on the large/hero article in dual modules. */
    heroMeta: ModuleTypographyStyleSchema.optional(),
    /** Body/content text style (used by the article page main block). */
    content: ModuleTypographyStyleSchema.optional(),
    /** Article-page kicker (supratitlu). */
    kicker: ModuleTypographyStyleSchema.optional(),
    /** Article-page author name. */
    author: ModuleTypographyStyleSchema.optional(),
    /** Article-page published date. */
    date: ModuleTypographyStyleSchema.optional(),
    /** Article-page view count. */
    views: ModuleTypographyStyleSchema.optional(),
    /** Subtitle bumbi on cards / lists (also fallback for hero when heroBumbi unset). */
    bumbi: ModuleTypographyStyleSchema.optional(),
    /** Subtitle bumbi on the large/hero article in dual modules. */
    heroBumbi: ModuleTypographyStyleSchema.optional(),
  }),
);
export type ModuleTypography = z.infer<typeof ModuleTypographySchema>;

/** Module/block-level summary visibility + typography controls. */
export const SummaryDisplaySettingsSchema = z.object({
  showSummary: z.boolean().optional(),
  /** Toggle subtitle bumbi independently of the legacy excerpt. */
  showBumbi: z.boolean().optional(),
  summaryRows: z.number().int().min(1).optional(),
  /** Summary style for small/default cards (also fallback for hero when heroSummary unset). */
  summaryTypography: ModuleTypographyStyleSchema.optional(),
  /** Summary style for the large/hero article in dual modules. */
  heroSummaryTypography: ModuleTypographyStyleSchema.optional(),
  /** Per-block date format override. Omit = inherit site setting. */
  dateFormat: PostDateFormatSchema.optional(),
  /** When true, show reading time next to the date. Default off. */
  showReadingTime: z.boolean().optional(),
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
  'featured-video': ModuleTypographySchema.optional(),
  'featured-article': ModuleTypographySchema.optional(),
  'featured-photo': ModuleTypographySchema.optional(),
  'featured-stack': ModuleTypographySchema.optional(),
});
export type SidebarBlockTypography = z.infer<typeof SidebarBlockTypographySchema>;

/** Per-block module background color overrides (hex). Omit = current look. */
export const SidebarBlockBackgroundColorSchema = z.object({
  latest: typographyHexColor.optional(),
  categories: typographyHexColor.optional(),
  slideshow: typographyHexColor.optional(),
  video: typographyHexColor.optional(),
  'overlay-list': typographyHexColor.optional(),
  'article-list': typographyHexColor.optional(),
  'most-viewed': typographyHexColor.optional(),
  'single-category': typographyHexColor.optional(),
  'featured-video': typographyHexColor.optional(),
  'featured-article': typographyHexColor.optional(),
  'featured-photo': typographyHexColor.optional(),
  'featured-stack': typographyHexColor.optional(),
});
export type SidebarBlockBackgroundColor = z.infer<typeof SidebarBlockBackgroundColorSchema>;

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
  'featured-video': SummaryDisplaySettingsSchema.optional(),
  'featured-article': SummaryDisplaySettingsSchema.optional(),
  'featured-photo': SummaryDisplaySettingsSchema.optional(),
  'featured-stack': SummaryDisplaySettingsSchema.optional(),
});
export type SidebarBlockSummarySettings = z.infer<typeof SidebarBlockSummarySettingsSchema>;

/** Typography presets per module type (admin re-add memory). */
export const ModuleTypographyPresetsSchema = z.object({
  hero: ModuleTypographySchema.optional(),
  'hero-list': ModuleTypographySchema.optional(),
  'hero-list-6': ModuleTypographySchema.optional(),
  'hero-list-center': ModuleTypographySchema.optional(),
  'hero-top-list': ModuleTypographySchema.optional(),
  'hero-slideshow': ModuleTypographySchema.optional(),
  grid: ModuleTypographySchema.optional(),
  list: ModuleTypographySchema.optional(),
  'rows-3': ModuleTypographySchema.optional(),
  'rows-4': ModuleTypographySchema.optional(),
  'rows-4-sm': ModuleTypographySchema.optional(),
  'rows-5': ModuleTypographySchema.optional(),
  'pictures-7': ModuleTypographySchema.optional(),
  'category-columns': ModuleTypographySchema.optional(),
  slideshow: ModuleTypographySchema.optional(),
  'video-list': ModuleTypographySchema.optional(),
  'article-list': ModuleTypographySchema.optional(),
  split: ModuleTypographySchema.optional(),
});
export type ModuleTypographyPresets = z.infer<typeof ModuleTypographyPresetsSchema>;

export const LayoutModuleSlotSchema = z.object({
  postId: z.string().nullable().default(null),
  showDate: z.boolean().default(true),
  showAuthor: z.boolean().default(true),
});
export type LayoutModuleSlot = z.infer<typeof LayoutModuleSlotSchema>;

/** One vertical category column for `category-columns` modules. */
export const CategoryColumnSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().nullable().optional().default(null),
  /** Optional display name; falls back to the category name when empty. */
  name: z.string().max(200).nullable().optional().default(null),
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
export type CategoryColumn = z.infer<typeof CategoryColumnSchema>;

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

export const Rows5RowSchema = z.object({
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
      while (normalized.length < 5) {
        normalized.push({ postId: null, showDate: true, showAuthor: true });
      }
      return normalized.slice(0, 5);
    }),
});
export type Rows5Row = z.infer<typeof Rows5RowSchema>;

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
      /**
       * User-defined display title for the module. Shown above the module on the
       * public home page; also used as the admin placement label when set.
       */
      name: z.string().max(200).nullable().optional().default(null),
      /**
       * Article / picture count for `list` (1–50), `grid` (1–12),
       * `slideshow` / `hero-slideshow` (1–10), and `pictures-7` (5 | 6 | 7).
       */
      count: z.number().int().min(1).max(50).optional(),
      /**
       * Small-item count (1–3) for `hero-list`, `hero-top-list` (beside / below),
       * and per side column for `hero-list-6` / `hero-list-center`. Default 3.
       */
      sideCount: ModuleSideCountSchema.optional(),
      /** Ordered rows for `rows-3` / `rows-4` / `rows-5` modules. */
      rows: z.array(z.union([Rows5RowSchema, Rows4RowSchema, Rows3RowSchema])).optional(),
      /** Column count (3–5) for `category-columns`. Default 4. */
      columnCount: ModuleColumnCountSchema.optional(),
      /**
       * Small articles under the main one in each `category-columns` column.
       * Default 3 (range 1–5).
       */
      smallCount: ModuleSmallCountSchema.optional(),
      /** Ordered columns for `category-columns` modules. */
      columns: z.array(CategoryColumnSchema).optional(),
      /**
       * When set on home standard (non-rows) modules, auto-fill slots from this
       * category only and use the category name as the module title when `name`
       * is empty. Ignored on category-page layouts and for rows / category-columns.
       */
      categoryId: z.string().nullable().optional().default(null),
      /** Optional text style override for all text in this module. */
      typography: ModuleTypographySchema.optional(),
      /**
       * Optional module section background (hex). Omit / unset = current look
       * (transparent over the page shell).
       */
      backgroundColor: typographyHexColor.optional(),
      /**
       * When true, each article card shows its primary category on the meta row
       * (bottom-right, beside the date). Suppressed when the module itself has a
       * category filter (`options.categoryId`). Left unset, consumers apply a
       * per-module-type default.
       */
      showCategory: z.boolean().optional(),
      /**
       * Module-level date/author visibility. Combined with per-slot flags
       * (both must be true). Used especially on category-page layouts where
       * per-slot pickers are hidden.
       */
      showDate: z.boolean().optional(),
      showAuthor: z.boolean().optional(),
      /** Toggle summary (excerpt) text visibility under titles. */
      showSummary: z.boolean().optional(),
      /** Toggle subtitle bumbi under titles. Unset = follow `showSummary`. */
      showBumbi: z.boolean().optional(),
      /** Optional per-module summary line-clamp override (min 1). */
      summaryRows: z.number().int().min(1).optional(),
      /** Optional per-module summary text style override (small/default cards). */
      summaryTypography: ModuleTypographyStyleSchema.optional(),
      /** Optional summary style for the large/hero article in dual modules. */
      heroSummaryTypography: ModuleTypographyStyleSchema.optional(),
      /** Per-module date format override. Omit = inherit site setting. */
      dateFormat: PostDateFormatSchema.optional(),
      /** When true, show reading time next to the date. Default off. */
      showReadingTime: z.boolean().optional(),
      /**
       * Manual videos for `video-list` (1 main + up to 10 side).
       * Each item should reference a published post via `postId` after creation.
       */
      videoItems: z.array(SidebarVideoItemSchema).max(VIDEO_LIST_MAX_ITEMS).optional(),
      /**
       * `split` only: when true, title/meta on the left and media on the right
       * (desktop). Default false = media left, title/meta right.
       */
      splitReverse: z.boolean().optional(),
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
    /** When true, each article in `latest` shows its primary category label. */
    latestShowCategory: z.boolean().optional().default(true),
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
    /**
     * Publish-date window for `most-viewed` ranking (by lifetime viewCount).
     * `year` = current calendar year (default); `all` = all published posts.
     */
    mostViewedPeriod: MostViewedPeriodSchema.default('year'),
    /** When true, each article in `most-viewed` shows its primary category label. */
    mostViewedShowCategory: z.boolean().optional().default(true),
    /** Restrict `most-viewed` ranking to one category. Null = all categories. */
    mostViewedCategoryId: z.string().nullable().optional().default(null),
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
    /** Per-instance config for `featured-video` sidebar blocks (keyed by block id). */
    featuredVideoBlocks: z
      .record(z.string(), FeaturedVideoBlockConfigSchema)
      .optional()
      .default({}),
    /** Per-instance typography for `featured-video` blocks (keyed by block id). */
    featuredVideoBlockTypography: z
      .record(z.string(), ModuleTypographySchema)
      .optional()
      .default({}),
    /** Per-instance config for `featured-article` sidebar blocks (keyed by block id). */
    featuredArticleBlocks: z
      .record(z.string(), FeaturedArticleBlockConfigSchema)
      .optional()
      .default({}),
    /** Per-instance typography for `featured-article` blocks (keyed by block id). */
    featuredArticleBlockTypography: z
      .record(z.string(), ModuleTypographySchema)
      .optional()
      .default({}),
    /** Per-instance summary settings for `featured-article` blocks (keyed by block id). */
    featuredArticleBlockSummarySettings: z
      .record(z.string(), SummaryDisplaySettingsSchema)
      .optional()
      .default({}),
    /** Per-instance config for `featured-photo` sidebar blocks (keyed by block id). */
    featuredPhotoBlocks: z
      .record(z.string(), FeaturedPhotoBlockConfigSchema)
      .optional()
      .default({}),
    /** Per-instance typography for `featured-photo` blocks (keyed by block id). */
    featuredPhotoBlockTypography: z
      .record(z.string(), ModuleTypographySchema)
      .optional()
      .default({}),
    /** Per-instance config for `featured-stack` sidebar blocks (keyed by block id). */
    featuredStackBlocks: z
      .record(z.string(), FeaturedStackBlockConfigSchema)
      .optional()
      .default({}),
    /** Per-instance typography for `featured-stack` blocks (keyed by block id). */
    featuredStackBlockTypography: z
      .record(z.string(), ModuleTypographySchema)
      .optional()
      .default({}),
    /** Per-instance summary settings for `featured-stack` blocks (keyed by block id). */
    featuredStackBlockSummarySettings: z
      .record(z.string(), SummaryDisplaySettingsSchema)
      .optional()
      .default({}),
    /** Per-instance config for `most-viewed` sidebar blocks (keyed by block id). */
    mostViewedBlocks: z.record(z.string(), MostViewedBlockConfigSchema).optional().default({}),
    latestSlots: z.array(LayoutDisplaySlotSchema).default([]),
    categorySlots: z.array(LayoutDisplaySlotSchema).default([]),
    overlayListSlots: z.array(LayoutDisplaySlotSchema).default([]),
    articleListSlots: z.array(LayoutDisplaySlotSchema).default([]),
    mostViewedSlots: z.array(LayoutDisplaySlotSchema).default([]),
    singleCategorySlots: z.array(LayoutDisplaySlotSchema).default([]),
    /** Per-block typography overrides (latest, categories, slideshow, video). */
    blockTypography: SidebarBlockTypographySchema.optional().default({}),
    /** Per-block module background color overrides (hex). */
    blockBackgroundColor: SidebarBlockBackgroundColorSchema.optional().default({}),
    /** Per-instance background for `single-category` blocks (keyed by block id). */
    singleCategoryBlockBackgroundColor: z
      .record(z.string(), typographyHexColor)
      .optional()
      .default({}),
    /** Per-instance background for `slideshow` blocks (keyed by block id). */
    slideshowBlockBackgroundColor: z.record(z.string(), typographyHexColor).optional().default({}),
    /** Per-instance background for `featured-video` blocks (keyed by block id). */
    featuredVideoBlockBackgroundColor: z
      .record(z.string(), typographyHexColor)
      .optional()
      .default({}),
    /** Per-instance background for `featured-article` blocks (keyed by block id). */
    featuredArticleBlockBackgroundColor: z
      .record(z.string(), typographyHexColor)
      .optional()
      .default({}),
    /** Per-instance background for `featured-photo` blocks (keyed by block id). */
    featuredPhotoBlockBackgroundColor: z
      .record(z.string(), typographyHexColor)
      .optional()
      .default({}),
    /** Per-instance background for `featured-stack` blocks (keyed by block id). */
    featuredStackBlockBackgroundColor: z
      .record(z.string(), typographyHexColor)
      .optional()
      .default({}),
    /** Per-block summary overrides (latest, categories, slideshow, video). */
    blockSummarySettings: SidebarBlockSummarySettingsSchema.optional().default({}),
    /**
     * Sticky sidebar entries. `blockIndex` is the sidebar block that sticks
     * through left modules from `fromModuleId` through `untilModuleId`
     * (both inclusive). Earlier sidebar blocks need not be sticky.
     * On category pages both module ids are null — stick until the bottom.
     * Legacy prefix arrays omit `blockIndex` (entry `i` → block `i`).
     */
    stickyBlocks: z
      .array(
        z.object({
          blockIndex: z.number().int().min(0).optional(),
          fromModuleId: z.string().nullable().optional().default(null),
          untilModuleId: z.string().nullable().optional().default(null),
        }),
      )
      .optional()
      .default([]),
    /**
     * @deprecated Prefer `stickyBlocks`. Kept for older saved layouts.
     * When true (and stickyBlocks empty), migrates to a single sticky entry.
     */
    stickyFirstBlock: z.boolean().optional().default(false),
    /**
     * @deprecated Prefer `stickyBlocks[0].untilModuleId`.
     * Left module id that ends the first sticky range (inclusive).
     */
    stickyUntilModuleId: z.string().nullable().optional().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.blocks.includes('latest') && value.blocks.includes('categories')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sidebar blocks cannot contain both latest and categories.',
        path: ['blocks'],
      });
    }
    if (value.stickyBlocks.length > value.blocks.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'stickyBlocks length cannot exceed sidebar blocks length.',
        path: ['stickyBlocks'],
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
    if (block === 'most-viewed') return { mode: 'most-viewed', id: 'mv-default' };
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

  const mostViewedBlocks = {
    ...((value.mostViewedBlocks as Record<string, unknown>) ?? {}),
  };
  const hasDefaultMostViewed = blocks.some(
    (block) =>
      typeof block === 'object' &&
      block !== null &&
      (block as { mode?: string; id?: string }).mode === 'most-viewed' &&
      (block as { id?: string }).id === 'mv-default',
  );
  if (hasDefaultMostViewed && !mostViewedBlocks['mv-default']) {
    mostViewedBlocks['mv-default'] = {
      title: value.mostViewedTitle ?? 'Cele mai citite',
      period: value.mostViewedPeriod ?? 'year',
      showCategory: value.mostViewedShowCategory ?? true,
      categoryId: value.mostViewedCategoryId ?? null,
      count: value.mostViewedCount ?? 5,
      slots: value.mostViewedSlots ?? [],
    };
  }

  let stickyBlocks = Array.isArray(value.stickyBlocks)
    ? (value.stickyBlocks as Array<{
        blockIndex?: number | null;
        fromModuleId?: string | null;
        untilModuleId?: string | null;
      }>)
    : null;
  if (!stickyBlocks || stickyBlocks.length === 0) {
    stickyBlocks =
      value.stickyFirstBlock === true
        ? [
            {
              fromModuleId: null,
              untilModuleId: (value.stickyUntilModuleId as string | null | undefined) ?? null,
            },
          ]
        : [];
  }
  stickyBlocks = stickyBlocks.slice(0, blocks.length);

  return {
    ...value,
    blocks,
    singleCategoryBlocks,
    slideshowBlocks,
    mostViewedBlocks,
    stickyBlocks,
  };
}, SidebarConfigInnerSchema);
export type SidebarConfig = z.infer<typeof SidebarConfigSchema>;

export const MobileLayoutUnitSchema = z.object({
  kind: z.enum(['module', 'sidebar']),
  /** module.id for kind=module; sidebar block ref for kind=sidebar */
  ref: z.string().min(1),
});
export type MobileLayoutUnit = z.infer<typeof MobileLayoutUnitSchema>;

/** Mobile-only module presentation types (independent from desktop ModuleType). */
export const MobileModuleTypeSchema = z.enum([
  'list-title-left',
  'list-title-right',
  'column',
  'grid-2',
  'slideshow',
  'hero-list',
]);
export type MobileModuleType = z.infer<typeof MobileModuleTypeSchema>;

/** Title placement for mobile card / slideshow / hero modules. */
export const MobileTextPositionSchema = z.enum(['on-image', 'below-image']);
export type MobileTextPosition = z.infer<typeof MobileTextPositionSchema>;

/** Typography presets per mobile module type (admin re-add memory). */
export const MobileModuleTypographyPresetsSchema = z.object({
  'list-title-left': ModuleTypographySchema.optional(),
  'list-title-right': ModuleTypographySchema.optional(),
  column: ModuleTypographySchema.optional(),
  'grid-2': ModuleTypographySchema.optional(),
  slideshow: ModuleTypographySchema.optional(),
  'hero-list': ModuleTypographySchema.optional(),
});
export type MobileModuleTypographyPresets = z.infer<typeof MobileModuleTypographyPresetsSchema>;

export const MobileLayoutModuleSchema = z.object({
  id: z.string().min(1),
  type: MobileModuleTypeSchema,
  options: z
    .object({
      name: z.string().max(200).nullable().optional().default(null),
      /** Article / slide count for list, column, slideshow (1–50 / 1–10). */
      count: z.number().int().min(1).max(50).optional(),
      /** Row count (Y) for `grid-2` (2×Y). Default 2. */
      rowCount: z.number().int().min(1).max(20).optional(),
      /** Small items under the hero for `hero-list` (1–20). Default 4. */
      sideCount: z.number().int().min(1).max(20).optional(),
      /** Title on image vs below (column, grid-2, slideshow, hero-list). */
      textPosition: MobileTextPositionSchema.optional(),
      categoryId: z.string().nullable().optional().default(null),
      typography: ModuleTypographySchema.optional(),
      /** Optional module section background (hex). Omit = current look. */
      backgroundColor: typographyHexColor.optional(),
      showCategory: z.boolean().optional(),
      showDate: z.boolean().optional(),
      showAuthor: z.boolean().optional(),
      showSummary: z.boolean().optional(),
      /** Toggle subtitle bumbi. Unset = follow `showSummary`. */
      showBumbi: z.boolean().optional(),
      summaryRows: z.number().int().min(1).optional(),
      summaryTypography: ModuleTypographyStyleSchema.optional(),
      heroSummaryTypography: ModuleTypographyStyleSchema.optional(),
      /** Per-module date format override. Omit = inherit site setting. */
      dateFormat: PostDateFormatSchema.optional(),
      /** When true, show reading time next to the date. Default off. */
      showReadingTime: z.boolean().optional(),
    })
    .optional()
    .default({}),
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
export type MobileLayoutModule = z.infer<typeof MobileLayoutModuleSchema>;

/** Explicit type — inferred Zod output exceeds TS declaration emit limits. */
export type PageLayoutConfig = {
  modules: LayoutModule[];
  sidebar: SidebarConfig;
  mobileOrder: MobileLayoutUnit[];
  mobileModules: MobileLayoutModule[];
  articleLayoutMode: ArticleLayoutMode;
  articleMainTypography?: ModuleTypography;
  articleMainShowSummary: boolean;
  articleMainSummaryRows?: number;
  articleMainSummaryTypography?: ModuleTypographyStyle;
  /** Article page subtitle-bumbi typography (falls back to summary typography when unset). */
  articleMainBumbiTypography?: ModuleTypographyStyle;
  /** Article page photo-caption typography. */
  articleMainPhotoCaptionTypography?: ModuleTypographyStyle;
  /** When true, the article page shows reading time next to the date. Default off. */
  articleMainShowReadingTime?: boolean;
  moduleTypographyPresets: ModuleTypographyPresets;
  mobileModuleTypographyPresets: MobileModuleTypographyPresets;
};

export const PageLayoutConfigSchema = z.object({
  modules: z.array(LayoutModuleSchema).default([]),
  sidebar: SidebarConfigSchema,
  /**
   * Legacy fallback order of desktop modules + sidebar on mobile when
   * `mobileModules` is empty.
   */
  mobileOrder: z.array(MobileLayoutUnitSchema).optional().default([]),
  /**
   * Dedicated mobile modules (home / category / article). When non-empty,
   * public mobile rendering uses these instead of `mobileOrder` fallback.
   */
  mobileModules: z.array(MobileLayoutModuleSchema).optional().default([]),
  /** Global article chrome layout mode (article page only). */
  articleLayoutMode: ArticleLayoutModeSchema.optional().default(DEFAULT_ARTICLE_LAYOUT_MODE),
  /** Typography override for the main article block on the article page. */
  articleMainTypography: ModuleTypographySchema.optional(),
  /** Article page summary visibility override (default true). */
  articleMainShowSummary: z.boolean().optional().default(true),
  /** Article page summary line-clamp override (min 1). */
  articleMainSummaryRows: z.number().int().min(1).optional(),
  /** Article page summary typography override. */
  articleMainSummaryTypography: ModuleTypographyStyleSchema.optional(),
  /** Article page subtitle-bumbi typography override. */
  articleMainBumbiTypography: ModuleTypographyStyleSchema.optional(),
  /** Article page photo-caption typography override. */
  articleMainPhotoCaptionTypography: ModuleTypographyStyleSchema.optional(),
  /** When true, the article page shows reading time next to the date. Default off. */
  articleMainShowReadingTime: z.boolean().optional().default(false),
  /** Per module-type typography presets for admin re-add (not used in public rendering). */
  moduleTypographyPresets: ModuleTypographyPresetsSchema.optional().default({}),
  /** Per mobile module-type typography presets for admin re-add. */
  mobileModuleTypographyPresets: MobileModuleTypographyPresetsSchema.optional().default({}),
}) as z.ZodType<PageLayoutConfig, z.ZodTypeDef, unknown>;

export const LayoutPageIdSchema = z.enum(['home', 'category', 'article']);
export type LayoutPageId = z.infer<typeof LayoutPageIdSchema>;

/** Explicit type — inferred Zod output for this object exceeds TS declaration limits. */
export type AdminLayouts = {
  home: PageLayoutConfig;
  category: PageLayoutConfig;
  article: PageLayoutConfig;
  /** Summaries of all posts pinned anywhere, keyed by post id (for the editor UI). */
  posts: Record<string, PostSummary>;
};

export const AdminLayoutsSchema = z.object({
  home: PageLayoutConfigSchema,
  category: PageLayoutConfigSchema,
  article: PageLayoutConfigSchema,
  posts: z.record(PostSummarySchema),
}) as z.ZodType<AdminLayouts, z.ZodTypeDef, unknown>;

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
  /**
   * Required when the target module is `rows-3` / `rows-4` / `rows-5`
   * or `category-columns` (column id).
   */
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

export const ResolvedCategoryColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: CategorySummarySchema.nullable().optional(),
  posts: z.array(ResolvedModulePostSchema),
});
export type ResolvedCategoryColumn = z.infer<typeof ResolvedCategoryColumnSchema>;

export const ResolvedModuleSchema = z.object({
  id: z.string(),
  type: ModuleTypeSchema,
  posts: z.array(ResolvedModulePostSchema),
  /** Populated for `rows-3` / `rows-4` / `rows-5` modules. */
  rows: z.array(z.union([ResolvedRows3RowSchema, ResolvedRows4RowSchema])).optional(),
  /** Populated for `category-columns` modules. */
  columns: z.array(ResolvedCategoryColumnSchema).optional(),
  /**
   * Optional section title shown above the module (custom `options.name`, or the
   * filtered category name when no custom title is set).
   */
  title: z.string().nullable().optional(),
  /**
   * When set on home standard modules, auto-fill was scoped to this category.
   * Per-article category labels are hidden while `showCategory` is on.
   */
  category: CategorySummarySchema.nullable().optional(),
  /** When true, article cards show their primary category label (unless `category` is set). */
  showCategory: z.boolean().optional().default(false),
  /** Set on `list` modules: more published articles exist beyond this page. */
  hasMore: z.boolean().optional(),
  /** Whether summary (excerpt) text is visible on article cards. */
  showSummary: z.boolean().optional(),
  /** Whether subtitle bumbi are visible. Unset = follow `showSummary`. */
  showBumbi: z.boolean().optional(),
  /** Optional per-module summary line-clamp override (min 1). */
  summaryRows: z.number().int().min(1).optional(),
  /** Optional per-module summary typography override (small/default). */
  summaryTypography: ModuleTypographyStyleSchema.optional(),
  /** Optional hero/large-article summary typography override. */
  heroSummaryTypography: ModuleTypographyStyleSchema.optional(),
  /** Per-module date format override. Omit = inherit site setting. */
  dateFormat: PostDateFormatSchema.optional(),
  /** When true, show reading time next to the date. Default off. */
  showReadingTime: z.boolean().optional(),
  /** Optional text style override for all text in this module. */
  typography: ModuleTypographySchema.optional(),
  /** Optional module section background (hex). Omit = current look. */
  backgroundColor: typographyHexColor.optional(),
  /**
   * Small-item count (1–3) for hero-list style modules. Omitted for other types.
   * For dual-column layouts (`hero-list-6`, `hero-list-center`) this is per side.
   */
  sideCount: ModuleSideCountSchema.optional(),
  /** Picture count (5–7) for `pictures-7`. Omitted for other types. */
  count: ModulePicturesCountSchema.optional(),
  /** Small articles under the main one for `category-columns`. */
  smallCount: ModuleSmallCountSchema.optional(),
  /**
   * `split` only: title/meta left + media right on desktop when true.
   * Omitted / false = media left, title/meta right.
   */
  splitReverse: z.boolean().optional(),
});
export type ResolvedModule = z.infer<typeof ResolvedModuleSchema>;

/** Resolved mobile-only module for public rendering. */
export const ResolvedMobileModuleSchema = z.object({
  id: z.string(),
  type: MobileModuleTypeSchema,
  posts: z.array(ResolvedModulePostSchema),
  title: z.string().nullable().optional(),
  category: CategorySummarySchema.nullable().optional(),
  showCategory: z.boolean().optional().default(false),
  showSummary: z.boolean().optional(),
  /** Whether subtitle bumbi are visible. Unset = follow `showSummary`. */
  showBumbi: z.boolean().optional(),
  summaryRows: z.number().int().min(1).optional(),
  summaryTypography: ModuleTypographyStyleSchema.optional(),
  heroSummaryTypography: ModuleTypographyStyleSchema.optional(),
  /** Per-module date format override. Omit = inherit site setting. */
  dateFormat: PostDateFormatSchema.optional(),
  /** When true, show reading time next to the date. Default off. */
  showReadingTime: z.boolean().optional(),
  typography: ModuleTypographySchema.optional(),
  /** Optional module section background (hex). Omit = current look. */
  backgroundColor: typographyHexColor.optional(),
  /** Title on image vs below for column / grid-2 / slideshow / hero-list. */
  textPosition: MobileTextPositionSchema.optional(),
  /** Row count (Y) for `grid-2`. */
  rowCount: z.number().int().min(1).max(20).optional(),
  /** Small-item count for `hero-list`. */
  sideCount: z.number().int().min(1).max(20).optional(),
});
export type ResolvedMobileModule = z.infer<typeof ResolvedMobileModuleSchema>;

/** Response of the public "load more articles" feed endpoint. */
export const PostsFeedResponseSchema = z.object({
  posts: z.array(PostSummarySchema),
  hasMore: z.boolean(),
});
export type PostsFeedResponse = z.infer<typeof PostsFeedResponseSchema>;

/** Lean headline used by the desktop header most-read ticker. */
export const MostReadItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  videoUrl: z.string().nullable().optional(),
});
export type MostReadItem = z.infer<typeof MostReadItemSchema>;

export const MostReadResponseSchema = z.object({
  posts: z.array(MostReadItemSchema),
});
export type MostReadResponse = z.infer<typeof MostReadResponseSchema>;

export const TickerBarSourceSchema = z.enum(['most-read', 'newest', 'category', 'custom']);
export type TickerBarSource = z.infer<typeof TickerBarSourceSchema>;

export const TickerTextAlignSchema = z.enum(['left', 'center', 'right']);
export type TickerTextAlign = z.infer<typeof TickerTextAlignSchema>;

export const TickerScrollFromSchema = z.enum(['left', 'right']);
export type TickerScrollFrom = z.infer<typeof TickerScrollFromSchema>;

export const TickerMotionSchema = z.enum(['slide', 'marquee']);
export type TickerMotion = z.infer<typeof TickerMotionSchema>;

export const TickerBarSlotSchema = z.enum(['above', 'logo-top', 'logo-bottom', 'below']);
export type TickerBarSlot = z.infer<typeof TickerBarSlotSchema>;

export const TickerBarKindSchema = z.enum(['ticker', 'menu']);
export type TickerBarKind = z.infer<typeof TickerBarKindSchema>;

const tickerHexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const TickerCustomItemSchema = z.object({
  id: z.string().min(1).max(80),
  text: z.string().min(1).max(200),
});
export type TickerCustomItem = z.infer<typeof TickerCustomItemSchema>;

export const TickerMenuEntrySchema = z.object({
  categoryId: z.string().min(1).max(80),
  childIds: z.array(z.string().min(1).max(80)).max(50).default([]),
});
export type TickerMenuEntry = z.infer<typeof TickerMenuEntrySchema>;

export const TickerBarConfigSchema = z.object({
  id: z.string().min(1).max(80),
  enabled: z.boolean(),
  slot: TickerBarSlotSchema,
  kind: TickerBarKindSchema.default('ticker'),
  title: z.string().min(1).max(80),
  titleBgColor: tickerHexColor,
  titleTextColor: tickerHexColor,
  bgColor: tickerHexColor,
  textColor: tickerHexColor,
  fontSize: z.number().int().min(11).max(28),
  fontWeight: z.number().int().min(400).max(900),
  source: TickerBarSourceSchema,
  categoryId: z.string().nullable(),
  customItems: z.array(TickerCustomItemSchema).max(20),
  itemCount: z.number().int().min(1).max(15),
  intervalMs: z.number().int().min(1000).max(30000),
  textAlign: TickerTextAlignSchema.default('left'),
  scrollFrom: TickerScrollFromSchema.default('right'),
  motion: TickerMotionSchema.default('slide'),
  marqueeSpeed: z.number().int().min(20).max(180).default(60),
  showSearch: z.boolean().default(false),
  showSocial: z.boolean().default(false),
  menuEntries: z.array(TickerMenuEntrySchema).max(40).default([]),
  headerMaxCategories: z.number().int().min(1).max(20).default(6),
  headerShowMoreDropdown: z.boolean().default(true),
  headerMoreCategoryIds: z.array(z.string().min(1).max(80)).max(40).default([]),
});
export type TickerBarConfig = z.infer<typeof TickerBarConfigSchema>;

export const TickerBarsUpdateSchema = z.object({
  bars: z.array(TickerBarConfigSchema).max(4),
});
export type TickerBarsUpdate = z.infer<typeof TickerBarsUpdateSchema>;

export const TickerBarItemSchema = z.object({
  text: z.string(),
  href: z.string().nullable(),
});
export type TickerBarItem = z.infer<typeof TickerBarItemSchema>;

export const PublicTickerBarSchema = z.object({
  id: z.string(),
  slot: TickerBarSlotSchema,
  kind: TickerBarKindSchema,
  title: z.string(),
  titleBgColor: z.string(),
  titleTextColor: z.string(),
  bgColor: z.string(),
  textColor: z.string(),
  fontSize: z.number().int(),
  fontWeight: z.number().int(),
  intervalMs: z.number().int(),
  textAlign: TickerTextAlignSchema,
  scrollFrom: TickerScrollFromSchema,
  motion: TickerMotionSchema,
  marqueeSpeed: z.number().int(),
  items: z.array(TickerBarItemSchema).default([]),
  showSearch: z.boolean(),
  showSocial: z.boolean(),
  menuItems: z.array(MenuItemSchema).default([]),
  headerMaxCategories: z.number().int(),
  headerShowMoreDropdown: z.boolean(),
  headerMoreCategoryIds: z.array(z.string()),
});
export type PublicTickerBar = z.infer<typeof PublicTickerBarSchema>;

export const PublicTickerBarsResponseSchema = z.object({
  bars: z.array(PublicTickerBarSchema),
});
export type PublicTickerBarsResponse = z.infer<typeof PublicTickerBarsResponseSchema>;

/** Response of the public search endpoint. */
export const SearchResponseSchema = z.object({
  query: z.string(),
  posts: z.array(PostSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  perPage: z.number().int(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

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
  /** When true, each article in `latest` shows its primary category label. */
  latestShowCategory: z.boolean().optional(),
  overlayListTitle: z.string().max(100).default('Ultimele știri'),
  articleListCount: z.number().int().min(1).max(50).default(5),
  articleListTitle: z.string().max(100).default('Articole'),
  mostViewedCount: z.number().int().min(1).max(50).default(5),
  mostViewedTitle: z.string().max(100).default('Cele mai citite'),
  mostViewedPeriod: MostViewedPeriodSchema.default('year'),
  /** When true, each article in `most-viewed` shows its primary category label. */
  mostViewedShowCategory: z.boolean().optional(),
  singleCategoryCount: z.number().int().min(1).max(50).default(4),
  slideshowTextPosition: SidebarSlideshowTextPositionSchema.default('on-image'),
  /** Optional header for featured-* sidebar blocks. Empty hides the header. */
  featuredTitle: z.string().max(100).optional(),
  /** Image URL for `featured-photo` blocks. */
  featuredPhotoUrl: z.string().nullable().optional(),
  /** Optional title under the image for `featured-photo` blocks. */
  featuredPhotoCaption: z.string().max(200).optional(),
  /** Secondary article count for `featured-stack` (main article is separate). */
  featuredSecondaryCount: z.number().int().min(1).max(10).optional(),
  /** Set for blocks that support "Mai multe" (latest/video). */
  hasMore: z.boolean().optional(),
});
export type ResolvedSidebarBlock = z.infer<typeof ResolvedSidebarBlockSchema>;

export const SIDEBAR_LATEST_TITLE_DEFAULT = 'Ultimele știri';
export const SIDEBAR_OVERLAY_LIST_TITLE_DEFAULT = 'Ultimele știri';
export const SIDEBAR_MOST_VIEWED_TITLE_DEFAULT = 'Cele mai citite';
export const SIDEBAR_MOST_VIEWED_PERIOD_DEFAULT: MostViewedPeriod = 'year';

export const ResolvedSidebarSchema = z.object({
  blocks: z.array(ResolvedSidebarBlockSchema).default([]),
  /**
   * Sticky sidebar entries keyed by `blockIndex` (legacy prefix if omitted).
   */
  stickyBlocks: z
    .array(
      z.object({
        blockIndex: z.number().int().min(0).optional(),
        fromModuleId: z.string().nullable().optional().default(null),
        untilModuleId: z.string().nullable().optional().default(null),
      }),
    )
    .optional()
    .default([]),
  /**
   * @deprecated Prefer `stickyBlocks`. True when stickyBlocks is non-empty.
   */
  stickyFirstBlock: z.boolean().optional().default(false),
  /**
   * @deprecated Prefer `stickyBlocks[0].untilModuleId`.
   */
  stickyUntilModuleId: z.string().nullable().optional().default(null),
  /** Per-block typography overrides from layout config. */
  blockTypography: SidebarBlockTypographySchema.optional().default({}),
  /** Per-block module background color overrides from layout config. */
  blockBackgroundColor: SidebarBlockBackgroundColorSchema.optional().default({}),
  /** Per-block summary overrides from layout config. */
  blockSummarySettings: SidebarBlockSummarySettingsSchema.optional().default({}),
  /** Per-instance typography for `single-category` blocks (keyed by block id). */
  singleCategoryBlockTypography: z
    .record(z.string(), ModuleTypographySchema)
    .optional()
    .default({}),
  /** Per-instance background for `single-category` blocks (keyed by block id). */
  singleCategoryBlockBackgroundColor: z
    .record(z.string(), typographyHexColor)
    .optional()
    .default({}),
  /** Per-instance summary settings for `single-category` blocks (keyed by block id). */
  singleCategoryBlockSummarySettings: z
    .record(z.string(), SummaryDisplaySettingsSchema)
    .optional()
    .default({}),
  /** Per-instance typography for `slideshow` blocks (keyed by block id). */
  slideshowBlockTypography: z.record(z.string(), ModuleTypographySchema).optional().default({}),
  /** Per-instance background for `slideshow` blocks (keyed by block id). */
  slideshowBlockBackgroundColor: z.record(z.string(), typographyHexColor).optional().default({}),
  /** Per-instance summary settings for `slideshow` blocks (keyed by block id). */
  slideshowBlockSummarySettings: z
    .record(z.string(), SummaryDisplaySettingsSchema)
    .optional()
    .default({}),
  /** Per-instance typography for `featured-video` blocks (keyed by block id). */
  featuredVideoBlockTypography: z.record(z.string(), ModuleTypographySchema).optional().default({}),
  /** Per-instance background for `featured-video` blocks (keyed by block id). */
  featuredVideoBlockBackgroundColor: z
    .record(z.string(), typographyHexColor)
    .optional()
    .default({}),
  /** Per-instance typography for `featured-article` blocks (keyed by block id). */
  featuredArticleBlockTypography: z
    .record(z.string(), ModuleTypographySchema)
    .optional()
    .default({}),
  /** Per-instance background for `featured-article` blocks (keyed by block id). */
  featuredArticleBlockBackgroundColor: z
    .record(z.string(), typographyHexColor)
    .optional()
    .default({}),
  /** Per-instance summary settings for `featured-article` blocks (keyed by block id). */
  featuredArticleBlockSummarySettings: z
    .record(z.string(), SummaryDisplaySettingsSchema)
    .optional()
    .default({}),
  /** Per-instance typography for `featured-photo` blocks (keyed by block id). */
  featuredPhotoBlockTypography: z.record(z.string(), ModuleTypographySchema).optional().default({}),
  /** Per-instance background for `featured-photo` blocks (keyed by block id). */
  featuredPhotoBlockBackgroundColor: z
    .record(z.string(), typographyHexColor)
    .optional()
    .default({}),
  /** Per-instance typography for `featured-stack` blocks (keyed by block id). */
  featuredStackBlockTypography: z.record(z.string(), ModuleTypographySchema).optional().default({}),
  /** Per-instance background for `featured-stack` blocks (keyed by block id). */
  featuredStackBlockBackgroundColor: z
    .record(z.string(), typographyHexColor)
    .optional()
    .default({}),
  /** Per-instance summary settings for `featured-stack` blocks (keyed by block id). */
  featuredStackBlockSummarySettings: z
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
  /** Supratitlu — plain text above the title (article page only). */
  kicker: z.string().nullable().optional(),
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
  /** Estimated reading time from article body, in seconds. */
  readingTimeSeconds: z.number().int().nonnegative().optional().default(0),
  categories: z.array(CategorySummarySchema),
  tags: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  relatedPosts: z.array(PostSummarySchema),
  latestPosts: z.array(PostSummarySchema).optional().default([]),
  /** Global article chrome layout mode. */
  articleLayoutMode: ArticleLayoutModeSchema.optional().default(DEFAULT_ARTICLE_LAYOUT_MODE),
  /** Typography override for the main article block. */
  articleMainTypography: ModuleTypographySchema.nullable().optional(),
  /** Article main summary visibility override (default true). */
  articleMainShowSummary: z.boolean().optional().default(true),
  /** Article main summary line-clamp override (min 1). */
  articleMainSummaryRows: z.number().int().min(1).optional(),
  /** Article main summary typography override. */
  articleMainSummaryTypography: ModuleTypographyStyleSchema.nullable().optional(),
  /** Article main subtitle-bumbi typography override. */
  articleMainBumbiTypography: ModuleTypographyStyleSchema.nullable().optional(),
  /** Article main photo-caption typography override. */
  articleMainPhotoCaptionTypography: ModuleTypographyStyleSchema.nullable().optional(),
  /** When true, the article page shows reading time next to the date. */
  articleMainShowReadingTime: z.boolean().optional().default(false),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  updatedAt: z.string().datetime().optional(),
  /** Image overlay pills (max 4); each has its own corner. */
  pills: z.array(PostPillPlacementSchema).optional().default([]),
  /** @deprecated first of `pills` — kept for older clients */
  pill: PillSchema.nullable().optional(),
  /** @deprecated corner of first of `pills` */
  pillCorner: PillCornerSchema.nullable().optional(),
  /** Subtitle bumbi (replaces rezumat under the title and in modules). */
  bulbi: z.array(PostBumbSchema).optional().default([]),
  /** Photo captions in document order (hero first when visible, then body images). */
  photoCaptions: z.array(PostPhotoCaptionSchema).optional().default([]),
  modules: z.array(ResolvedModuleSchema).optional().default([]),
  sidebar: ResolvedSidebarSchema.nullable().optional(),
  mobileOrder: z.array(MobileLayoutUnitSchema).optional().default([]),
  mobileModules: z.array(ResolvedMobileModuleSchema).optional().default([]),
  /**
   * Sibling article rendered beside this one. Set only on the principal.
   * The sibling payload does not include its own sibling, modules, or sidebar.
   */
  sibling: z.unknown().nullable().optional(),
});
type PostDetailInferred = z.infer<typeof PostDetailSchema>;
export type PostDetail = Omit<PostDetailInferred, 'sibling'> & {
  sibling?: PostDetail | null;
};

// ─── Admin category schemas ───────────────────────────────────────────────────

export const AdminCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  parentId: z.string().nullable(),
  showInMenu: z.boolean(),
  showInMobileMenu: z.boolean(),
  showInMobileRow: z.boolean(),
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
  showInMobileMenu: z.boolean().optional(),
  showInMobileRow: z.boolean().optional(),
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
  /** Resolved module layout. Page 1 uses the configured modules; page 2+ is a list only. */
  modules: z.array(ResolvedModuleSchema).nullable().optional(),
  /** Whether paginated category list cards should show summary text. */
  showSummary: z.boolean().optional(),
  sidebar: ResolvedSidebarSchema.nullable().optional(),
  mobileOrder: z.array(MobileLayoutUnitSchema).optional().default([]),
  mobileModules: z.array(ResolvedMobileModuleSchema).optional().default([]),
});
export type CategoryDetail = z.infer<typeof CategoryDetailSchema>;

// ─── Home response ────────────────────────────────────────────────────────────

export const HomeResponseSchema = z.object({
  modules: z.array(ResolvedModuleSchema),
  sidebar: ResolvedSidebarSchema.nullable(),
  mobileOrder: z.array(MobileLayoutUnitSchema).optional().default([]),
  mobileModules: z.array(ResolvedMobileModuleSchema).optional().default([]),
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
  mobileLogoUrl: z.string().url().nullable(),
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
  tickerBgColor: z.string(),
  tickerTextColor: z.string(),
  tickerFontWeight: z.number().int(),
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
  postDateFormat: PostDateFormatSchema,
  pillCorner: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  pillFontSize: z.number().int(),
  pillTransparency: z.number().int(),
  facebookUrl: z.string().url().nullable(),
  twitterUrl: z.string().url().nullable(),
  youtubeUrl: z.string().url().nullable(),
  instagramUrl: z.string().url().nullable(),
  whatsappUrl: z.string().url().nullable(),
  tiktokUrl: z.string().url().nullable(),
  showFacebook: z.boolean(),
  showTwitter: z.boolean(),
  showYoutube: z.boolean(),
  showInstagram: z.boolean(),
  showWhatsapp: z.boolean(),
  showTiktok: z.boolean(),
  showSocialInHeader: z.boolean(),
  showSocialInMobileMenu: z.boolean(),
  showSocialInFooter: z.boolean(),
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
  mobileLogoMediaId: z.string().nullable(),
  mobileLogoUrl: z.string().url().nullable(),
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
  tickerBgColor: z.string(),
  tickerTextColor: z.string(),
  tickerFontWeight: z.number().int(),
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
  postDateFormat: PostDateFormatSchema,
  pillCorner: PillCornerSchema,
  pillFontSize: z.number().int(),
  pillTransparency: z.number().int(),
  facebookUrl: z.string().nullable(),
  twitterUrl: z.string().nullable(),
  youtubeUrl: z.string().nullable(),
  instagramUrl: z.string().nullable(),
  whatsappUrl: z.string().nullable(),
  tiktokUrl: z.string().nullable(),
  showFacebook: z.boolean(),
  showTwitter: z.boolean(),
  showYoutube: z.boolean(),
  showInstagram: z.boolean(),
  showWhatsapp: z.boolean(),
  showTiktok: z.boolean(),
  showSocialInHeader: z.boolean(),
  showSocialInMobileMenu: z.boolean(),
  showSocialInFooter: z.boolean(),
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
const fontWeight = z.number().int().min(400).max(900);
const summaryRows = z.number().int().min(1);
const pillFontSize = z.number().int().min(8).max(24);
const pillTransparency = z.number().int().min(0).max(100);

export const SettingsUpdateSchema = z.object({
  siteName: z.string().min(1).max(200).optional(),
  tagline: z.string().max(300).nullable().optional(),
  logoMediaId: z.string().nullable().optional(),
  mobileLogoMediaId: z.string().nullable().optional(),
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
  tickerBgColor: hexColor.optional(),
  tickerTextColor: hexColor.optional(),
  tickerFontWeight: fontWeight.optional(),
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
  postDateFormat: PostDateFormatSchema.optional(),
  pillCorner: PillCornerSchema.optional(),
  pillFontSize: pillFontSize.optional(),
  pillTransparency: pillTransparency.optional(),
  facebookUrl: urlOrEmpty.optional(),
  twitterUrl: urlOrEmpty.optional(),
  youtubeUrl: urlOrEmpty.optional(),
  instagramUrl: urlOrEmpty.optional(),
  whatsappUrl: urlOrEmpty.optional(),
  tiktokUrl: urlOrEmpty.optional(),
  showFacebook: z.boolean().optional(),
  showTwitter: z.boolean().optional(),
  showYoutube: z.boolean().optional(),
  showInstagram: z.boolean().optional(),
  showWhatsapp: z.boolean().optional(),
  showTiktok: z.boolean().optional(),
  showSocialInHeader: z.boolean().optional(),
  showSocialInMobileMenu: z.boolean().optional(),
  showSocialInFooter: z.boolean().optional(),
  footerHtml: z.string().nullable().optional(),
  footerContactInfo: z.string().max(2000).nullable().optional(),
  contactPageHtml: z.string().max(50000).nullable().optional(),
  termsPageHtml: z.string().max(50000).nullable().optional(),
  privacyPageHtml: z.string().max(50000).nullable().optional(),
  cookiePageHtml: z.string().max(50000).nullable().optional(),
});
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;

// ─── Auth & Users ─────────────────────────────────────────────────────────────

export const RoleSchema = z.enum(['AUTHOR', 'EDITOR', 'CHIEF_EDITOR', 'ADMIN']);
export type Role = z.infer<typeof RoleSchema>;

export function isEditorialRole(role: string | undefined | null): boolean {
  return role === 'EDITOR' || role === 'CHIEF_EDITOR' || role === 'ADMIN';
}

export function canEditPublishedPosts(role: string | undefined | null): boolean {
  return role === 'CHIEF_EDITOR' || role === 'ADMIN';
}

export function canManageSiteStructure(role: string | undefined | null): boolean {
  return role === 'EDITOR' || role === 'ADMIN';
}

export function canViewAnalytics(role: string | undefined | null): boolean {
  return role === 'CHIEF_EDITOR' || role === 'ADMIN';
}

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

export const PostCreateSchema = z
  .object({
    title: z.string().min(1).max(500),
    slug: z.string().optional(),
    /** Supratitlu — plain text above the title on the article page. */
    kicker: z.string().max(300).optional().nullable(),
    excerpt: z.string().optional().nullable(),
    contentHtml: z.string().optional().default(''),
    publishedAt: z.string().datetime().optional().nullable(),
    heroMediaId: z.string().optional().nullable(),
    videoUrl: z.string().url().optional().nullable(),
    categoryIds: z.array(z.string()).optional().default([]),
    primaryCategoryId: z.string().optional().nullable(),
    tagIds: z.array(z.string()).optional().default([]),
    /** Free-form tag labels; backend finds or creates Tag rows by slug. */
    tagNames: z.array(z.string().min(1).max(100)).optional(),
    seoTitle: z.string().optional().nullable(),
    seoDescription: z.string().optional().nullable(),
    authorName: z.string().max(200).optional().nullable(),
    showDate: z.boolean().optional(),
    showAuthor: z.boolean().optional(),
    showSummary: z.boolean().optional(),
    /** Multi-pill placements (replaces single pillId/pillCorner). */
    pills: z.array(PostPillRefSchema).max(MAX_POST_PILLS).optional(),
    /** Subtitle bumbi (replaces rezumat). */
    bulbi: z.array(PostBulbRefSchema).optional().default([]),
    /** Photo captions (hero first when visible, then body images). */
    photoCaptions: z.array(PostPhotoCaptionRefSchema).optional().default([]),
    /** Other article shown beside this one. Null clears the link. */
    siblingPostId: z.string().min(1).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.pills) refinePostPills(data.pills, ctx);
  });
export type PostCreate = z.infer<typeof PostCreateSchema>;

/** Create + publish a video article from layout video upload / YouTube URL. */
export const PostCreateFromVideoSchema = z.object({
  title: z.string().min(1).max(500),
  videoUrl: z.string().url(),
  categoryId: z.string().min(1),
});
export type PostCreateFromVideo = z.infer<typeof PostCreateFromVideoSchema>;

export const PostUpdateSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    slug: z.string().optional(),
    kicker: z.string().max(300).optional().nullable(),
    excerpt: z.string().optional().nullable(),
    contentHtml: z.string().optional(),
    publishedAt: z.string().datetime().optional().nullable(),
    heroMediaId: z.string().optional().nullable(),
    videoUrl: z.string().url().optional().nullable(),
    categoryIds: z.array(z.string()).optional(),
    primaryCategoryId: z.string().optional().nullable(),
    tagIds: z.array(z.string()).optional(),
    tagNames: z.array(z.string().min(1).max(100)).optional(),
    seoTitle: z.string().optional().nullable(),
    seoDescription: z.string().optional().nullable(),
    authorName: z.string().max(200).optional().nullable(),
    showDate: z.boolean().optional(),
    showAuthor: z.boolean().optional(),
    showSummary: z.boolean().optional(),
    pills: z.array(PostPillRefSchema).max(MAX_POST_PILLS).optional(),
    bulbi: z.array(PostBulbRefSchema).optional(),
    photoCaptions: z.array(PostPhotoCaptionRefSchema).optional(),
    /** Other article shown beside this one. Null clears the link. */
    siblingPostId: z.string().min(1).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.pills) refinePostPills(data.pills, ctx);
  });
export type PostUpdate = z.infer<typeof PostUpdateSchema>;

export const PostTransitionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'publish', 'archive', 'republish']),
  message: z.string().optional(),
});
export type PostTransition = z.infer<typeof PostTransitionSchema>;

/** Live editor preview — same fields as create, but title may be empty. */
export const PostPreviewRequestSchema = z.object({
  /** Existing post id, used only to exclude this article from below-fold modules. */
  id: z.string().optional(),
  title: z.string().max(500).optional().default(''),
  slug: z.string().optional(),
  kicker: z.string().max(300).optional().nullable(),
  excerpt: z.string().optional().nullable(),
  contentHtml: z.string().optional().default(''),
  publishedAt: z.string().datetime().optional().nullable(),
  heroMediaId: z.string().optional().nullable(),
  videoUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  categoryIds: z.array(z.string()).optional().default([]),
  primaryCategoryId: z.string().optional().nullable(),
  tagNames: z.array(z.string().min(1).max(100)).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  authorName: z.string().max(200).optional().nullable(),
  showDate: z.boolean().optional(),
  showAuthor: z.boolean().optional(),
  showSummary: z.boolean().optional(),
  pills: z.array(PostPillRefSchema).max(MAX_POST_PILLS).optional(),
  bulbi: z.array(PostBulbRefSchema).optional().default([]),
  photoCaptions: z.array(PostPhotoCaptionRefSchema).optional().default([]),
  /** Other article shown beside this one in preview. */
  siblingPostId: z.string().min(1).nullable().optional(),
});
export type PostPreviewRequest = z.infer<typeof PostPreviewRequestSchema>;

export const PostPreviewTokenSchema = z.object({
  token: z.string(),
});
export type PostPreviewToken = z.infer<typeof PostPreviewTokenSchema>;

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
  createdByUsername: z.string().nullable().optional(),
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

export const AuthorPostCountRangeSchema = z.enum(['week', 'month', 'quarter', 'year', 'all']);
export type AuthorPostCountRange = z.infer<typeof AuthorPostCountRangeSchema>;

export const AuthorPostCountsSchema = z.object({
  week: z.number().int().nonnegative(),
  month: z.number().int().nonnegative(),
  quarter: z.number().int().nonnegative(),
  year: z.number().int().nonnegative(),
  all: z.number().int().nonnegative(),
});
export type AuthorPostCounts = z.infer<typeof AuthorPostCountsSchema>;

export const AuthorPostCountRowSchema = z.object({
  userId: z.string().nullable(),
  displayName: z.string(),
  email: z.string().nullable(),
  role: RoleSchema.nullable(),
  counts: AuthorPostCountsSchema,
});
export type AuthorPostCountRow = z.infer<typeof AuthorPostCountRowSchema>;

export const AuthorPostStatsSchema = z.object({
  authors: z.array(AuthorPostCountRowSchema),
  totals: AuthorPostCountsSchema,
});
export type AuthorPostStats = z.infer<typeof AuthorPostStatsSchema>;

// ─── Analytics / UTM ──────────────────────────────────────────────────────────

export const AnalyticsPageTypeSchema = z.enum([
  'home',
  'article',
  'video',
  'search',
  'contact',
  'category',
  'other',
]);
export type AnalyticsPageType = z.infer<typeof AnalyticsPageTypeSchema>;

/** Single share/tracking code used as `?utm=code`. */
export const UtmCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Doar litere, cifre, ., _ sau -');
export type UtmCode = z.infer<typeof UtmCodeSchema>;

export const AnalyticsBeaconSchema = z.object({
  sessionId: z.string().min(8).max(80),
  pageViewId: z.string().min(8).max(80),
  /** Persistent anonymous visitor id (survives session timeout). */
  visitorId: z.string().min(8).max(80).optional(),
  path: z.string().min(1).max(500),
  pageType: AnalyticsPageTypeSchema,
  postId: z.string().max(80).optional().nullable(),
  title: z.string().max(500).optional().nullable(),
  /** Absolute active time spent on this page view so far (ms). */
  durationMs: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60 * 1000)
    .default(0),
  event: z.enum(['start', 'heartbeat', 'end']),
  /** Value of `?utm=` (first-touch). */
  utm: z.string().max(80).optional().nullable(),
});
export type AnalyticsBeacon = z.infer<typeof AnalyticsBeaconSchema>;

export const UtmPresetSchema = z.object({
  id: z.string(),
  code: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type UtmPreset = z.infer<typeof UtmPresetSchema>;

export const UtmPresetCreateSchema = z.object({
  code: UtmCodeSchema,
});
export type UtmPresetCreate = z.infer<typeof UtmPresetCreateSchema>;

export const UtmPresetUpdateSchema = UtmPresetCreateSchema.partial();
export type UtmPresetUpdate = z.infer<typeof UtmPresetUpdateSchema>;

export const AnalyticsDailyPointSchema = z.object({
  date: z.string(),
  sessions: z.number().int(),
  uniqueVisitors: z.number().int(),
  pageViews: z.number().int(),
  totalDurationMs: z.number().int(),
});
export type AnalyticsDailyPoint = z.infer<typeof AnalyticsDailyPointSchema>;

export const AnalyticsBreakdownRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  sessions: z.number().int(),
  uniqueVisitors: z.number().int(),
  pageViews: z.number().int(),
  totalDurationMs: z.number().int(),
});
export type AnalyticsBreakdownRow = z.infer<typeof AnalyticsBreakdownRowSchema>;

export const AnalyticsPageStatSchema = z.object({
  path: z.string(),
  pageType: AnalyticsPageTypeSchema,
  title: z.string().nullable(),
  postId: z.string().nullable(),
  sessions: z.number().int(),
  uniqueVisitors: z.number().int(),
  pageViews: z.number().int(),
  totalDurationMs: z.number().int(),
  avgDurationMs: z.number().int(),
});
export type AnalyticsPageStat = z.infer<typeof AnalyticsPageStatSchema>;

export const AnalyticsUtmStatSchema = z.object({
  key: z.string(),
  label: z.string(),
  utm: z.string().nullable(),
  presetId: z.string().nullable(),
  sessions: z.number().int(),
  uniqueVisitors: z.number().int(),
  pageViews: z.number().int(),
  totalDurationMs: z.number().int(),
});
export type AnalyticsUtmStat = z.infer<typeof AnalyticsUtmStatSchema>;

export const AnalyticsOverviewSchema = z.object({
  from: z.string(),
  to: z.string(),
  postId: z.string().nullable(),
  title: z.string().nullable(),
  path: z.string().nullable(),
  totalSessions: z.number().int(),
  uniqueVisitors: z.number().int(),
  newVisitors: z.number().int(),
  returningVisitors: z.number().int(),
  totalPageViews: z.number().int(),
  totalDurationMs: z.number().int(),
  avgDurationMs: z.number().int(),
  avgSessionDurationMs: z.number().int(),
  pagesPerSession: z.number(),
  daily: z.array(AnalyticsDailyPointSchema),
  byCategory: z.array(AnalyticsBreakdownRowSchema),
  byUtm: z.array(AnalyticsUtmStatSchema),
  byPageType: z.array(AnalyticsBreakdownRowSchema),
  topPages: z.array(AnalyticsPageStatSchema),
});
export type AnalyticsOverview = z.infer<typeof AnalyticsOverviewSchema>;

export const AnalyticsPageDetailSchema = z.object({
  path: z.string(),
  pageType: AnalyticsPageTypeSchema.nullable(),
  title: z.string().nullable(),
  postId: z.string().nullable(),
  sessions: z.number().int(),
  uniqueVisitors: z.number().int(),
  pageViews: z.number().int(),
  totalDurationMs: z.number().int(),
  avgDurationMs: z.number().int(),
  utmBreakdown: z.array(AnalyticsUtmStatSchema),
});
export type AnalyticsPageDetail = z.infer<typeof AnalyticsPageDetailSchema>;
