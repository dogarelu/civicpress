import { Component, HostListener, input, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  ModuleCategoryDisplay,
  ModuleTypography,
  ModuleTypographyStyle,
} from '@civicpress/shared';

const FONT_WEIGHTS = [
  { value: 400, label: '400 — Normal' },
  { value: 500, label: '500 — Mediu' },
  { value: 600, label: '600 — Semibold' },
  { value: 700, label: '700 — Bold' },
  { value: 800, label: '800 — Extra bold' },
  { value: 900, label: '900 — Black' },
] as const;

/** Text roles editable in the modal, in display order. */
type TypographyRoleKey =
  | 'title'
  | 'heroTitle'
  | 'smallTitle'
  | 'rowHeader'
  | 'heroCategory'
  | 'category'
  | 'heroMeta'
  | 'meta'
  | 'kicker'
  | 'author'
  | 'date'
  | 'views'
  | 'bumbi'
  | 'heroBumbi'
  | 'content';

interface RoleSection {
  key: TypographyRoleKey;
  label: string;
  preview: string;
}

const ROLE_SECTIONS: Record<TypographyRoleKey, RoleSection> = {
  title: { key: 'title', label: 'Titlu (articole / carduri)', preview: 'Exemplu titlu articol' },
  heroTitle: {
    key: 'heroTitle',
    label: 'Titlu articol mare / hero',
    preview: 'Exemplu titlu articol mare',
  },
  smallTitle: {
    key: 'smallTitle',
    label: 'Titluri articole mici / secundare',
    preview: 'Exemplu titlu articol mic',
  },
  rowHeader: {
    key: 'rowHeader',
    label: 'Titlu categorie / modul',
    preview: 'EXEMPLU TITLU CATEGORIE',
  },
  heroCategory: {
    key: 'heroCategory',
    label: 'Categorie articol mare',
    preview: 'CATEGORIE MARE',
  },
  category: { key: 'category', label: 'Categorie (etichetă)', preview: 'CATEGORIE' },
  heroMeta: {
    key: 'heroMeta',
    label: 'Meta articol mare (dată / autor / vizualizări)',
    preview: '20 iun. 2026 • Autor • 123',
  },
  meta: {
    key: 'meta',
    label: 'Meta (dată / autor / vizualizări)',
    preview: '20 iun. 2026 • Autor • 123',
  },
  kicker: { key: 'kicker', label: 'Supratitlu', preview: 'Exemplu supratitlu articol' },
  author: { key: 'author', label: 'Autor', preview: 'Nume Autor' },
  date: { key: 'date', label: 'Dată', preview: '20 iun. 2026' },
  views: { key: 'views', label: 'Vizualizări', preview: '1.234 vizualizări' },
  bumbi: {
    key: 'bumbi',
    label: 'Bumbi (subtitlu)',
    preview: 'Primul bumb din subtitlu',
  },
  heroBumbi: {
    key: 'heroBumbi',
    label: 'Bumbi articol mare / hero',
    preview: 'Primul bumb din subtitlul articolului mare',
  },
  content: {
    key: 'content',
    label: 'Conținut (text articol)',
    preview: 'Exemplu text de conținut al articolului.',
  },
};

const LINE_HEIGHT_OPTIONS = [
  { value: 1.2, label: '1.2 — Compact' },
  { value: 1.4, label: '1.4' },
  { value: 1.5, label: '1.5' },
  { value: 1.6, label: '1.6' },
  { value: 1.7, label: '1.7 — Normal' },
  { value: 1.8, label: '1.8' },
  { value: 2.0, label: '2.0 — Lat' },
  { value: 2.4, label: '2.4' },
] as const;

const DEFAULT_CONTENT_LINE_HEIGHT = 1.7;

