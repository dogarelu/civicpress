import { Component, HostListener, input, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ModuleTypography, ModuleTypographyStyle } from '@civicpress/shared';

const FONT_WEIGHTS = [
  { value: 400, label: '400 — Normal' },
  { value: 500, label: '500 — Mediu' },
  { value: 600, label: '600 — Semibold' },
  { value: 700, label: '700 — Bold' },
  { value: 800, label: '800 — Extra bold' },
] as const;

/** Text roles editable in the modal, in display order. */
type TypographyRoleKey =
  | 'title'
  | 'heroTitle'
  | 'smallTitle'
  | 'rowHeader'
  | 'category'
  | 'meta'
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
    label: 'Titlu hero (overlay pe imagine)',
    preview: 'Exemplu titlu hero',
  },
  smallTitle: {
    key: 'smallTitle',
    label: 'Titluri secundare (articole mici / carduri)',
    preview: 'Exemplu titlu articol secundar',
  },
  rowHeader: {
    key: 'rowHeader',
    label: 'Titlu rând (antet secțiune)',
    preview: 'EXEMPLU ANTET RÂND',
  },
  category: { key: 'category', label: 'Categorie (etichetă)', preview: 'CATEGORIE' },
  meta: {
    key: 'meta',
    label: 'Meta (dată / autor / vizualizări)',
    preview: '20 iun. 2026 • Autor • 123',
  },
  content: {
    key: 'content',
    label: 'Conținut (text articol)',
    preview: 'Exemplu text de conținut al articolului.',
  },
};

const DEFAULT_STYLES: Record<TypographyRoleKey, ModuleTypographyStyle> = {
  title: { fontSize: 20, fontWeight: 700, color: '#374151' },
  heroTitle: { fontSize: 28, fontWeight: 800, color: '#ffffff' },
  smallTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a1a' },
  rowHeader: { fontSize: 18, fontWeight: 800, color: '#1f2937' },
  category: { fontSize: 12, fontWeight: 700, color: '#4b5563' },
  meta: { fontSize: 12, fontWeight: 400, color: '#6b7280' },
  content: { fontSize: 17, fontWeight: 400, color: '#1f2937' },
};

const ROLE_ORDER: TypographyRoleKey[] = [
  'title',
  'heroTitle',
  'smallTitle',
  'rowHeader',
  'category',
  'meta',
  'content',
];

type DraftStyle = { fontSize: number; fontWeight: number; color: string };

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
          @for (section of visibleSections(); track section.key; let first = $first) {
            <section
              class="space-y-4"
              [class.pt-4]="!first"
              [class.border-t]="!first"
              [class.border-gray-100]="!first"
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

              <label class="block">
                <span class="text-sm font-medium text-gray-700">Culoare text</span>
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
  readonly supportsMeta = input<boolean>(false);
  readonly label = input.required<string>();
  readonly typography = input<ModuleTypography | null>(null);
  readonly defaultTypography = input<ModuleTypography | null>(null);

  readonly saved = output<ModuleTypography | null>();
  readonly closed = output<void>();

  readonly fontWeights = FONT_WEIGHTS;

  readonly visibleSections = computed<RoleSection[]>(() =>
    ROLE_ORDER.filter((key) => this.roleSupported(key)).map((key) => ROLE_SECTIONS[key]),
  );

  draft: Record<TypographyRoleKey, DraftStyle> = {
    title: { ...(DEFAULT_STYLES.title as DraftStyle) },
    heroTitle: { ...(DEFAULT_STYLES.heroTitle as DraftStyle) },
    smallTitle: { ...(DEFAULT_STYLES.smallTitle as DraftStyle) },
    rowHeader: { ...(DEFAULT_STYLES.rowHeader as DraftStyle) },
    category: { ...(DEFAULT_STYLES.category as DraftStyle) },
    meta: { ...(DEFAULT_STYLES.meta as DraftStyle) },
    content: { ...(DEFAULT_STYLES.content as DraftStyle) },
  };

  constructor() {
    effect(() => {
      const current = this.typography();
      const defaults = this.defaultTypography();
      const next = {} as Record<TypographyRoleKey, DraftStyle>;
      for (const key of ROLE_ORDER) {
        next[key] = this.resolveStyle(current?.[key], defaults?.[key] ?? DEFAULT_STYLES[key]);
      }
      this.draft = next;
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
      case 'category':
        return this.supportsCategory();
      case 'meta':
        return this.supportsMeta();
      case 'content':
        return this.supportsContent();
    }
  }

  private resolveStyle(
    style: ModuleTypographyStyle | null | undefined,
    defaults: ModuleTypographyStyle,
  ): DraftStyle {
    return {
      fontSize: style?.fontSize ?? defaults.fontSize ?? 20,
      fontWeight: style?.fontWeight ?? defaults.fontWeight ?? 700,
      color: style?.color ?? defaults.color ?? '#374151',
    };
  }

  previewStyle(key: TypographyRoleKey): string {
    const style = this.draft[key];
    return `font-size: ${style.fontSize}px; font-weight: ${style.fontWeight}; color: ${style.color};`;
  }

  reset() {
    this.saved.emit(null);
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
      Math.min(800, Math.floor(Number(raw.fontWeight) || fallback.fontWeight || 700)),
    );
    const colorMatch = /^#[0-9a-fA-F]{6}$/.exec(raw.color.trim());
    const color = colorMatch ? colorMatch[0] : (fallback.color ?? '#374151');
    return { fontSize, fontWeight, color };
  }

  save() {
    const result: ModuleTypography = {};
    for (const key of ROLE_ORDER) {
      if (!this.roleSupported(key)) continue;
      result[key] = this.cleanStyle(key);
    }
    this.saved.emit(result);
  }
}
