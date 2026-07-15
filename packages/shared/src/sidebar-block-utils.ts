import type { SidebarBlockEntry, SidebarMode } from './schemas.js';

export const SIDEBAR_SINGLE_CATEGORY_DEFAULT_ID = 'sc-default';
export const SIDEBAR_SLIDESHOW_DEFAULT_ID = 'ss-default';

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

export function sidebarSingleCategoryBlockId(entry: SidebarBlockEntry): string | null {
  return isSidebarSingleCategoryEntry(entry) ? entry.id : null;
}

export function sidebarSlideshowBlockId(entry: SidebarBlockEntry): string | null {
  return isSidebarSlideshowEntry(entry) ? entry.id : null;
}

/** Normalize legacy plain sidebar block strings to structured block refs. */
export function normalizeSidebarBlockEntry(block: unknown): SidebarBlockEntry {
  if (block === 'single-category') {
    return { mode: 'single-category', id: SIDEBAR_SINGLE_CATEGORY_DEFAULT_ID };
  }
  if (block === 'slideshow') {
    return { mode: 'slideshow', id: SIDEBAR_SLIDESHOW_DEFAULT_ID };
  }
  return block as SidebarBlockEntry;
}