const DEFAULT_STYLES: Record<TypographyRoleKey, ModuleTypographyStyle> = {
  title: { fontSize: 20, fontWeight: 700, color: '#374151' },
  heroTitle: { fontSize: 28, fontWeight: 800, color: '#ffffff' },
  smallTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a1a' },
  rowHeader: { fontSize: 18, fontWeight: 800, color: '#1f2937', backgroundColor: '#f3f4f6' },
  heroCategory: { fontSize: 14, fontWeight: 700, color: '#4b5563' },
  category: { fontSize: 12, fontWeight: 700, color: '#4b5563' },
  heroMeta: { fontSize: 13, fontWeight: 400, color: '#6b7280' },
  meta: { fontSize: 12, fontWeight: 400, color: '#6b7280' },
  kicker: { fontSize: 14, fontWeight: 400, color: '#4b5563' },
  author: { fontSize: 14, fontWeight: 500, color: '#111827' },
  date: { fontSize: 14, fontWeight: 400, color: '#6b7280' },
  views: { fontSize: 14, fontWeight: 400, color: '#6b7280' },
  bumbi: { fontSize: 14, fontWeight: 400, color: '#374151' },
  heroBumbi: { fontSize: 14, fontWeight: 400, color: '#4b5563' },
  content: {
    fontSize: 17,
    fontWeight: 400,
    color: '#1f2937',
    lineHeight: DEFAULT_CONTENT_LINE_HEIGHT,
  },
};

const ROLE_ORDER: TypographyRoleKey[] = [
  'title',
  'heroTitle',
  'smallTitle',
  'rowHeader',
  'heroCategory',
  'category',
  'heroMeta',
  'meta',
  'kicker',
  'author',
  'date',
  'views',
  'bumbi',
  'heroBumbi',
  'content',
];

type DraftStyle = {
  fontSize: number;
  fontWeight: number;
  color: string;
  display: ModuleCategoryDisplay;
  textColor: string;
  backgroundColor: string;
  lineHeight: number;
};

const CATEGORY_ROLE_KEYS = new Set<TypographyRoleKey>(['category', 'heroCategory']);
const DEFAULT_PILL_TEXT_COLOR = '#ffffff';
const DEFAULT_ROW_HEADER_BG = '#f3f4f6';
const DEFAULT_BACKGROUND_SWATCH = '#ffffff';
const BACKGROUND_HEX = /^#[0-9a-fA-F]{6}$/;

export type ModuleSettingsSavePayload = {
  typography: ModuleTypography | null;
  backgroundColor: string | null;
};

