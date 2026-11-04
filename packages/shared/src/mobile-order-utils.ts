import type { MobileLayoutUnit, PageLayoutConfig, SidebarBlockEntry } from './schemas.js';
import { isSidebarMultiInstanceEntry, sidebarBlockMode } from './sidebar-block-utils.js';

/** Stable ref for a sidebar block entry (used in mobileOrder). */
export function sidebarBlockRef(entry: SidebarBlockEntry): string {
  if (isSidebarMultiInstanceEntry(entry)) return entry.id;
  return sidebarBlockMode(entry);
}

function unitKey(unit: MobileLayoutUnit): string {
  return `${unit.kind}:${unit.ref}`;
}

/** Default mobile order: all main modules, then all sidebar blocks (web order). */
export function buildDefaultMobileOrder(config: PageLayoutConfig): MobileLayoutUnit[] {
  const units: MobileLayoutUnit[] = config.modules
    // Desktop-only modules stay out of the mobile order list.
    .filter((mod) => mod.type !== 'video-list')
    .map((mod) => ({
      kind: 'module',
      ref: mod.id,
    }));
  if (config.sidebar.enabled) {
    for (const block of config.sidebar.blocks) {
      units.push({ kind: 'sidebar', ref: sidebarBlockRef(block) });
    }
  }
  return units;
}

/** All valid mobile units for the current layout config. */
export function availableMobileUnits(config: PageLayoutConfig): MobileLayoutUnit[] {
  return buildDefaultMobileOrder(config);
}

/**
 * Keep existing mobile order for units still present; append new units at end;
 * drop removed units.
 */
export function syncMobileOrder(
  existing: MobileLayoutUnit[],
  config: PageLayoutConfig,
): MobileLayoutUnit[] {
  const available = availableMobileUnits(config);
  const availableKeys = new Set(available.map(unitKey));

  const kept = existing.filter((unit) => availableKeys.has(unitKey(unit)));
  const keptKeys = new Set(kept.map(unitKey));

  const added = available.filter((unit) => !keptKeys.has(unitKey(unit)));
  return [...kept, ...added];
}

/** Effective order: stored mobileOrder when non-empty, otherwise web default. */
export function effectiveMobileOrder(config: PageLayoutConfig): MobileLayoutUnit[] {
  const stored = config.mobileOrder ?? [];
  if (stored.length > 0) {
    return syncMobileOrder(stored, config);
  }
  return buildDefaultMobileOrder(config);
}
