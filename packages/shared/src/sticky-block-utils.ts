/**
 * Sticky sidebar entries keyed by `blockIndex`.
 * A later sidebar block can stick even when earlier ones do not.
 * `fromModuleId` / `untilModuleId` are inclusive left-module bounds.
 * `fromModuleId` null = start after the previous sticky (or at the top).
 */
export interface SidebarStickyBlock {
  /** Sidebar block index this entry applies to. */
  blockIndex: number;
  fromModuleId: string | null;
  untilModuleId: string | null;
}

/** Legacy single-sticky fields (pre multi-sticky). */
export interface LegacySidebarStickyFields {
  stickyFirstBlock?: boolean | null;
  stickyUntilModuleId?: string | null;
  stickyBlocks?: Array<
    Partial<SidebarStickyBlock> & {
      fromModuleId?: string | null;
      untilModuleId?: string | null;
      blockIndex?: number | null;
    }
  > | null;
}

function assignedBlockIndex(
  entry: { blockIndex?: number | null } | null | undefined,
  fallback: number,
): number {
  const raw = entry?.blockIndex;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) return raw;
  return fallback;
}

/** Sort, dedupe, and drop indexes at or beyond `maxLength`. */
function finalizeStickyBlocks(
  blocks: SidebarStickyBlock[],
  maxLength: number,
): SidebarStickyBlock[] {
  const byIndex = new Map<number, SidebarStickyBlock>();
  for (const entry of blocks) {
    if (entry.blockIndex < 0) continue;
    if (Number.isFinite(maxLength) && entry.blockIndex >= maxLength) continue;
    byIndex.set(entry.blockIndex, {
      blockIndex: entry.blockIndex,
      fromModuleId: entry.fromModuleId ?? null,
      untilModuleId: entry.untilModuleId ?? null,
    });
  }
  return [...byIndex.values()].sort((a, b) => a.blockIndex - b.blockIndex);
}

/**
 * Normalize sticky config to entries with explicit `blockIndex`.
 * Legacy prefix arrays (no `blockIndex`) map entry `i` → sidebar block `i`.
 */
export function normalizeStickyBlocks(
  input: LegacySidebarStickyFields | null | undefined,
  maxLength = Number.POSITIVE_INFINITY,
): SidebarStickyBlock[] {
  if (!input) return [];

  let blocks: SidebarStickyBlock[];
  if (Array.isArray(input.stickyBlocks) && input.stickyBlocks.length > 0) {
    blocks = input.stickyBlocks.map((entry, i) => ({
      blockIndex: assignedBlockIndex(entry, i),
      fromModuleId: entry?.fromModuleId ?? null,
      untilModuleId: entry?.untilModuleId ?? null,
    }));
  } else if (input.stickyFirstBlock === true) {
    // Legacy single-sticky (or empty stickyBlocks with legacy flag still set).
    blocks = [
      {
        blockIndex: 0,
        fromModuleId: null,
        untilModuleId: input.stickyUntilModuleId ?? null,
      },
    ];
  } else {
    blocks = [];
  }

  return finalizeStickyBlocks(blocks, maxLength);
}

export function isStickyBlockIndex(
  stickyBlocks: SidebarStickyBlock[],
  blockIndex: number,
): boolean {
  return stickyBlocks.some((entry) => entry.blockIndex === blockIndex);
}

export function stickyEntryForBlock(
  stickyBlocks: SidebarStickyBlock[],
  blockIndex: number,
): SidebarStickyBlock | undefined {
  return stickyBlocks.find((entry) => entry.blockIndex === blockIndex);
}

/**
 * Category (and similar) pages: no until-module — the sticky entries stay
 * visible through the whole left column, down to the bottom.
 */
export function isStickyUntilBottom(stickyBlocks: SidebarStickyBlock[]): boolean {
  return stickyBlocks.length > 0 && stickyBlocks.every((entry) => !entry.untilModuleId);
}

