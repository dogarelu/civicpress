import {
  TickerBarConfigSchema,
  TickerBarSlotSchema,
  type TickerBarConfig,
  type TickerBarKind,
  type TickerBarSlot,
  type TickerBarSource,
  type TickerMenuEntry,
  type TickerMotion,
  type TickerScrollFrom,
  type TickerTextAlign,
} from './schemas.js';

export const TICKER_BARS_MAX = 4;
export const TICKER_CUSTOM_ITEMS_MAX = 20;

export const TICKER_BAR_SLOTS: TickerBarSlot[] = ['above', 'logo-top', 'logo-bottom', 'below'];

export const TICKER_BAR_SLOT_LABELS: Record<TickerBarSlot, string> = {
  above: 'Bandă deasupra',
  'logo-top': 'Lângă siglă — sus',
  'logo-bottom': 'Lângă siglă — jos',
  below: 'Bandă dedesubt',
};

export const TICKER_BAR_KIND_OPTIONS: { value: TickerBarKind; label: string }[] = [
  { value: 'ticker', label: 'Ticker' },
  { value: 'menu', label: 'Meniu' },
];

export const TICKER_FONT_WEIGHTS = [
  { value: 400, label: '400 — Normal' },
  { value: 500, label: '500 — Mediu' },
  { value: 600, label: '600 — Semibold' },
  { value: 700, label: '700 — Bold' },
  { value: 800, label: '800 — Extra bold' },
  { value: 900, label: '900 — Black' },
] as const;

export const TICKER_ALIGN_OPTIONS: { value: TickerTextAlign; label: string }[] = [
  { value: 'left', label: 'Stânga' },
  { value: 'center', label: 'Mijloc' },
  { value: 'right', label: 'Dreapta' },
];

export const TICKER_SCROLL_FROM_OPTIONS: { value: TickerScrollFrom; label: string }[] = [
  { value: 'left', label: 'Din stânga' },
  { value: 'right', label: 'Din dreapta' },
];

export const TICKER_MOTION_OPTIONS: { value: TickerMotion; label: string }[] = [
  { value: 'slide', label: 'Titlu cu titlu' },
  { value: 'marquee', label: 'Derulare continuă' },
];

export const TICKER_SOURCE_OPTIONS: { value: TickerBarSource; label: string }[] = [
  { value: 'most-read', label: 'Cele mai citite' },
  { value: 'newest', label: 'Cele mai noi' },
  { value: 'category', label: 'O categorie' },
  { value: 'custom', label: 'Texte personalizate' },
];

const DEFAULT_TITLES: Record<TickerBarSource, string> = {
  'most-read': 'Cele mai citite',
  newest: 'Cele mai noi',
  category: 'Categorie',
  custom: 'Anunțuri',
};

export const DEFAULT_MENU_BAR_TITLE = 'Meniu';

