import type {
  ModuleTypography,
  ModuleTypographyPresets,
  ModuleTypographyStyle,
  ModuleType,
  SidebarBlockBackgroundColor,
  SidebarBlockSummarySettings,
  SidebarBlockTypography,
  SidebarMode,
  SummaryDisplaySettings,
} from './schemas.js';
import { DEFAULT_SUMMARY_ROWS } from './schemas.js';

function hasTypographyStyle(style: ModuleTypographyStyle | null | undefined): boolean {
  if (!style) return false;
  return (
    style.fontSize != null ||
    style.fontWeight != null ||
    style.color != null ||
    style.display != null ||
    style.textColor != null ||
    style.backgroundColor != null ||
    style.lineHeight != null
  );
}

const TYPOGRAPHY_ROLE_KEYS = [
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

/** True when a post has subtitle content (bumbi list or legacy excerpt). */
export function hasPostSubtitle(post: {
  bulbi?: readonly unknown[] | null;
  excerpt?: string | null;
}): boolean {
  if (post.bulbi && post.bulbi.length > 0) return true;
  return !!cleanExcerptText(post.excerpt);
}

/** Module-level bumbi visibility. Unset follows `showSummary` (legacy). */
export function resolveShowBumbi(
  showBumbi: boolean | null | undefined,
  showSummary: boolean | null | undefined,
): boolean {
  if (typeof showBumbi === 'boolean') return showBumbi;
  return showSummary !== false;
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
  if (style.backgroundColor != null) {
    for (const name of varNames) parts.push(`${name}-bg: ${style.backgroundColor}`);
  }
  if (style.lineHeight != null) {
    for (const name of varNames) parts.push(`${name}-line-height: ${style.lineHeight}`);
  }
}

/** Category/heroCategory vars: plain text color, or pill bg + text + padding. */
function pushCategoryStyleVars(
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

  if (style.display === 'pill') {
    const bg = style.color;
    const text = style.textColor ?? '#ffffff';
    for (const name of varNames) {
      if (bg != null) parts.push(`${name}-bg: ${bg}`);
      parts.push(`${name}-color: ${text}`);
      parts.push(`${name}-py: 0.15em`);
      parts.push(`${name}-px: 0.55em`);
      parts.push(`${name}-radius: 0.25rem`);
    }
    return;
  }

  if (style.color != null) {
    for (const name of varNames) parts.push(`${name}-color: ${style.color}`);
  }
}

const CATEGORY_COLOR_HEX = /^#[0-9a-fA-F]{6}$/;

/** Category record color (`#RRGGBB`) when set; otherwise undefined. */
export function normalizeCategoryColor(color: string | null | undefined): string | undefined {
  if (!color) return undefined;
  const match = CATEGORY_COLOR_HEX.exec(color.trim());
  return match ? match[0] : undefined;
}

/**
 * When a module is scoped to a category, per-article labels are hidden and the
 * section title stands in for them. Apply the category pill to that title.
 */
export function moduleTitleUsesCategoryPill(mod: {
  category?: { color?: string | null } | null;
  typography?: ModuleTypography | null;
}): boolean {
  if (!mod.category) return false;
  if (normalizeCategoryColor(mod.category.color)) return true;
  return (
    mod.typography?.category?.display === 'pill' || mod.typography?.heroCategory?.display === 'pill'
  );
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
  pushStyleVars(parts, typography.smallTitle ?? typography.title, [
    '--sidebar-title',
    '--module-small-title',
    '--small-title',
  ]);
  // Secondary card titles in hero-top-list override --news-title when smallTitle is set
  // and there is no separate card `title` (so modules with both keep distinct styles).
  if (typography.smallTitle && !typography.title) {
    pushStyleVars(parts, typography.smallTitle, ['--news-title']);
  }
  pushStyleVars(parts, typography.rowHeader, ['--row-header']);
  // Boxed category/module titles (main column) when a header background is set.
  if (typography.rowHeader?.backgroundColor) {
    parts.push('--row-header-py: 0.4em');
    parts.push('--row-header-px: 0.75em');
    parts.push('--row-header-rule: none');
  }
  pushCategoryStyleVars(parts, typography.category, ['--module-category']);
  // Hero category falls back to shared category when unset.
  pushCategoryStyleVars(parts, typography.heroCategory ?? typography.category, ['--hero-category']);
  pushStyleVars(parts, typography.meta, ['--module-meta']);
  pushStyleVars(parts, typography.heroMeta ?? typography.meta, ['--hero-meta']);
  pushStyleVars(parts, typography.content, ['--article-content']);
  pushStyleVars(parts, typography.kicker, ['--article-kicker']);
  pushStyleVars(parts, typography.author, ['--article-author']);
  pushStyleVars(parts, typography.date, ['--article-date']);
  pushStyleVars(parts, typography.views, ['--article-views']);
  pushStyleVars(parts, typography.bumbi, ['--news-bumbi']);
  pushStyleVars(parts, typography.heroBumbi ?? typography.bumbi, ['--hero-bumbi']);
  return parts.length > 0 ? parts.join('; ') : null;
}

/** Build inline CSS variables for summary typography and row clamp. */
export function buildSummaryDisplayCss(
  summaryTypography: ModuleTypographyStyle | null | undefined,
  summaryRows: number | null | undefined,
  heroSummaryTypography?: ModuleTypographyStyle | null,
): string | null {
  const parts: string[] = [];
  pushStyleVars(parts, summaryTypography, ['--news-summary']);
  // Hero summary falls back to the shared summary style when unset.
  pushStyleVars(parts, heroSummaryTypography ?? summaryTypography, ['--hero-summary']);
  if (summaryRows != null) {
    parts.push(`--news-summary-line-clamp: ${summaryRows}`);
    parts.push(`--hero-summary-line-clamp: ${summaryRows}`);
  }
  return parts.length > 0 ? parts.join('; ') : null;
}

/** Build inline CSS variables for subtitle-bumbi typography. */
export function buildBumbiDisplayCss(
  bumbiTypography: ModuleTypographyStyle | null | undefined,
  heroBumbiTypography?: ModuleTypographyStyle | null,
): string | null {
  const parts: string[] = [];
  pushStyleVars(parts, bumbiTypography, ['--news-bumbi']);
  pushStyleVars(parts, heroBumbiTypography ?? bumbiTypography, ['--hero-bumbi']);
  return parts.length > 0 ? parts.join('; ') : null;
}

/** Build inline CSS variables for article photo-caption typography. */
export function buildPhotoCaptionDisplayCss(
  captionTypography: ModuleTypographyStyle | null | undefined,
): string | null {
  const parts: string[] = [];
  pushStyleVars(parts, captionTypography, ['--article-photo-caption']);
  return parts.length > 0 ? parts.join('; ') : null;
}

/** Combine multiple inline style chunks into one attribute value. */
export function combineInlineStyles(...styles: Array<string | null | undefined>): string | null {
  const values = styles.map((style) => style?.trim()).filter((style): style is string => !!style);
  return values.length > 0 ? values.join('; ') : null;
}

const MODULE_BACKGROUND_HEX = /^#[0-9a-fA-F]{6}$/;

/** Normalize an optional module background hex; invalid/empty → undefined (default look). */
export function normalizeModuleBackgroundColor(
  color: string | null | undefined,
): string | undefined {
  if (!color) return undefined;
  const match = MODULE_BACKGROUND_HEX.exec(color.trim());
  return match ? match[0] : undefined;
}

/**
 * Inline CSS vars for a module/sidebar section background override.
 * Pair with `.cp-module-bg` so the fill covers section padding / stack gaps.
 * Also sets `--color-background` so title cutouts (`bg-background`) match.
 */
export function buildModuleBackgroundCss(color: string | null | undefined): string | null {
  const normalized = normalizeModuleBackgroundColor(color);
  if (!normalized) return null;
  return `--module-bg: ${normalized}; --color-background: ${normalized}`;
}

/** Per-instance typography maps keyed by sidebar mode (multi-instance blocks). */
export type SidebarInstanceTypographyMaps = Partial<
  Record<SidebarMode, Record<string, ModuleTypography> | null | undefined>
>;

/** Per-instance summary maps keyed by sidebar mode (multi-instance blocks). */
export type SidebarInstanceSummaryMaps = Partial<
  Record<SidebarMode, Record<string, SummaryDisplaySettings> | null | undefined>
>;

/** Resolve typography for the active sidebar block. */
export function sidebarBlockTypography(
  blockTypography: SidebarBlockTypography | null | undefined,
  mode: SidebarMode,
  blockId?: string | null,
  singleCategoryBlockTypography?: Record<string, ModuleTypography> | null,
  slideshowBlockTypography?: Record<string, ModuleTypography> | null,
  instanceTypographyMaps?: SidebarInstanceTypographyMaps | null,
): ModuleTypography | undefined {
  if (blockId) {
    const fromMaps =
      instanceTypographyMaps?.[mode]?.[blockId] ??
      (mode === 'single-category' ? singleCategoryBlockTypography?.[blockId] : undefined) ??
      (mode === 'slideshow' ? slideshowBlockTypography?.[blockId] : undefined);
    if (fromMaps) return fromMaps;
  }
  if (!blockTypography) return undefined;
  return blockTypography[mode];
}

/** Per-instance background maps keyed by sidebar mode (multi-instance blocks). */
export type SidebarInstanceBackgroundMaps = Partial<
  Record<SidebarMode, Record<string, string> | null | undefined>
>;

/** Resolve background color for the active sidebar block. */
export function sidebarBlockBackgroundColor(
  blockBackgroundColor: SidebarBlockBackgroundColor | null | undefined,
  mode: SidebarMode,
  blockId?: string | null,
  singleCategoryBlockBackgroundColor?: Record<string, string> | null,
  slideshowBlockBackgroundColor?: Record<string, string> | null,
  instanceBackgroundMaps?: SidebarInstanceBackgroundMaps | null,
): string | undefined {
  if (blockId) {
    const fromMaps =
      instanceBackgroundMaps?.[mode]?.[blockId] ??
      (mode === 'single-category' ? singleCategoryBlockBackgroundColor?.[blockId] : undefined) ??
      (mode === 'slideshow' ? slideshowBlockBackgroundColor?.[blockId] : undefined);
    const normalized = normalizeModuleBackgroundColor(fromMaps);
    if (normalized) return normalized;
  }
  return normalizeModuleBackgroundColor(blockBackgroundColor?.[mode]);
}

/** Resolve summary settings for the active sidebar block. */
export function sidebarBlockSummarySettings(
  blockSummarySettings: SidebarBlockSummarySettings | null | undefined,
  mode: SidebarMode,
  blockId?: string | null,
  singleCategoryBlockSummarySettings?: Record<string, SummaryDisplaySettings> | null,
  slideshowBlockSummarySettings?: Record<string, SummaryDisplaySettings> | null,
  instanceSummaryMaps?: SidebarInstanceSummaryMaps | null,
): SummaryDisplaySettings | undefined {
  if (blockId) {
    const fromMaps =
      instanceSummaryMaps?.[mode]?.[blockId] ??
      (mode === 'single-category' ? singleCategoryBlockSummarySettings?.[blockId] : undefined) ??
      (mode === 'slideshow' ? slideshowBlockSummarySettings?.[blockId] : undefined);
    if (fromMaps) return fromMaps;
  }
  if (!blockSummarySettings) return undefined;
  return blockSummarySettings[mode];
}

export function migrateLegacySummaryFromTypography(
  typography: Record<string, unknown> | ModuleTypography | null | undefined,
): {
  typography: ModuleTypography | null | undefined;
  summaryTypography?: ModuleTypographyStyle;
  heroSummaryTypography?: ModuleTypographyStyle;
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
  const heroSummaryTypography =
    value.heroSummary && typeof value.heroSummary === 'object'
      ? (value.heroSummary as ModuleTypographyStyle)
      : undefined;
  const summaryRowsRaw = value.summaryRows;
  const summaryRows =
    typeof summaryRowsRaw === 'number' && Number.isFinite(summaryRowsRaw)
      ? Math.max(1, Math.floor(summaryRowsRaw))
      : undefined;
  delete (next as Record<string, unknown>).summary;
  delete (next as Record<string, unknown>).heroSummary;
  delete (next as Record<string, unknown>).summaryRows;
  return {
    typography: next,
    summaryTypography,
    heroSummaryTypography,
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
  'video-list',
  'article-list',
  'split',
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
