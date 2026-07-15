import type {
  MobileLayoutUnit,
  PostSummary,
  ResolvedModule,
  ResolvedModulePost,
  ResolvedSidebar,
  SidebarMode,
} from '@civicpress/shared';
import { buildDefaultMobileOrder } from '@civicpress/shared';
import { buildSidebarStream } from './sidebar-stream';
import { findSidebarBlockForRef } from './mobile-sidebar-utils';

const ROWS_MODULE_TYPES = new Set(['rows-3', 'rows-4', 'rows-4-sm']);

function postsFromModuleEntries(entries: ResolvedModulePost[]): PostSummary[] {
  return entries.map((entry) => entry.post);
}

/** Posts from one resolved main-column module. */
export function collectModulePosts(
  mod: ResolvedModule,
  extras: ResolvedModulePost[] = [],
): PostSummary[] {
  if (ROWS_MODULE_TYPES.has(mod.type)) {
    const posts: PostSummary[] = [];
    for (const row of mod.rows ?? []) {
      for (const entry of row.posts) {
        posts.push(entry.post);
      }
    }
    return posts;
  }

  const base = mod.posts;
  const items = extras.length > 0 ? [...base, ...extras] : base;
  return postsFromModuleEntries(items);
}

/** Posts from one sidebar block ref. */
export function collectSidebarBlockPosts(
  sidebar: ResolvedSidebar,
  ref: string,
  extraPostsByMode: Partial<Record<SidebarMode, PostSummary[]>> = {},
): PostSummary[] {
  const block = findSidebarBlockForRef(sidebar, ref);
  if (!block) return [];

  const units = buildSidebarStream(sidebar, extraPostsByMode);
  const posts: PostSummary[] = [];

  for (const unit of units) {
    const unitRef = unit.block.blockId ?? unit.block.mode;
    if (unitRef !== ref) continue;
    if (unit.kind === 'latest-header') continue;
    posts.push(...unit.posts);
  }

  return posts;
}

function appendUnique(posts: PostSummary[], seen: Set<string>, next: PostSummary[]): void {
  for (const post of next) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    posts.push(post);
  }
}

export interface MobilePostListExtras {
  moduleExtras?: Record<string, ResolvedModulePost[]>;
  sidebarExtraPostsByMode?: Partial<Record<SidebarMode, PostSummary[]>>;
}

/**
 * Flatten posts for mobile in configured unit order.
 * Falls back to web default order when mobileOrder is empty.
 */
export function buildMobilePostList(
  mobileOrder: MobileLayoutUnit[],
  modules: ResolvedModule[],
  sidebar: ResolvedSidebar | null,
  extras: MobilePostListExtras = {},
): PostSummary[] {
  const order =
    mobileOrder.length > 0
      ? mobileOrder
      : buildDefaultMobileOrder({
          modules: modules.map((m) => ({
            id: m.id,
            type: m.type,
            options: { name: null, categoryId: null, showCategory: false },
            slots: [],
          })),
          sidebar: {
            enabled: !!sidebar && sidebar.blocks.length > 0,
            blocks: (sidebar?.blocks ?? []).map((b) =>
              (b.mode === 'single-category' || b.mode === 'slideshow') && b.blockId
                ? { mode: b.mode, id: b.blockId }
                : b.mode,
            ),
            slideshowCount: 5,
            latestCount: 10,
            videoCount: 5,
            videoItems: [],
            slideshowTextPosition: 'on-image',
            overlayListCount: 5,
            latestTitle: '',
            overlayListTitle: '',
            articleListCount: 5,
            articleListTitle: '',
            mostViewedCount: 5,
            mostViewedTitle: '',
            singleCategoryCount: 4,
            singleCategoryId: null,
            singleCategoryBlocks: {},
            singleCategoryBlockTypography: {},
            singleCategoryBlockSummarySettings: {},
            slideshowBlocks: {},
            slideshowBlockTypography: {},
            slideshowBlockSummarySettings: {},
            latestSlots: [],
            categorySlots: [],
            overlayListSlots: [],
            articleListSlots: [],
            mostViewedSlots: [],
            singleCategorySlots: [],
            blockTypography: {},
            blockSummarySettings: {},
          },
          mobileOrder: [],
          articleMainShowSummary: true,
          moduleTypographyPresets: {},
        });

  const moduleById = new Map(modules.map((mod) => [mod.id, mod]));
  const seen = new Set<string>();
  const posts: PostSummary[] = [];

  for (const unit of order) {
    if (unit.kind === 'module') {
      const mod = moduleById.get(unit.ref);
      if (!mod) continue;
      const moduleExtras = extras.moduleExtras?.[mod.id] ?? [];
      appendUnique(posts, seen, collectModulePosts(mod, moduleExtras));
      continue;
    }

    if (sidebar) {
      appendUnique(
        posts,
        seen,
        collectSidebarBlockPosts(sidebar, unit.ref, extras.sidebarExtraPostsByMode),
      );
    }
  }

  return posts;
}

/** Resolve order from API payload (uses effective order when config not available). */
export function resolveMobileOrderFromApi(
  mobileOrder: MobileLayoutUnit[] | undefined,
  modules: ResolvedModule[],
  sidebar: ResolvedSidebar | null,
): MobileLayoutUnit[] {
  if (mobileOrder && mobileOrder.length > 0) return mobileOrder;

  return buildDefaultMobileOrder({
    modules: modules.map((m) => ({
      id: m.id,
      type: m.type,
      options: { name: null, categoryId: null, showCategory: false },
      slots: [],
    })),
    sidebar: {
      enabled: !!sidebar && sidebar.blocks.length > 0,
      blocks: (sidebar?.blocks ?? []).map((b) =>
        (b.mode === 'single-category' || b.mode === 'slideshow') && b.blockId
          ? { mode: b.mode, id: b.blockId }
          : b.mode,
      ),
      slideshowCount: 5,
      latestCount: 10,
      videoCount: 5,
      videoItems: [],
      slideshowTextPosition: 'on-image',
      overlayListCount: 5,
      latestTitle: '',
      overlayListTitle: '',
      articleListCount: 5,
      articleListTitle: '',
      mostViewedCount: 5,
      mostViewedTitle: '',
      singleCategoryCount: 4,
      singleCategoryId: null,
      singleCategoryBlocks: {},
      singleCategoryBlockTypography: {},
      singleCategoryBlockSummarySettings: {},
      slideshowBlocks: {},
      slideshowBlockTypography: {},
      slideshowBlockSummarySettings: {},
      latestSlots: [],
      categorySlots: [],
      overlayListSlots: [],
      articleListSlots: [],
      mostViewedSlots: [],
      singleCategorySlots: [],
      blockTypography: {},
      blockSummarySettings: {},
    },
    mobileOrder: [],
    articleMainShowSummary: true,
    moduleTypographyPresets: {},
  });
}

/** Collect posts for a single mobile unit (used on article page per-unit rendering). */
export function collectMobileUnitPosts(
  unit: MobileLayoutUnit,
  modules: ResolvedModule[],
  sidebar: ResolvedSidebar | null,
  extras: MobilePostListExtras = {},
): PostSummary[] {
  if (unit.kind === 'module') {
    const mod = modules.find((m) => m.id === unit.ref);
    if (!mod) return [];
    return collectModulePosts(mod, extras.moduleExtras?.[mod.id] ?? []);
  }

  if (!sidebar) return [];
  return collectSidebarBlockPosts(sidebar, unit.ref, extras.sidebarExtraPostsByMode);
}