export type TickerBarsFallback = {
  bgColor?: string;
  textColor?: string;
  fontWeight?: number;
  headerMaxCategories?: number;
  headerShowMoreDropdown?: boolean;
  headerMoreCategoryIds?: string[];
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultTickerBarTitle(source: TickerBarSource): string {
  return DEFAULT_TITLES[source];
}

export function defaultBarTitle(kind: TickerBarKind, source: TickerBarSource): string {
  return kind === 'menu' ? DEFAULT_MENU_BAR_TITLE : defaultTickerBarTitle(source);
}

export function isOptionalTickerSlot(slot: TickerBarSlot): boolean {
  return slot === 'above' || slot === 'below';
}

export function isLogoTickerSlot(slot: TickerBarSlot): boolean {
  return slot === 'logo-top' || slot === 'logo-bottom';
}

export function slotDefaultId(slot: TickerBarSlot): string {
  return `header-${slot}`;
}

function defaultShowSearch(slot: TickerBarSlot): boolean {
  return slot === 'logo-top';
}

function defaultShowSocial(slot: TickerBarSlot): boolean {
  return slot === 'logo-bottom';
}

export function createTickerBar(partial: Partial<TickerBarConfig> = {}): TickerBarConfig {
  const slot = partial.slot ?? 'logo-top';
  const kind = partial.kind ?? (slot === 'logo-bottom' ? 'menu' : 'ticker');
  const source = partial.source ?? 'most-read';
  const isMenu = kind === 'menu';
  return {
    id: partial.id ?? slotDefaultId(slot),
    enabled: isLogoTickerSlot(slot) ? true : (partial.enabled ?? false),
    slot,
    kind,
    title: partial.title ?? defaultBarTitle(kind, source),
    titleBgColor: partial.titleBgColor ?? '#000000',
    titleTextColor: partial.titleTextColor ?? '#FFFFFF',
    bgColor: partial.bgColor ?? (isMenu ? '#FFFFFF' : '#8A0808'),
    textColor: partial.textColor ?? (isMenu ? '#374151' : '#FFFFFF'),
    fontSize: clamp(partial.fontSize ?? (isMenu ? 14 : 15), 11, 28),
    fontWeight: clamp(partial.fontWeight ?? (isMenu ? 700 : 600), 400, 900),
    source,
    categoryId: partial.categoryId ?? null,
    customItems: (partial.customItems ?? [])
      .map((item) => ({
        id: item.id || newId('txt'),
        text: item.text,
      }))
      .slice(0, TICKER_CUSTOM_ITEMS_MAX),
    itemCount: clamp(partial.itemCount ?? 5, 1, 15),
    intervalMs: clamp(partial.intervalMs ?? 5000, 1000, 30000),
    textAlign: partial.textAlign ?? 'left',
    scrollFrom: partial.scrollFrom ?? 'right',
    motion: partial.motion ?? 'slide',
    marqueeSpeed: clamp(partial.marqueeSpeed ?? 60, 20, 180),
    showSearch: partial.showSearch ?? defaultShowSearch(slot),
    showSocial: partial.showSocial ?? defaultShowSocial(slot),
    menuEntries: (partial.menuEntries ?? [])
      .map((entry) => ({
        categoryId: entry.categoryId,
        childIds: [...(entry.childIds ?? [])],
      }))
      .filter((entry) => entry.categoryId)
      .slice(0, 40),
    headerMaxCategories: clamp(partial.headerMaxCategories ?? 6, 1, 20),
    headerShowMoreDropdown: partial.headerShowMoreDropdown ?? true,
    headerMoreCategoryIds: [...(partial.headerMoreCategoryIds ?? [])].slice(0, 40),
  };
}

export function createTickerCustomItem(text = ''): { id: string; text: string } {
  return { id: newId('txt'), text };
}

export function headlineHref(post: { slug: string; videoUrl?: string | null }): string {
  return post.videoUrl?.trim() ? `/video/${post.slug}` : `/${post.slug}`;
}

export function seedMenuEntriesFromFlags(
  categories: { id: string; parentId: string | null; showInMenu: boolean; menuOrder: number }[],
): TickerMenuEntry[] {
  const top = categories
    .filter((cat) => !cat.parentId && cat.showInMenu)
    .sort((a, b) => a.menuOrder - b.menuOrder);
  return top.map((cat) => ({
    categoryId: cat.id,
    childIds: categories
      .filter((child) => child.parentId === cat.id && child.showInMenu)
      .sort((a, b) => a.menuOrder - b.menuOrder)
      .map((child) => child.id),
  }));
}

function hasExplicitSlot(item: unknown): boolean {
  return (
    !!item &&
    typeof item === 'object' &&
    'slot' in item &&
    TickerBarSlotSchema.safeParse((item as { slot: unknown }).slot).success
  );
}

function parseStoredBar(item: unknown): TickerBarConfig | null {
  if (!item || typeof item !== 'object') return null;
  const raw = item as Record<string, unknown>;
  const result = TickerBarConfigSchema.safeParse({
    kind: 'ticker',
    showSearch: false,
    showSocial: false,
    menuEntries: [],
    headerMaxCategories: 6,
    headerShowMoreDropdown: true,
    headerMoreCategoryIds: [],
    ...raw,
    slot: hasExplicitSlot(item) ? raw['slot'] : 'logo-top',
  });
  if (!result.success) return null;
  return createTickerBar(result.data);
}

export function defaultBarForSlot(
  slot: TickerBarSlot,
  fallback?: TickerBarsFallback,
): TickerBarConfig {
  if (slot === 'logo-bottom') {
    return createTickerBar({
      id: slotDefaultId(slot),
      slot,
      kind: 'menu',
      enabled: true,
      title: DEFAULT_MENU_BAR_TITLE,
      bgColor: '#FFFFFF',
      textColor: '#374151',
      fontSize: 14,
      fontWeight: 700,
      showSearch: false,
      showSocial: true,
      headerMaxCategories: fallback?.headerMaxCategories ?? 6,
      headerShowMoreDropdown: fallback?.headerShowMoreDropdown ?? true,
      headerMoreCategoryIds: fallback?.headerMoreCategoryIds ?? [],
    });
  }

  const tickerColors = {
    bgColor: fallback?.bgColor ?? '#8A0808',
    textColor: fallback?.textColor ?? '#FFFFFF',
    fontWeight: fallback?.fontWeight ?? 600,
  };

  if (slot === 'logo-top') {
    return createTickerBar({
      id: 'legacy-most-read',
      slot,
      kind: 'ticker',
      enabled: true,
      title: defaultTickerBarTitle('most-read'),
      source: 'most-read',
      showSearch: true,
      showSocial: false,
      ...tickerColors,
    });
  }

  return createTickerBar({
    id: slotDefaultId(slot),
    slot,
    kind: 'ticker',
    enabled: false,
    title: defaultTickerBarTitle('most-read'),
    source: 'most-read',
    showSearch: false,
    showSocial: false,
    ...tickerColors,
  });
}

export function normalizeTickerBars(
  input: unknown,
  fallback?: TickerBarsFallback,
): TickerBarConfig[] {
  if (!Array.isArray(input) || input.length === 0) {
    return TICKER_BAR_SLOTS.map((slot) => defaultBarForSlot(slot, fallback));
  }

  if (input.some(hasExplicitSlot)) {
    const bySlot = new Map<TickerBarSlot, TickerBarConfig>();
    for (const item of input) {
      const parsed = parseStoredBar(item);
      if (!parsed || !hasExplicitSlot(item)) continue;
      bySlot.set(parsed.slot, parsed);
    }
    return TICKER_BAR_SLOTS.map((slot) => {
      const found = bySlot.get(slot);
      if (!found) return defaultBarForSlot(slot, fallback);
      return createTickerBar({
        ...found,
        enabled: isLogoTickerSlot(slot) ? true : found.enabled,
      });
    });
  }

  const parsed = input.map(parseStoredBar).filter((bar): bar is TickerBarConfig => !!bar);
  const first = parsed[0];
  const second = parsed[1];

  return [
    defaultBarForSlot('above', fallback),
    first
      ? createTickerBar({
          ...first,
          slot: 'logo-top',
          kind: 'ticker',
          enabled: true,
          showSearch: true,
          showSocial: false,
        })
      : defaultBarForSlot('logo-top', fallback),
    defaultBarForSlot('logo-bottom', fallback),
    second
      ? createTickerBar({
          ...second,
          slot: 'below',
          kind: 'ticker',
          enabled: true,
          showSearch: false,
          showSocial: false,
        })
      : defaultBarForSlot('below', fallback),
  ];
}
