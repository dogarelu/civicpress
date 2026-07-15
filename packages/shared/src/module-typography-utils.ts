import type {
  ModuleTypography,
  ModuleTypographyPresets,
  ModuleTypographyStyle,
  ModuleType,
  SidebarBlockSummarySettings,
  SidebarBlockTypography,
  SidebarMode,
  SummaryDisplaySettings,
} from './schemas.js';
import { DEFAULT_SUMMARY_ROWS } from './schemas.js';

function hasTypographyStyle(style: ModuleTypographyStyle | null | undefined): boolean {
  if (!style) return false;
  return style.fontSize != null || style.fontWeight != null || style.color != null;
}

const TYPOGRAPHY_ROLE_KEYS = [
  'title',
  'heroTitle',
  'smallTitle',
  'rowHeader',
  'category',
  'meta',
  'content',
] as const;

function cloneModuleTypography(typography: ModuleTypography): ModuleTypography {
  const cloned: ModuleTypography = {};
  for (const key of TYPOGRAPHY_ROLE_KEYS) {
    const style = typography[key];
    if (style) cloned[key] = { ...style };
  }
  return cloned;
}

/** Strip HTML tags from excerpt/summary text for display. */
export function cleanExcerptText(excerpt: string | null | undefined): string {
  if (!excerpt) return '';
  return excerpt.replace(/<[^>]*>/g, '').trim();
}

/** Resolve configured summary row count with backward-compatible default. */
export function resolveSummaryRows(
  summaryRows: number | null | undefined,
  siteDefault: number = DEFAULT_SUMMARY_ROWS,
): number {
  return summaryRows ?? siteDefault;
}

function pushStyleVars(
  parts: string[],
  style: ModuleTypographyStyle | null | undefined,
  varNames: string[],
): void {
  if (!style) return;
  if (style.fontSize != null) {
    for (const name of varNames) parts.push(`${name}-font-size: ${style.fontSize}px`);
  }
  if (style.fontWeight != null) {
    for (const name of varNames) parts.push(`${name}-font-weight: ${style.fontWeight}`);
  }
  if (style.color != null) {
    for (const name of varNames) parts.push(`${name}-color: ${style.color}`);
  }
}

/** Build inline CSS that overrides module text vars when typography is set. */
export function buildModuleTypographyCss(
  typography: ModuleTypography | null | undefined,
): string | null {
  if (!typography) return null;

  const parts: string[] = [];

  // Card / list titles.
  pushStyleVars(parts, typography.title, ['--news-title']);
  // Hero overlay titles (legacy configs stored hero styling under `title`).
  pushStyleVars(parts, typography.heroTitle ?? typography.title, ['--hero-title']);
  // Sidebar / secondary item titles (legacy configs used `title` for sidebar styling).
  pushStyleVars(parts, typography.smallTitle ?? typography.title, ['--sidebar-title']);
  // Secondary card titles in hero-top-list override --news-title when smallTitle is set.
  if (typography.smallTitle) {
    pushStyleVars(parts, typography.smallTitle, ['--news-title']);
  }
  pushStyleVars(parts, typography.rowHeader, ['--row-header']);
  pushStyleVars(parts, typography.category, ['--module-category']);
  pushStyleVars(parts, typography.meta, ['--module-meta']);
  return parts.length > 0 ? parts.join('; ') : null;
}

/** Build inline CSS variables for summary typography and row clamp. */
export function buildSummaryDisplayCss(
  summaryTypography: ModuleTypographyStyle | null | undefined,
  summaryRows: number | null | undefined,
): string | null {
  const parts: string[] = [];
  pushStyleVars(parts, summaryTypography, ['--news-summary']);
  if (summaryRows != null) {
    parts.push(`--news-summary-line-clamp: ${summaryRows}`);
  }
  return parts.length > 0 ? parts.join('; ') : null;
}

/** Combine multiple inline style chunks into one attribute value. */
export function combineInlineStyles(...styles: Array<string | null | undefined>): string | null {
  const values = styles.map((style) => style?.trim()).filter((style): style is string => !!style);
  return values.length > 0 ? values.join('; ') : null;
}

/** Resolve typography for the active sidebar block. */
export function sidebarBlockTypography(
  blockTypography: SidebarBlockTypography | null | undefined,
  mode: SidebarMode,
  blockId?: string | null,
  singleCategoryBlockTypography?: Record<string, ModuleTypography> | null,
  slideshowBlockTypography?: Record<string, ModuleTypography> | null,
): ModuleTypography | undefined {
  if (mode === 'single-category' && blockId && singleCategoryBlockTypography?.[blockId]) {
    return singleCategoryBlockTypography[blockId];
  }
  if (mode === 'slideshow' && blockId && slideshowBlockTypography?.[blockId]) {
    return slideshowBlockTypography[blockId];
  }
  if (!blockTypography) return undefined;
  return blockTypography[mode];
}

