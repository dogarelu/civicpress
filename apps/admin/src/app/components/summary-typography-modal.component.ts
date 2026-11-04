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
  { value: 900, label: '900 — Black' },
] as const;

const SUMMARY_DEFAULT_STYLE: ModuleTypographyStyle = {
  fontSize: 14,
  fontWeight: 400,
  color: '#4b5563',
};

const HERO_SUMMARY_DEFAULT_STYLE: ModuleTypographyStyle = {
  fontSize: 16,
  fontWeight: 400,
  color: '#4b5563',
};

type DraftStyle = { fontSize: number; fontWeight: number; color: string };

export type SummaryTypographySavePayload = {
  summaryTypography: ModuleTypographyStyle | null;
  heroSummaryTypography?: ModuleTypographyStyle | null;
};

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
          <h2 class="text-base font-semibold text-gray-800">{{ title() }}</h2>
          <p class="text-xs text-gray-500 mt-1">{{ label() }}</p>
        </header>

        <div class="px-5 py-4 space-y-5 overflow-y-auto">
          @if (supportsHeroSummary()) {
            <section class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-800">Rezumat articol mare</h3>
              <ng-container
                *ngTemplateOutlet="styleFields; context: { draft: heroDraft, prefix: 'hero' }"
              />
            </section>
            <section class="space-y-4 pt-4 border-t border-gray-100">
              <h3 class="text-sm font-semibold text-gray-800">Rezumat articole mici</h3>
              <ng-container
                *ngTemplateOutlet="styleFields; context: { draft: draft, prefix: 'small' }"
              />
            </section>
          } @else {
            <ng-container
              *ngTemplateOutlet="styleFields; context: { draft: draft, prefix: 'summary' }"
            />
          }

          <div class="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
            <p class="text-xs uppercase tracking-wide text-gray-500">Previzualizare</p>
            @if (supportsHeroSummary()) {
              <p class="leading-relaxed" [attr.style]="previewStyle(heroDraft)">
                Exemplu rezumat articol mare.
              </p>
              <p class="leading-relaxed" [attr.style]="previewStyle(draft)">
                Exemplu rezumat articole mici.
              </p>
            } @else if (previewMode() === 'bumbi') {
              <ul class="list-disc pl-5 space-y-0 leading-snug" [attr.style]="previewStyle(draft)">
                <li>Primul bumb din subtitlu</li>
                <li>Al doilea bumb, opțional cu link</li>
              </ul>
            } @else if (previewMode() === 'kicker') {
              <p class="italic leading-snug" [attr.style]="previewStyle(draft)">
                Exemplu supratitlu articol
              </p>
            } @else if (previewMode() === 'caption') {
              <p class="leading-snug" [attr.style]="previewStyle(draft)">
                Exemplu explicație foto sub poză
              </p>
            } @else {
              <p class="leading-relaxed news-summary-clamp" [attr.style]="previewStyle(draft)">
                Exemplu rezumat articol (descriere scurtă) afișat sub titlu.
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

    <ng-template #styleFields let-draft="draft" let-prefix="prefix">
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Mărime text (px)</span>
        <input
          type="number"
          min="10"
          max="60"
          [(ngModel)]="draft.fontSize"
          [name]="prefix + 'FontSize'"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </label>

      <label class="block">
        <span class="text-sm font-medium text-gray-700">Grosime</span>
        <select
          [(ngModel)]="draft.fontWeight"
          [name]="prefix + 'FontWeight'"
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
            [name]="prefix + 'ColorPicker'"
            class="h-9 w-12 rounded border border-gray-300 p-0.5"
          />
          <input
            type="text"
            [(ngModel)]="draft.color"
            [name]="prefix + 'ColorHex'"
            maxlength="7"
            pattern="^#[0-9a-fA-F]{6}$"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </span>
      </label>
    </ng-template>
  `,
})
export class SummaryTypographyModalComponent {
  readonly label = input.required<string>();
  readonly title = input('Tipografie rezumat');
  /** Preview content: plain summary paragraph, bumbi list, or italic kicker. */
  readonly previewMode = input<'summary' | 'bumbi' | 'kicker' | 'caption'>('summary');
  readonly style = input<ModuleTypographyStyle | null>(null);
  readonly defaultStyle = input<ModuleTypographyStyle>(SUMMARY_DEFAULT_STYLE);
  readonly supportsHeroSummary = input<boolean>(false);
  readonly heroStyle = input<ModuleTypographyStyle | null>(null);
  readonly defaultHeroStyle = input<ModuleTypographyStyle>(HERO_SUMMARY_DEFAULT_STYLE);

  readonly saved = output<SummaryTypographySavePayload>();
  readonly closed = output<void>();

  readonly fontWeights = FONT_WEIGHTS;

  draft: DraftStyle = { ...(SUMMARY_DEFAULT_STYLE as DraftStyle) };
  heroDraft: DraftStyle = { ...(HERO_SUMMARY_DEFAULT_STYLE as DraftStyle) };

  constructor() {
    effect(() => {
      const fallback = this.defaultStyle() ?? SUMMARY_DEFAULT_STYLE;
      const current = this.style();
      this.draft = {
        fontSize: current?.fontSize ?? fallback.fontSize ?? SUMMARY_DEFAULT_STYLE.fontSize!,
        fontWeight: current?.fontWeight ?? fallback.fontWeight ?? SUMMARY_DEFAULT_STYLE.fontWeight!,
        color: current?.color ?? fallback.color ?? SUMMARY_DEFAULT_STYLE.color!,
      };

      const heroFallback = this.defaultHeroStyle() ?? HERO_SUMMARY_DEFAULT_STYLE;
      const heroCurrent = this.heroStyle();
      this.heroDraft = {
        fontSize:
          heroCurrent?.fontSize ?? heroFallback.fontSize ?? HERO_SUMMARY_DEFAULT_STYLE.fontSize!,
        fontWeight:
          heroCurrent?.fontWeight ??
          heroFallback.fontWeight ??
          HERO_SUMMARY_DEFAULT_STYLE.fontWeight!,
        color: heroCurrent?.color ?? heroFallback.color ?? HERO_SUMMARY_DEFAULT_STYLE.color!,
      };
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closed.emit();
  }

  previewStyle(draft: DraftStyle): string {
    return `font-size: ${draft.fontSize}px; font-weight: ${draft.fontWeight}; color: ${draft.color};`;
  }

  private cleanStyle(draft: DraftStyle, fallback: ModuleTypographyStyle): ModuleTypographyStyle {
    const fontSize = Math.max(
      10,
      Math.min(60, Math.floor(Number(draft.fontSize) || fallback.fontSize || 14)),
    );
    const fontWeight = Math.max(
      400,
      Math.min(900, Math.floor(Number(draft.fontWeight) || fallback.fontWeight || 400)),
    );
    const colorMatch = /^#[0-9a-fA-F]{6}$/.exec(draft.color.trim());
    const color = colorMatch ? colorMatch[0] : (fallback.color ?? '#4b5563');
    return { fontSize, fontWeight, color };
  }

  reset() {
    if (this.supportsHeroSummary()) {
      this.saved.emit({ summaryTypography: null, heroSummaryTypography: null });
      return;
    }
    this.saved.emit({ summaryTypography: null });
  }

  save() {
    const summaryTypography = this.cleanStyle(
      this.draft,
      this.defaultStyle() ?? SUMMARY_DEFAULT_STYLE,
    );
    if (!this.supportsHeroSummary()) {
      this.saved.emit({ summaryTypography });
      return;
    }
    this.saved.emit({
      summaryTypography,
      heroSummaryTypography: this.cleanStyle(
        this.heroDraft,
        this.defaultHeroStyle() ?? HERO_SUMMARY_DEFAULT_STYLE,
      ),
    });
  }
}