@Component({
  selector: 'cp-module-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      (click)="closed.emit()"
    >
      <div
        class="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl border border-gray-200"
        (click)="$event.stopPropagation()"
      >
        <header class="px-5 py-4 border-b border-gray-100">
          <h2 class="text-base font-semibold text-gray-800">Setări tipografie</h2>
          <p class="text-xs text-gray-500 mt-1">{{ label() }}</p>
        </header>

        <div class="px-5 py-4 space-y-5 overflow-y-auto">
          @if (supportsBackground()) {
            <section class="space-y-3">
              <h3 class="text-sm font-semibold text-gray-800">Fundal modul</h3>
              <p class="text-xs text-gray-500">
                Lasă gol pentru aspectul implicit (transparent). Titlurile de secțiune folosesc
                aceeași culoare pentru linia tăiată.
              </p>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Culoare fundal</span>
                <span class="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    [ngModel]="draftBackgroundSwatch"
                    (ngModelChange)="onBackgroundSwatchChange($event)"
                    name="moduleBackgroundColor"
                    class="h-9 w-12 rounded border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    [(ngModel)]="draftBackgroundColor"
                    (ngModelChange)="onBackgroundHexChange($event)"
                    name="moduleBackgroundColorHex"
                    maxlength="7"
                    placeholder="implicit"
                    pattern="^#[0-9a-fA-F]{6}$"
                    class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  @if (draftBackgroundColor.trim()) {
                    <button
                      type="button"
                      (click)="clearBackground()"
                      class="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
                    >
                      Șterge
                    </button>
                  }
                </span>
              </label>
            </section>
          }

          @for (section of visibleSections(); track section.key; let first = $first) {
            <section
              class="space-y-4"
              [class.pt-4]="supportsBackground() || !first"
              [class.border-t]="supportsBackground() || !first"
              [class.border-gray-100]="supportsBackground() || !first"
            >
              <h3 class="text-sm font-semibold text-gray-800">{{ section.label }}</h3>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Mărime text (px)</span>
                <input
                  type="number"
                  min="10"
                  max="60"
                  [(ngModel)]="draft[section.key].fontSize"
                  [name]="section.key + 'FontSize'"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </label>

              <label class="block">
                <span class="text-sm font-medium text-gray-700">Grosime</span>
                <select
                  [(ngModel)]="draft[section.key].fontWeight"
                  [name]="section.key + 'FontWeight'"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  @for (w of fontWeights; track w.value) {
                    <option [ngValue]="w.value">{{ w.label }}</option>
                  }
                </select>
              </label>

              @if (isCategoryRole(section.key)) {
                <label class="block">
                  <span class="text-sm font-medium text-gray-700">Stil etichetă</span>
                  <select
                    [(ngModel)]="draft[section.key].display"
                    [name]="section.key + 'Display'"
                    class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="plain">Text</option>
                    <option value="pill">Pill</option>
                  </select>
                </label>
              }

              <label class="block">
                <span class="text-sm font-medium text-gray-700">{{
                  isCategoryRole(section.key) && draft[section.key].display === 'pill'
                    ? 'Culoare fundal'
                    : 'Culoare text'
                }}</span>
                <span class="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    [(ngModel)]="draft[section.key].color"
                    [name]="section.key + 'Color'"
                    class="h-9 w-12 rounded border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    [(ngModel)]="draft[section.key].color"
                    [name]="section.key + 'ColorHex'"
                    maxlength="7"
                    pattern="^#[0-9a-fA-F]{6}$"
                    class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </span>
              </label>

              @if (section.key === 'rowHeader') {
                <label class="block">
                  <span class="text-sm font-medium text-gray-700">Culoare fundal titlu</span>
                  <span class="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      [(ngModel)]="draft[section.key].backgroundColor"
                      [name]="section.key + 'BackgroundColor'"
                      class="h-9 w-12 rounded border border-gray-300 p-0.5"
                    />
                    <input
                      type="text"
                      [(ngModel)]="draft[section.key].backgroundColor"
                      [name]="section.key + 'BackgroundColorHex'"
                      maxlength="7"
                      pattern="^#[0-9a-fA-F]{6}$"
                      class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </span>
                </label>
              }

              @if (isCategoryRole(section.key) && draft[section.key].display === 'pill') {
                <label class="block">
                  <span class="text-sm font-medium text-gray-700">Culoare text</span>
                  <span class="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      [(ngModel)]="draft[section.key].textColor"
                      [name]="section.key + 'TextColor'"
                      class="h-9 w-12 rounded border border-gray-300 p-0.5"
                    />
                    <input
                      type="text"
                      [(ngModel)]="draft[section.key].textColor"
                      [name]="section.key + 'TextColorHex'"
                      maxlength="7"
                      pattern="^#[0-9a-fA-F]{6}$"
                      class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </span>
                </label>
              }

              @if (section.key === 'content') {
                <label class="block">
                  <span class="text-sm font-medium text-gray-700">Spațiere rânduri</span>
                  <select
                    [(ngModel)]="draft[section.key].lineHeight"
                    [name]="section.key + 'LineHeight'"
                    class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    @for (opt of lineHeightOptions; track opt.value) {
                      <option [ngValue]="opt.value">{{ opt.label }}</option>
                    }
                  </select>
                </label>
              }
            </section>
          }

          <div class="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
            <p class="text-xs uppercase tracking-wide text-gray-500">Previzualizare</p>
            @for (section of visibleSections(); track section.key) {
              <p class="leading-snug" [style]="previewStyle(section.key)">
                {{ section.preview }}
              </p>
            }
          </div>
        </div>

        <footer class="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <button type="button" (click)="reset()" class="text-sm text-gray-500 hover:text-gray-700">
            Resetează
          </button>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="closed.emit()"
              class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Anulează
            </button>
            <button
              type="button"
              (click)="save()"
              class="px-4 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-800"
            >
              Salvează
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
})
export class ModuleSettingsModalComponent {
  readonly supportsHeroTitle = input<boolean>(false);
  readonly supportsCardTitle = input<boolean>(true);
  readonly supportsContent = input<boolean>(false);
  readonly supportsSmallTitle = input<boolean>(false);
  readonly supportsRowHeader = input<boolean>(false);
  readonly supportsCategory = input<boolean>(false);
  readonly supportsHeroCategory = input<boolean>(false);
  readonly supportsMeta = input<boolean>(false);
  readonly supportsHeroMeta = input<boolean>(false);
  readonly supportsKicker = input<boolean>(false);
  readonly supportsAuthor = input<boolean>(false);
  readonly supportsDate = input<boolean>(false);
  readonly supportsViews = input<boolean>(false);
  readonly supportsBumbi = input<boolean>(false);
  readonly supportsHeroBumbi = input<boolean>(false);
  /** When false (e.g. article-main), hide module background control. */
  readonly supportsBackground = input<boolean>(true);
  readonly label = input.required<string>();
  readonly typography = input<ModuleTypography | null>(null);
  readonly defaultTypography = input<ModuleTypography | null>(null);
  readonly backgroundColor = input<string | null>(null);

