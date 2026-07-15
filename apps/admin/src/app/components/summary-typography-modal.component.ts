import { Component, HostListener, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ModuleTypographyStyle } from '@civicpress/shared';

const FONT_WEIGHTS = [
  { value: 400, label: '400 — Normal' },
  { value: 500, label: '500 — Mediu' },
  { value: 600, label: '600 — Semibold' },
  { value: 700, label: '700 — Bold' },
  { value: 800, label: '800 — Extra bold' },
] as const;

const SUMMARY_DEFAULT_STYLE: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: '#4b5563',
};

type DraftStyle = { fontSize: number; fontWeight: number; color: string };

@Component({
  selector: 'cp-summary-typography-modal',
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
          <h2 class="text-base font-semibold text-gray-800">Tipografie rezumat</h2>
          <p class="text-xs text-gray-500 mt-1">{{ label() }}</p>
        </header>

        <div class="px-5 py-4 space-y-4 overflow-y-auto">
          <label class="block">
            <span class="text-sm font-medium text-gray-700">Mărime text (px)</span>
            <input
              type="number"
              min="10"
              max="60"
              [(ngModel)]="draft.fontSize"
              name="summaryFontSize"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </label>

          <label class="block">
            <span class="text-sm font-medium text-gray-700">Grosime</span>
            <select
              [(ngModel)]="draft.fontWeight"
              name="summaryFontWeight"
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
                [(ngModel)]="draft.color"
                name="summaryColorPicker"
                class="h-9 w-12 rounded border border-gray-300 p-0.5"
              />
              <input
                type="text"
                [(ngModel)]="draft.color"
                name="summaryColorHex"
                maxlength="7"
                pattern="^#[0-9a-fA-F]{6}$"
                class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </span>
          </label>

          <div class="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
            <p class="text-xs uppercase tracking-wide text-gray-500">Previzualizare</p>
            <p class="leading-relaxed news-summary-clamp" [attr.style]="previewStyle()">
              Exemplu rezumat articol (descriere scurtă) afișat sub titlu.
            </p>
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
export class SummaryTypographyModalComponent {
  readonly label = input.required<string>();
  readonly style = input<ModuleTypographyStyle | null>(null);
  readonly defaultStyle = input<ModuleTypographyStyle>(SUMMARY_DEFAULT_STYLE);

  readonly saved = output<ModuleTypographyStyle | null>();
  readonly closed = output<void>();

  readonly fontWeights = FONT_WEIGHTS;

  draft: DraftStyle = { ...SUMMARY_DEFAULT_STYLE };

  constructor() {
    effect(() => {
      const fallback = this.defaultStyle() ?? SUMMARY_DEFAULT_STYLE;
      const current = this.style();
      this.draft = {
        fontSize: current?.fontSize ?? fallback.fontSize ?? SUMMARY_DEFAULT_STYLE.fontSize!,
        fontWeight: current?.fontWeight ?? fallback.fontWeight ?? SUMMARY_DEFAULT_STYLE.fontWeight!,
        color: current?.color ?? fallback.color ?? SUMMARY_DEFAULT_STYLE.color!,
      };
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closed.emit();
  }

  previewStyle(): string {
    return `font-size: ${this.draft.fontSize}px; font-weight: ${this.draft.fontWeight}; color: ${this.draft.color};`;
  }

  private cleanStyle(): ModuleTypographyStyle {
    const fallback = this.defaultStyle() ?? SUMMARY_DEFAULT_STYLE;
    const fontSize = Math.max(
      10,
      Math.min(60, Math.floor(Number(this.draft.fontSize) || fallback.fontSize || 14)),
    );
    const fontWeight = Math.max(
      400,
      Math.min(800, Math.floor(Number(this.draft.fontWeight) || fallback.fontWeight || 400)),
    );
    const colorMatch = /^#[0-9a-fA-F]{6}$/.exec(this.draft.color.trim());
    const color = colorMatch ? colorMatch[0] : (fallback.color ?? '#4b5563');
    return { fontSize, fontWeight, color };
  }

  reset() {
    this.saved.emit(null);
  }

  save() {
    this.saved.emit(this.cleanStyle());
  }
}
