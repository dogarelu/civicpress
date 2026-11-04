import type { LayoutModule, ModuleType } from './schemas.js';
import { isFullWidthModuleType } from './schemas.js';

type FullWidthAwareModule = {
  type: ModuleType;
  options?: { count?: number | null } | null;
  /** Resolved modules may expose count at the top level. */
  count?: number | null;
};

/** Count contiguous with-sidebar sections separated by full-width modules. */
export function countWithSidebarSections(modules: ReadonlyArray<FullWidthAwareModule>): number {
  let count = 0;
  let inSection = false;
  for (const mod of modules) {
    if (isFullWidthModuleType(mod.type, { count: mod.options?.count ?? mod.count })) {
      inSection = false;
    } else if (!inSection) {
      count++;
      inSection = true;
    }
  }
  return count;
}

/** Total sidebar items to resolve per block across all with-sidebar sections. */
export function sidebarFetchTotalForSections(
  sectionCount: number,
  configuredQuota: number,
): number {
  const quota = Math.max(1, configuredQuota);
  const sections = Math.max(1, sectionCount);
  return quota * sections;
}

/** @deprecated Use countWithSidebarSections. */
export function countWithSidebarSegments(modules: ReadonlyArray<{ type: ModuleType }>): number {
  return countWithSidebarSections(modules);
}

/** @deprecated Height-based fitting determines consumption at runtime. */
export function countArticleSidebarSplitsFromConfig(modules: ReadonlyArray<LayoutModule>): number {
  return countWithSidebarSections(modules);
}

/** @deprecated Height-based fitting determines consumption at runtime. */
export function countArticleSidebarSplitsFromResolved(
  modules: ReadonlyArray<{ type: ModuleType }>,
): number {
  return countWithSidebarSections(modules);
}

/** @deprecated Use sidebarFetchTotalForSections. */
export function sidebarFetchTotalForSplits(splitCount: number, configuredQuota: number): number {
  return sidebarFetchTotalForSections(splitCount, configuredQuota);
}

/** @deprecated Height-based fitting replaces fixed per-split quotas. */
export function sidebarQuotaPerSplit(_splitCount: number, configuredQuota: number): number {
  return Math.max(1, configuredQuota);
}

/** @deprecated Height-based fitting replaces fixed per-split quotas. */
export const SIDEBAR_QUOTA_PER_ARTICLE_SPLIT = 1;