  readonly saved = output<ModuleSettingsSavePayload>();
  readonly closed = output<void>();

  readonly fontWeights = FONT_WEIGHTS;
  readonly lineHeightOptions = LINE_HEIGHT_OPTIONS;

  readonly visibleSections = computed<RoleSection[]>(() =>
    ROLE_ORDER.filter((key) => this.roleSupported(key)).map((key) => ROLE_SECTIONS[key]),
  );

  draft: Record<TypographyRoleKey, DraftStyle> = {
    title: this.resolveStyle(null, DEFAULT_STYLES.title),
    heroTitle: this.resolveStyle(null, DEFAULT_STYLES.heroTitle),
    smallTitle: this.resolveStyle(null, DEFAULT_STYLES.smallTitle),
    rowHeader: this.resolveStyle(null, DEFAULT_STYLES.rowHeader),
    heroCategory: this.resolveStyle(null, DEFAULT_STYLES.heroCategory),
    category: this.resolveStyle(null, DEFAULT_STYLES.category),
    heroMeta: this.resolveStyle(null, DEFAULT_STYLES.heroMeta),
    meta: this.resolveStyle(null, DEFAULT_STYLES.meta),
    kicker: this.resolveStyle(null, DEFAULT_STYLES.kicker),
    author: this.resolveStyle(null, DEFAULT_STYLES.author),
    date: this.resolveStyle(null, DEFAULT_STYLES.date),
    views: this.resolveStyle(null, DEFAULT_STYLES.views),
    bumbi: this.resolveStyle(null, DEFAULT_STYLES.bumbi),
    heroBumbi: this.resolveStyle(null, DEFAULT_STYLES.heroBumbi),
    content: this.resolveStyle(null, DEFAULT_STYLES.content),
  };

  draftBackgroundColor = '';
  draftBackgroundSwatch = DEFAULT_BACKGROUND_SWATCH;