/** Legacy mirror of the first sticky entry (for older readers). */
export function stickyLegacyMirror(stickyBlocks: SidebarStickyBlock[]): {
  stickyFirstBlock: boolean;
  stickyUntilModuleId: string | null;
} {
  if (stickyBlocks.length === 0) {
    return { stickyFirstBlock: false, stickyUntilModuleId: null };
  }
  return {
    stickyFirstBlock: true,
    stickyUntilModuleId: stickyBlocks[0]?.untilModuleId ?? null,
  };
}

/** Inclusive left-module range for one sticky sidebar block. */
export interface StickyModuleRange {
  fromIndex: number;
  untilIndex: number;
}

function clampModuleIndex(index: number, minIndex: number, length: number): number {
  if (index < minIndex) return minIndex;
  if (index < 0) return minIndex;
  if (index >= length) return length - 1;
  return index;
}

/**
 * Resolve inclusive from/until indexes into `modules` for each sticky entry.
 * Entries must be in `blockIndex` order. Ranges do not overlap. A later start
 * than the previous end leaves a gap (left modules with no sticky counterpart).
 */
export function resolveStickyRanges(
  stickyBlocks: SidebarStickyBlock[],
  moduleIds: string[],
): StickyModuleRange[] {
  if (stickyBlocks.length === 0 || moduleIds.length === 0) return [];

  const ranges: StickyModuleRange[] = [];
  let minIndex = 0;

  for (const entry of stickyBlocks) {
    if (minIndex >= moduleIds.length) break;

    const rawFrom = entry.fromModuleId
      ? moduleIds.findIndex((id) => id === entry.fromModuleId)
      : minIndex;
    const fromIndex = clampModuleIndex(rawFrom, minIndex, moduleIds.length);

    const rawUntil = entry.untilModuleId
      ? moduleIds.findIndex((id) => id === entry.untilModuleId)
      : fromIndex;
    const untilIndex = clampModuleIndex(rawUntil, fromIndex, moduleIds.length);

    ranges.push({ fromIndex, untilIndex });
    minIndex = untilIndex + 1;
  }

  return ranges;
}

/**
 * Resolve inclusive end indexes into `modules` for each sticky entry.
 * Ensures a strictly increasing chain (no overlap).
 */
export function resolveStickyUntilIndexes(
  stickyBlocks: SidebarStickyBlock[],
  moduleIds: string[],
): number[] {
  return resolveStickyRanges(stickyBlocks, moduleIds).map((range) => range.untilIndex);
}

/** One sticky sidebar block plus any left modules before its start. */
export interface StickySplitRange<T> {
  gap: T[];
  modules: T[];
}

/** Split left modules into gap + sticky ranges + remainder. */
export function splitModulesByStickyRanges<T>(
  modules: T[],
  ranges: StickyModuleRange[],
): { ranges: StickySplitRange<T>[]; after: T[] } {
  if (ranges.length === 0) {
    return { ranges: [], after: modules };
  }

  const split: StickySplitRange<T>[] = [];
  let cursor = 0;
  for (const range of ranges) {
    const from = Math.min(modules.length, Math.max(cursor, range.fromIndex));
    const until = Math.min(modules.length - 1, Math.max(from, range.untilIndex));
    split.push({
      gap: modules.slice(cursor, from),
      modules: modules.slice(from, until + 1),
    });
    cursor = until + 1;
  }

  return {
    ranges: split,
    after: modules.slice(cursor),
  };
}

/** Split left modules into sticky segments + remainder using resolved until indexes. */
export function splitModulesByStickyIndexes<T>(
  modules: T[],
  untilIndexes: number[],
): { segments: T[][]; after: T[] } {
  const ranges = untilIndexes.map((untilIndex, index) => ({
    fromIndex: index === 0 ? 0 : untilIndexes[index - 1] + 1,
    untilIndex,
  }));
  const split = splitModulesByStickyRanges(modules, ranges);
  return {
    segments: split.ranges.map((range) => [...range.gap, ...range.modules]),
    after: split.after,
  };
}