/** Resolve summary settings for the active sidebar block. */
export function sidebarBlockSummarySettings(
  blockSummarySettings: SidebarBlockSummarySettings | null | undefined,
  mode: SidebarMode,
  blockId?: string | null,
  singleCategoryBlockSummarySettings?: Record<string, SummaryDisplaySettings> | null,
  slideshowBlockSummarySettings?: Record<string, SummaryDisplaySettings> | null,
): SummaryDisplaySettings | undefined {
  if (mode === 'single-category' && blockId && singleCategoryBlockSummarySettings?.[blockId]) {
    return singleCategoryBlockSummarySettings[blockId];
  }
  if (mode === 'slideshow' && blockId && slideshowBlockSummarySettings?.[blockId]) {
    return slideshowBlockSummarySettings[blockId];
  }
  if (!blockSummarySettings) return undefined;
  return blockSummarySettings[mode];
}

export function migrateLegacySummaryFromTypography(
  typography: Record<string, unknown> | ModuleTypography | null | undefined,
): {
  typography: ModuleTypography | null | undefined;
  summaryTypography?: ModuleTypographyStyle;
  summaryRows?: number;
} {
  if (!typography || typeof typography !== 'object') {
    return { typography: typography as ModuleTypography | null | undefined };
  }
  const value = typography as Record<string, unknown>;
  const next = { ...(value as ModuleTypography) };
  const summaryTypography =
    value.summary && typeof value.summary === 'object'
      ? (value.summary as ModuleTypographyStyle)
      : undefined;
  const summaryRowsRaw = value.summaryRows;
  const summaryRows =
    typeof summaryRowsRaw === 'number' && Number.isFinite(summaryRowsRaw)
      ? Math.max(1, Math.min(8, Math.floor(summaryRowsRaw)))
      : undefined;
  delete (next as Record<string, unknown>).summary;
  delete (next as Record<string, unknown>).summaryRows;
  return {
    typography: next,
    summaryTypography,
    summaryRows,
  };
}

/** True when typography has at least one explicit value. */
export function hasModuleTypography(typography: ModuleTypography | null | undefined): boolean {
  if (!typography) return false;
  return TYPOGRAPHY_ROLE_KEYS.some((key) => hasTypographyStyle(typography[key]));
}

/** Strip empty typography objects before persisting layout config. */
export function normalizeModuleTypography(
  typography: ModuleTypography | null | undefined,
): ModuleTypography | undefined {
  if (!hasModuleTypography(typography)) return undefined;
  return typography ?? undefined;
}

const MODULE_TYPES: ModuleType[] = [
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
];

/** Derive presets from current modules (last non-null typography per type wins). */
export function deriveModuleTypographyPresets(
  modules: ReadonlyArray<{ type: ModuleType; typography: ModuleTypography | null | undefined }>,
): ModuleTypographyPresets {
  const presets: ModuleTypographyPresets = {};
  for (const mod of modules) {
    const normalized = normalizeModuleTypography(mod.typography);
    if (normalized) {
      presets[mod.type] = cloneModuleTypography(normalized);
    }
  }
  return presets;
}

/** Strip empty preset entries before persisting layout config. */
export function normalizeModuleTypographyPresets(
  presets: ModuleTypographyPresets | null | undefined,
): ModuleTypographyPresets {
  if (!presets) return {};
  const normalized: ModuleTypographyPresets = {};
  for (const type of MODULE_TYPES) {
    const typography = normalizeModuleTypography(presets[type]);
    if (typography) {
      normalized[type] = typography;
    }
  }
  return normalized;
}

/** Merge stored presets with derived ones; derived wins per module type. */
export function mergeModuleTypographyPresets(
  stored: ModuleTypographyPresets | null | undefined,
  derived: ModuleTypographyPresets | null | undefined,
): ModuleTypographyPresets {
  return {
    ...normalizeModuleTypographyPresets(stored),
    ...normalizeModuleTypographyPresets(derived),
  };
}

/** Store non-empty typography for a module type; null resets leave the preset unchanged. */
export function rememberModuleTypographyPreset(
  presets: ModuleTypographyPresets,
  type: ModuleType,
  typography: ModuleTypography | null,
): ModuleTypographyPresets {
  const normalized = normalizeModuleTypography(typography);
  if (!normalized) return presets;
  return { ...presets, [type]: cloneModuleTypography(normalized) };
}

/** Clone a stored preset for use on a newly added module. */
export function presetTypographyForType(
  presets: ModuleTypographyPresets,
  type: ModuleType,
): ModuleTypography | null {
  const preset = presets[type];
  if (!preset) return null;
  const normalized = normalizeModuleTypography(preset);
  return normalized ? cloneModuleTypography(normalized) : null;
}