  constructor() {
    effect(() => {
      const current = this.typography();
      const defaults = this.defaultTypography();
      const next = {} as Record<TypographyRoleKey, DraftStyle>;
      for (const key of ROLE_ORDER) {
        next[key] = this.resolveStyle(current?.[key], defaults?.[key] ?? DEFAULT_STYLES[key]);
      }
      this.draft = next;
      const bg = this.backgroundColor()?.trim() ?? '';
      this.draftBackgroundColor = BACKGROUND_HEX.test(bg) ? bg : '';
      this.draftBackgroundSwatch = this.draftBackgroundColor || DEFAULT_BACKGROUND_SWATCH;
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closed.emit();
  }

  private roleSupported(key: TypographyRoleKey): boolean {
    switch (key) {
      case 'title':
        return this.supportsCardTitle();
      case 'heroTitle':
        return this.supportsHeroTitle();
      case 'smallTitle':
        return this.supportsSmallTitle();
      case 'rowHeader':
        return this.supportsRowHeader();
      case 'heroCategory':
        return this.supportsHeroCategory();
      case 'category':
        return this.supportsCategory();
      case 'heroMeta':
        return this.supportsHeroMeta();
      case 'meta':
        return this.supportsMeta();
      case 'kicker':
        return this.supportsKicker();
      case 'author':
        return this.supportsAuthor();
      case 'date':
        return this.supportsDate();
      case 'views':
        return this.supportsViews();
      case 'bumbi':
        return this.supportsBumbi();
      case 'heroBumbi':
        return this.supportsHeroBumbi();
      case 'content':
        return this.supportsContent();
    }
  }

  isCategoryRole(key: TypographyRoleKey): boolean {
    return CATEGORY_ROLE_KEYS.has(key);
  }

  private resolveStyle(
    style: ModuleTypographyStyle | null | undefined,
    defaults: ModuleTypographyStyle,
  ): DraftStyle {
    return {
      fontSize: style?.fontSize ?? defaults.fontSize ?? 20,
      fontWeight: style?.fontWeight ?? defaults.fontWeight ?? 700,
      color: style?.color ?? defaults.color ?? '#374151',
      display: style?.display ?? defaults.display ?? 'plain',
      textColor: style?.textColor ?? defaults.textColor ?? DEFAULT_PILL_TEXT_COLOR,
      backgroundColor: style?.backgroundColor ?? defaults.backgroundColor ?? DEFAULT_ROW_HEADER_BG,
      lineHeight: style?.lineHeight ?? defaults.lineHeight ?? DEFAULT_CONTENT_LINE_HEIGHT,
    };
  }

  previewStyle(key: TypographyRoleKey): string {
    const style = this.draft[key];
    if (this.isCategoryRole(key) && style.display === 'pill') {
      return [
        `font-size: ${style.fontSize}px`,
        `font-weight: ${style.fontWeight}`,
        `color: ${style.textColor}`,
        `background-color: ${style.color}`,
        'display: inline-block',
        'padding: 0.15em 0.55em',
        'border-radius: 0.25rem',
        'text-transform: uppercase',
        'letter-spacing: 0.04em',
        'line-height: 1.25',
      ].join('; ');
    }
    const parts = [
      `font-size: ${style.fontSize}px`,
      `font-weight: ${style.fontWeight}`,
      `color: ${style.color}`,
    ];
    if (key === 'rowHeader') {
      parts.push(`background-color: ${style.backgroundColor}`);
      parts.push('display: inline-block');
      parts.push('padding: 0.4em 0.75em');
      parts.push('text-transform: uppercase');
      parts.push('letter-spacing: 0.05em');
    }
    if (key === 'content') {
      parts.push(`line-height: ${style.lineHeight}`);
    }
    return parts.join('; ');
  }

  onBackgroundSwatchChange(value: string) {
    const match = BACKGROUND_HEX.exec(value.trim());
    if (!match) return;
    this.draftBackgroundColor = match[0];
    this.draftBackgroundSwatch = match[0];
  }

  onBackgroundHexChange(value: string) {
    const match = BACKGROUND_HEX.exec(value.trim());
    if (match) this.draftBackgroundSwatch = match[0];
  }

  clearBackground() {
    this.draftBackgroundColor = '';
    this.draftBackgroundSwatch = DEFAULT_BACKGROUND_SWATCH;
  }

  private cleanBackgroundColor(): string | null {
    if (!this.supportsBackground()) return null;
    const match = BACKGROUND_HEX.exec(this.draftBackgroundColor.trim());
    return match ? match[0] : null;
  }

  reset() {
    this.saved.emit({ typography: null, backgroundColor: null });
  }

  private cleanStyle(key: TypographyRoleKey): ModuleTypographyStyle {
    const raw = this.draft[key];
    const fallback = DEFAULT_STYLES[key];
    const fontSize = Math.max(
      10,
      Math.min(60, Math.floor(Number(raw.fontSize) || fallback.fontSize || 20)),
    );
    const fontWeight = Math.max(
      400,
      Math.min(900, Math.floor(Number(raw.fontWeight) || fallback.fontWeight || 700)),
    );
    const colorMatch = /^#[0-9a-fA-F]{6}$/.exec(raw.color.trim());
    const color = colorMatch ? colorMatch[0] : (fallback.color ?? '#374151');
    const result: ModuleTypographyStyle = { fontSize, fontWeight, color };

    if (this.isCategoryRole(key)) {
      const display: ModuleCategoryDisplay = raw.display === 'pill' ? 'pill' : 'plain';
      result.display = display;
      if (display === 'pill') {
        const textMatch = /^#[0-9a-fA-F]{6}$/.exec(raw.textColor.trim());
        result.textColor = textMatch ? textMatch[0] : DEFAULT_PILL_TEXT_COLOR;
      }
    }

    if (key === 'rowHeader') {
      const bgMatch = BACKGROUND_HEX.exec(raw.backgroundColor.trim());
      result.backgroundColor = bgMatch ? bgMatch[0] : DEFAULT_ROW_HEADER_BG;
    }

    if (key === 'content') {
      const lh = Number(raw.lineHeight);
      result.lineHeight = Number.isFinite(lh)
        ? Math.max(1, Math.min(3, Math.round(lh * 10) / 10))
        : (fallback.lineHeight ?? DEFAULT_CONTENT_LINE_HEIGHT);
    }

    return result;
  }

  save() {
    const result: ModuleTypography = {};
    for (const key of ROLE_ORDER) {
      if (!this.roleSupported(key)) continue;
      result[key] = this.cleanStyle(key);
    }
    this.saved.emit({
      typography: result,
      backgroundColor: this.cleanBackgroundColor(),
    });
  }
}
