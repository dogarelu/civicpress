import type { SidebarBlockEntry, SidebarMode } from './schemas.js';
import { isSidebarMultiInstanceMode } from './schemas.js';

export const SIDEBAR_SINGLE_CATEGORY_DEFAULT_ID = 'sc-default';
export const SIDEBAR_SLIDESHOW_DEFAULT_ID = 'ss-default';
export const SIDEBAR_MOST_VIEWED_DEFAULT_ID = 'mv-default';

/** Resolve the sidebar mode for a block entry (string or structured ref). */
export function sidebarBlockMode(entry: SidebarBlockEntry): SidebarMode {
  return typeof entry === 'string' ? entry : entry.mode;
}

export function isSidebarSingleCategoryEntry(
  entry: SidebarBlockEntry,
): entry is { mode: 'single-category'; id: string } {
  return typeof entry !== 'string' && entry.mode === 'single-category';
}

export function isSidebarSlideshowEntry(
  entry: SidebarBlockEntry,
): entry is { mode: 'slideshow'; id: string } {
  return typeof entry !== 'string' && entry.mode === 'slideshow';
}

export function isSidebarFeaturedVideoEntry(
  entry: SidebarBlockEntry,
): entry is { mode: 'featured-video'; id: string } {
  return typeof entry !== 'string' && entry.mode === 'featured-video';
}

export function isSidebarFeaturedArticleEntry(
  entry: SidebarBlockEntry,
): entry is { mode: 'featured-article'; id: string } {
  return typeof entry !== 'string' && entry.mode === 'featured-article';
}

export function isSidebarFeaturedPhotoEntry(
  entry: SidebarBlockEntry,
): entry is { mode: 'featured-photo'; id: string } {
  return typeof entry !== 'string' && entry.mode === 'featured-photo';
}

export function isSidebarFeaturedStackEntry(
  entry: SidebarBlockEntry,
): entry is { mode: 'featured-stack'; id: string } {
  return typeof entry !== 'string' && entry.mode === 'featured-stack';
}

export function isSidebarMostViewedEntry(
  entry: SidebarBlockEntry,
): entry is { mode: 'most-viewed'; id: string } {
  return typeof entry !== 'string' && entry.mode === 'most-viewed';
}

/** True when the entry is a multi-instance sidebar block with an id. */
export function isSidebarMultiInstanceEntry(
  entry: SidebarBlockEntry,
): entry is Extract<SidebarBlockEntry, { mode: SidebarMode; id: string }> {
  return typeof entry !== 'string' && isSidebarMultiInstanceMode(entry.mode);
}

export function sidebarSingleCategoryBlockId(entry: SidebarBlockEntry): string | null {
  return isSidebarSingleCategoryEntry(entry) ? entry.id : null;
}

export function sidebarSlideshowBlockId(entry: SidebarBlockEntry): string | null {
  return isSidebarSlideshowEntry(entry) ? entry.id : null;
}

export function sidebarMultiInstanceBlockId(entry: SidebarBlockEntry): string | null {
  return isSidebarMultiInstanceEntry(entry) ? entry.id : null;
}

/** Normalize legacy plain sidebar block strings to structured block refs. */
export function normalizeSidebarBlockEntry(block: unknown): SidebarBlockEntry {
  if (block === 'single-category') {
    return { mode: 'single-category', id: SIDEBAR_SINGLE_CATEGORY_DEFAULT_ID };
  }
  if (block === 'slideshow') {
    return { mode: 'slideshow', id: SIDEBAR_SLIDESHOW_DEFAULT_ID };
  }
  if (block === 'most-viewed') {
    return { mode: 'most-viewed', id: SIDEBAR_MOST_VIEWED_DEFAULT_ID };
  }
  return block as SidebarBlockEntry;
}
