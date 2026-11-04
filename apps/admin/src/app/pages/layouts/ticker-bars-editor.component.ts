import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TICKER_ALIGN_OPTIONS,
  TICKER_BAR_KIND_OPTIONS,
  TICKER_BAR_SLOT_LABELS,
  TICKER_BAR_SLOTS,
  TICKER_CUSTOM_ITEMS_MAX,
  TICKER_FONT_WEIGHTS,
  TICKER_MOTION_OPTIONS,
  TICKER_SCROLL_FROM_OPTIONS,
  TICKER_SOURCE_OPTIONS,
  createTickerBar,
  createTickerCustomItem,
  defaultBarTitle,
  defaultTickerBarTitle,
  isOptionalTickerSlot,
  normalizeTickerBars,
  seedMenuEntriesFromFlags,
  type AdminCategory,
  type TickerBarConfig,
  type TickerBarKind,
  type TickerBarSlot,
  type TickerBarSource,
  type TickerMenuEntry,
} from '@civicpress/shared';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'cp-ticker-bars-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-gray-700">Benzi de sus</h2>
        <p class="text-xs text-gray-400 mt-1 max-w-2xl">
          Două linii stau mereu lângă siglă. Opțional poți activa o bandă deasupra și una dedesubt.
          Fiecare bandă poate fi ticker (știri / texte) sau meniu (categorii, culori, font).
          Căutarea și rețelele sociale se afișează pe benzile bifate — doar pe desktop.
        </p>
      </div>

      @if (loading()) {
        <p class="text-sm text-gray-400">Se încarcă…</p>
      } @else {
        <div class="space-y-4">
          @for (slot of slots; track slot) {
            @if (barBySlot(slot); as bar) {
              <article class="rounded-lg border border-gray-200 overflow-hidden">
                <div
                  class="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200"
                >
                  <span class="text-sm font-medium text-gray-800">{{ slotLabels[slot] }}</span>
                  <span class="text-xs text-gray-400 hidden sm:inline">
                    {{ bar.kind === 'menu' ? 'Meniu' : sourceLabel(bar.source) }}
                  </span>
                  @if (isOptional(slot)) {
                    <label class="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        [ngModel]="bar.enabled"
                        (ngModelChange)="patchBar(slot, { enabled: $event })"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Activă
                    </label>
                  } @else {
                    <span class="ml-auto text-xs text-gray-400">Obligatorie</span>
                  }
                </div>

                <div
                  class="px-4 py-2 flex items-center gap-3"
                  [style.background-color]="bar.bgColor"
                  [style.color]="bar.textColor"
                >
                  @if (bar.kind === 'ticker') {
                    <span
                      class="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-1"
                      [style.background-color]="bar.titleBgColor"
                      [style.color]="bar.titleTextColor"
                    >
                      {{ bar.title || 'Titlu' }}
                    </span>
                    <span
                      class="min-w-0 flex-1 truncate"
                      [style.text-align]="bar.textAlign"
                      [style.font-size.px]="bar.fontSize"
                      [style.font-weight]="bar.fontWeight"
                    >
                      {{ previewText(bar) }}
                    </span>
                  } @else {
                    <span
                      class="min-w-0 flex-1 truncate uppercase tracking-wide"
                      [style.text-align]="bar.textAlign"
                      [style.font-size.px]="bar.fontSize"
                      [style.font-weight]="bar.fontWeight"
                    >
                      {{ previewText(bar) }}
                    </span>
                  }
                </div>

                <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="sm:col-span-2">
                    <p class="text-xs font-medium text-gray-600 mb-2">Tip bandă</p>
                    <div class="flex flex-wrap gap-3">
                      @for (opt of kindOptions; track opt.value) {
                        <label class="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="bar-kind-{{ bar.id }}"
                            [checked]="bar.kind === opt.value"
                            (change)="setKind(slot, opt.value)"
                            class="text-red-700 focus:ring-red-500"
                          />
                          {{ opt.label }}
                        </label>
                      }
                    </div>
                  </div>

                  <label class="block sm:col-span-2">
                    <span class="text-xs font-medium text-gray-600">
                      {{ bar.kind === 'menu' ? 'Nume intern' : 'Titlul benzii' }}
                    </span>
                    <input
                      type="text"
                      [ngModel]="bar.title"
                      (ngModelChange)="patchBar(slot, { title: $event })"
                      maxlength="80"
                      class="mt-1 w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </label>

                  @if (bar.kind === 'ticker') {
                    <label class="block">
                      <span class="text-xs font-medium text-gray-600">Fundal titlu</span>
                      <span class="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          [ngModel]="bar.titleBgColor"
                          (ngModelChange)="patchBar(slot, { titleBgColor: $event })"
                          class="h-9 w-12 rounded border border-gray-300 p-0.5"
                        />
                        <input
                          type="text"
                          [ngModel]="bar.titleBgColor"
                          (ngModelChange)="patchBar(slot, { titleBgColor: $event })"
                          class="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm uppercase"
                        />
                      </span>
                    </label>

                    <label class="block">
                      <span class="text-xs font-medium text-gray-600">Culoare text titlu</span>
                      <span class="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          [ngModel]="bar.titleTextColor"
                          (ngModelChange)="patchBar(slot, { titleTextColor: $event })"
                          class="h-9 w-12 rounded border border-gray-300 p-0.5"
                        />
                        <input
                          type="text"
                          [ngModel]="bar.titleTextColor"
                          (ngModelChange)="patchBar(slot, { titleTextColor: $event })"
                          class="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm uppercase"
                        />
                      </span>
                    </label>
                  }

                  <label class="block">
                    <span class="text-xs font-medium text-gray-600">Culoare bandă</span>
                    <span class="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        [ngModel]="bar.bgColor"
                        (ngModelChange)="patchBar(slot, { bgColor: $event })"
                        class="h-9 w-12 rounded border border-gray-300 p-0.5"
                      />
                      <input
                        type="text"
                        [ngModel]="bar.bgColor"
                        (ngModelChange)="patchBar(slot, { bgColor: $event })"
                        class="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm uppercase"
                      />
                    </span>
                  </label>

                  <label class="block">
                    <span class="text-xs font-medium text-gray-600">Culoare font</span>
                    <span class="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        [ngModel]="bar.textColor"
                        (ngModelChange)="patchBar(slot, { textColor: $event })"
                        class="h-9 w-12 rounded border border-gray-300 p-0.5"
                      />
                      <input
                        type="text"
                        [ngModel]="bar.textColor"
                        (ngModelChange)="patchBar(slot, { textColor: $event })"
                        class="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm uppercase"
                      />
                    </span>
                  </label>

                  <label class="block">
                    <span class="text-xs font-medium text-gray-600">Dimensiune font (px)</span>
                    <input
                      type="number"
                      min="11"
                      max="28"
                      [ngModel]="bar.fontSize"
                      (ngModelChange)="patchBar(slot, { fontSize: toInt($event, 15) })"
                      class="mt-1 w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </label>

                  <label class="block">
                    <span class="text-xs font-medium text-gray-600">Grosime font</span>
                    <select
                      [ngModel]="bar.fontWeight"
                      (ngModelChange)="patchBar(slot, { fontWeight: toInt($event, 600) })"
                      class="mt-1 w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      @for (w of fontWeights; track w.value) {
                        <option [ngValue]="w.value">{{ w.label }}</option>
                      }
                    </select>
                  </label>

                  <div class="sm:col-span-2">
                    <p class="text-xs font-medium text-gray-600 mb-2">Aliniere text</p>
                    <div class="flex flex-wrap gap-3">
                      @for (opt of alignOptions; track opt.value) {
                        <label class="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="ticker-align-{{ bar.id }}"
                            [checked]="bar.textAlign === opt.value"
                            (change)="patchBar(slot, { textAlign: opt.value })"
                            class="text-red-700 focus:ring-red-500"
                          />
                          {{ opt.label }}
                        </label>
                      }
                    </div>
                  </div>

                  <div class="sm:col-span-2 flex flex-wrap gap-4">
                    <label class="inline-flex items-center gap-1.5 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        [ngModel]="bar.showSearch"
                        (ngModelChange)="patchBar(slot, { showSearch: $event })"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Căutare
                    </label>
                    <label class="inline-flex items-center gap-1.5 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        [ngModel]="bar.showSocial"
                        (ngModelChange)="patchBar(slot, { showSocial: $event })"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Rețele sociale
                    </label>
                  </div>

                  @if (bar.kind === 'ticker') {
                    <div class="sm:col-span-2">
                      <p class="text-xs font-medium text-gray-600 mb-2">Conținut</p>
                      <div class="flex flex-wrap gap-3">
                        @for (opt of sourceOptions; track opt.value) {
                          <label class="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <input
                              type="radio"
                              name="ticker-source-{{ bar.id }}"
                              [checked]="bar.source === opt.value"
                              (change)="setSource(slot, opt.value)"
                              class="text-red-700 focus:ring-red-500"
                            />
                            {{ opt.label }}
                          </label>
                        }
                      </div>
                    </div>

                    @if (bar.source === 'category') {
                      <label class="block sm:col-span-2">
                        <span class="text-xs font-medium text-gray-600">Categorie</span>
                        <select
                          [ngModel]="bar.categoryId"
                          (ngModelChange)="patchBar(slot, { categoryId: $event || null })"
                          class="mt-1 w-full max-w-md px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option [ngValue]="null">Alege categoria</option>
                          @for (cat of topLevelCategories(); track cat.id) {
                            <option [ngValue]="cat.id">{{ cat.name }}</option>
                          }
                        </select>
                      </label>
                    }

                    @if (bar.source !== 'custom') {
                      <label class="block">
                        <span class="text-xs font-medium text-gray-600">Număr de știri</span>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          [ngModel]="bar.itemCount"
                          (ngModelChange)="patchBar(slot, { itemCount: toInt($event, 5) })"
                          class="mt-1 w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </label>
                    }

                    <div class="sm:col-span-2">
                      <p class="text-xs font-medium text-gray-600 mb-2">Derulare</p>
                      <div class="flex flex-wrap gap-3">
                        @for (opt of motionOptions; track opt.value) {
                          <label class="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <input
                              type="radio"
                              name="ticker-motion-{{ bar.id }}"
                              [checked]="bar.motion === opt.value"
                              (change)="patchBar(slot, { motion: opt.value })"
                              class="text-red-700 focus:ring-red-500"
                            />
                            {{ opt.label }}
                          </label>
                        }
                      </div>
                    </div>

                    <div>
                      <p class="text-xs font-medium text-gray-600 mb-2">Din ce parte derulează</p>
                      <div class="flex flex-wrap gap-3">
                        @for (opt of scrollFromOptions; track opt.value) {
                          <label class="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <input
                              type="radio"
                              name="ticker-from-{{ bar.id }}"
                              [checked]="bar.scrollFrom === opt.value"
                              (change)="patchBar(slot, { scrollFrom: opt.value })"
                              class="text-red-700 focus:ring-red-500"
                            />
                            {{ opt.label }}
                          </label>
                        }
                      </div>
                    </div>

                    @if (bar.motion === 'slide') {
                      <label class="block">
                        <span class="text-xs font-medium text-gray-600"
                          >Timp între derulări (secunde)</span
                        >
                        <input
                          type="number"
                          min="1"
                          max="30"
                          step="1"
                          [ngModel]="intervalSeconds(bar)"
                          (ngModelChange)="patchBar(slot, { intervalMs: clampInterval($event) })"
                          class="mt-1 w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </label>
                    } @else {
                      <label class="block">
                        <span class="text-xs font-medium text-gray-600">
                          Viteză derulare continuă ({{ bar.marqueeSpeed }} px/s)
                        </span>
                        <input
                          type="range"
                          min="20"
                          max="180"
                          step="5"
                          [ngModel]="bar.marqueeSpeed"
                          (ngModelChange)="patchBar(slot, { marqueeSpeed: toInt($event, 60) })"
                          class="mt-2 w-full accent-red-700"
                        />
                      </label>
                    }

                    @if (bar.source === 'custom') {
                      <div class="sm:col-span-2 space-y-2">
                        <p class="text-xs font-medium text-gray-600">Texte personalizate</p>
                        <p class="text-xs text-gray-400">
                          Aceste texte apar pe bandă, fără link către o știre.
                        </p>
                        @for (item of bar.customItems; track item.id; let j = $index) {
                          <div class="flex items-center gap-2">
                            <input
                              type="text"
                              [ngModel]="item.text"
                              (ngModelChange)="patchCustomText(slot, j, $event)"
                              maxlength="200"
                              class="flex-1 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                              placeholder="Text afișat pe bandă"
                            />
                            <button
                              type="button"
                              (click)="removeCustomItem(slot, j)"
                              class="text-xs text-red-700 hover:underline"
                            >
                              Șterge
                            </button>
                          </div>
                        }
                        <button
                          type="button"
                          (click)="addCustomItem(slot)"
                          [disabled]="bar.customItems.length >= maxCustomItems"
                          class="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          + Adaugă text
                        </button>
                      </div>
                    }
                  } @else {
                    <div class="sm:col-span-2 space-y-2">
                      <p class="text-xs font-medium text-gray-600">Categorii și subcategorii</p>
                      <p class="text-xs text-gray-400">
                        Alege ce apare pe această bandă. Ordinea se schimbă cu săgețile de pe
                        categoriile bifate.
                      </p>
                      <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
                        @for (cat of orderedPickerCategories(bar); track cat.id) {
                          <div class="rounded border border-gray-200 p-2">
                            <div class="flex items-center gap-2">
                              @if (isMenuParentSelected(bar, cat.id)) {
                                <div class="flex items-center gap-1">
                                  <button
                                    type="button"
                                    (click)="moveMenuEntry(slot, cat.id, -1)"
                                    class="px-1.5 py-0.5 text-xs border border-gray-300 rounded"
                                    title="Mută în sus"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    (click)="moveMenuEntry(slot, cat.id, 1)"
                                    class="px-1.5 py-0.5 text-xs border border-gray-300 rounded"
                                    title="Mută în jos"
                                  >
                                    ↓
                                  </button>
                                </div>
                              }
                              <label class="inline-flex items-center gap-2 text-sm text-gray-800">
                                <input
                                  type="checkbox"
                                  [checked]="isMenuParentSelected(bar, cat.id)"
                                  (change)="
                                    toggleMenuParent(slot, cat, $any($event.target).checked)
                                  "
                                  class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                />
                                {{ cat.name }}
                              </label>
                            </div>
                            @if (isMenuParentSelected(bar, cat.id) && childrenOf(cat.id).length) {
                              <div class="mt-2 ml-8 space-y-1">
                                @for (child of childrenOf(cat.id); track child.id) {
                                  <label class="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                      type="checkbox"
                                      [checked]="isMenuChildSelected(bar, cat.id, child.id)"
                                      (change)="
                                        toggleMenuChild(
                                          slot,
                                          cat.id,
                                          child.id,
                                          $any($event.target).checked
                                        )
                                      "
                                      class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                    />
                                    {{ child.name }}
                                  </label>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>

                    <label class="block">
                      <span class="text-xs font-medium text-gray-600"
                        >Număr maxim de categorii vizibile</span
                      >
                      <input
                        type="number"
                        min="1"
                        max="20"
                        [ngModel]="bar.headerMaxCategories"
                        (ngModelChange)="patchBar(slot, { headerMaxCategories: toInt($event, 6) })"
                        class="mt-1 w-32 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </label>

                    <label
                      class="inline-flex items-center gap-2 text-sm text-gray-700 sm:col-span-2"
                    >
                      <input
                        type="checkbox"
                        [ngModel]="bar.headerShowMoreDropdown"
                        (ngModelChange)="patchBar(slot, { headerShowMoreDropdown: $event })"
                        class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                      />
                      Afișează meniul „Mai multe”
                    </label>

                    @if (bar.headerShowMoreDropdown) {
                      <div class="sm:col-span-2">
                        <p class="text-xs font-medium text-gray-600">Categorii în „Mai multe”</p>
                        <p class="text-xs text-gray-400 mt-1">
                          Dacă nu selectezi nimic, apar automat categoriile care depășesc limita.
                        </p>
                        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          @for (entry of bar.menuEntries; track entry.categoryId) {
                            @if (categoryName(entry.categoryId); as name) {
                              <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  [checked]="bar.headerMoreCategoryIds.includes(entry.categoryId)"
                                  (change)="
                                    toggleMoreCategory(
                                      slot,
                                      entry.categoryId,
                                      $any($event.target).checked
                                    )
                                  "
                                  class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                                />
                                {{ name }}
                              </label>
                            }
                          }
                        </div>
                      </div>
                    }
                  }
                </div>
              </article>
            }
          }
        </div>
      }

      <div class="mt-5 flex justify-end">
        <button
          type="button"
          (click)="save()"
          [disabled]="saving() || loading()"
          class="px-4 py-2 text-sm bg-red-700 text-white rounded hover:bg-red-800 transition-colors disabled:opacity-50 font-medium"
        >
          {{ saving() ? 'Se salvează…' : 'Salvează benzile' }}
        </button>
      </div>
    </section>
  `,
})
export class TickerBarsEditorComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  readonly slots = TICKER_BAR_SLOTS;
  readonly slotLabels = TICKER_BAR_SLOT_LABELS;
  readonly kindOptions = TICKER_BAR_KIND_OPTIONS;
  readonly maxCustomItems = TICKER_CUSTOM_ITEMS_MAX;
  readonly fontWeights = TICKER_FONT_WEIGHTS;
  readonly alignOptions = TICKER_ALIGN_OPTIONS;
  readonly motionOptions = TICKER_MOTION_OPTIONS;
  readonly scrollFromOptions = TICKER_SCROLL_FROM_OPTIONS;
  readonly sourceOptions = TICKER_SOURCE_OPTIONS;
  readonly isOptional = isOptionalTickerSlot;

  loading = signal(true);
  saving = signal(false);
  bars = signal<TickerBarConfig[]>([]);
  categories = signal<AdminCategory[]>([]);

  ngOnInit() {
    this.api.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.seedEmptyMenus();
      },
      error: () => this.categories.set([]),
    });
    this.api.getTickerBars().subscribe({
      next: (data) => {
        this.bars.set(normalizeTickerBars(data.bars));
        this.seedEmptyMenus();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Nu s-au putut încărca benzile de sus.');
        this.loading.set(false);
      },
    });
  }

  barBySlot(slot: TickerBarSlot): TickerBarConfig | undefined {
    return this.bars().find((bar) => bar.slot === slot);
  }

  topLevelCategories(): AdminCategory[] {
    return this.categories()
      .filter((cat) => !cat.parentId)
      .sort((a, b) => a.menuOrder - b.menuOrder);
  }

  childrenOf(parentId: string): AdminCategory[] {
    return this.categories()
      .filter((cat) => cat.parentId === parentId)
      .sort((a, b) => a.menuOrder - b.menuOrder);
  }

  orderedPickerCategories(bar: TickerBarConfig): AdminCategory[] {
    const selected = bar.menuEntries
      .map((entry) => this.categories().find((cat) => cat.id === entry.categoryId))
      .filter((cat): cat is AdminCategory => !!cat);
    const selectedIds = new Set(selected.map((cat) => cat.id));
    const rest = this.topLevelCategories().filter((cat) => !selectedIds.has(cat.id));
    return [...selected, ...rest];
  }

  categoryName(id: string): string | null {
    return this.categories().find((cat) => cat.id === id)?.name ?? null;
  }

  sourceLabel(source: TickerBarSource): string {
    return this.sourceOptions.find((opt) => opt.value === source)?.label ?? source;
  }

  previewText(bar: TickerBarConfig): string {
    if (bar.kind === 'menu') {
      const count = bar.menuEntries.length;
      return count ? `${count} categorii în meniu` : 'Nicio categorie selectată';
    }
    if (bar.source === 'custom') {
      return bar.customItems.find((item) => item.text.trim())?.text || 'Exemplu text personalizat';
    }
    if (bar.source === 'category') {
      const name = this.categories().find((cat) => cat.id === bar.categoryId)?.name;
      return name ? `Știri din ${name}` : 'Alege o categorie';
    }
    return bar.source === 'newest' ? 'Exemplu știre recentă' : 'Exemplu titlu știre';
  }

  patchBar(slot: TickerBarSlot, patch: Partial<TickerBarConfig>) {
    this.bars.update((list) =>
      list.map((bar) =>
        bar.slot === slot ? createTickerBar({ ...bar, ...patch, id: bar.id, slot }) : bar,
      ),
    );
  }

  setKind(slot: TickerBarSlot, kind: TickerBarKind) {
    const bar = this.barBySlot(slot);
    if (!bar || bar.kind === kind) return;
    const keepTitle = bar.title.trim() && bar.title !== defaultBarTitle(bar.kind, bar.source);
    const menuEntries =
      kind === 'menu' && bar.menuEntries.length === 0
        ? seedMenuEntriesFromFlags(this.categories())
        : bar.menuEntries;
    this.patchBar(slot, {
      kind,
      title: keepTitle ? bar.title : defaultBarTitle(kind, bar.source),
      menuEntries,
      ...(kind === 'menu'
        ? { bgColor: '#FFFFFF', textColor: '#374151', fontSize: 14, fontWeight: 700 }
        : {}),
    });
  }

  setSource(slot: TickerBarSlot, source: TickerBarSource) {
    const bar = this.barBySlot(slot);
    if (!bar) return;
    const keepTitle = bar.title.trim() && bar.title !== defaultTickerBarTitle(bar.source);
    this.patchBar(slot, {
      source,
      title: keepTitle ? bar.title : defaultTickerBarTitle(source),
      categoryId: source === 'category' ? bar.categoryId : null,
    });
  }

  addCustomItem(slot: TickerBarSlot) {
    const bar = this.barBySlot(slot);
    if (!bar || bar.customItems.length >= this.maxCustomItems) return;
    this.patchBar(slot, { customItems: [...bar.customItems, createTickerCustomItem()] });
  }

  removeCustomItem(slot: TickerBarSlot, itemIndex: number) {
    const bar = this.barBySlot(slot);
    if (!bar) return;
    this.patchBar(slot, {
      customItems: bar.customItems.filter((_, i) => i !== itemIndex),
    });
  }

  patchCustomText(slot: TickerBarSlot, itemIndex: number, text: string) {
    const bar = this.barBySlot(slot);
    if (!bar) return;
    this.patchBar(slot, {
      customItems: bar.customItems.map((item, i) => (i === itemIndex ? { ...item, text } : item)),
    });
  }

  isMenuParentSelected(bar: TickerBarConfig, categoryId: string): boolean {
    return bar.menuEntries.some((entry) => entry.categoryId === categoryId);
  }

  isMenuChildSelected(bar: TickerBarConfig, categoryId: string, childId: string): boolean {
    return (
      bar.menuEntries
        .find((entry) => entry.categoryId === categoryId)
        ?.childIds.includes(childId) ?? false
    );
  }

  toggleMenuParent(slot: TickerBarSlot, cat: AdminCategory, checked: boolean) {
    const bar = this.barBySlot(slot);
    if (!bar) return;
    if (checked) {
      const entry: TickerMenuEntry = {
        categoryId: cat.id,
        childIds: this.childrenOf(cat.id).map((child) => child.id),
      };
      this.patchBar(slot, { menuEntries: [...bar.menuEntries, entry] });
      return;
    }
    this.patchBar(slot, {
      menuEntries: bar.menuEntries.filter((entry) => entry.categoryId !== cat.id),
      headerMoreCategoryIds: bar.headerMoreCategoryIds.filter((id) => id !== cat.id),
    });
  }

  toggleMenuChild(slot: TickerBarSlot, categoryId: string, childId: string, checked: boolean) {
    const bar = this.barBySlot(slot);
    if (!bar) return;
    this.patchBar(slot, {
      menuEntries: bar.menuEntries.map((entry) => {
        if (entry.categoryId !== categoryId) return entry;
        const childIds = checked
          ? [...entry.childIds, childId]
          : entry.childIds.filter((id) => id !== childId);
        return { ...entry, childIds };
      }),
    });
  }

  moveMenuEntry(slot: TickerBarSlot, categoryId: string, delta: number) {
    const bar = this.barBySlot(slot);
    if (!bar) return;
    const index = bar.menuEntries.findIndex((entry) => entry.categoryId === categoryId);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= bar.menuEntries.length) return;
    const copy = [...bar.menuEntries];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    this.patchBar(slot, { menuEntries: copy });
  }

  toggleMoreCategory(slot: TickerBarSlot, categoryId: string, checked: boolean) {
    const bar = this.barBySlot(slot);
    if (!bar) return;
    const next = new Set(bar.headerMoreCategoryIds);
    if (checked) next.add(categoryId);
    else next.delete(categoryId);
    this.patchBar(slot, { headerMoreCategoryIds: Array.from(next) });
  }

  toInt(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
  }

  intervalSeconds(bar: TickerBarConfig): number {
    return Math.round((bar.intervalMs || 5000) / 1000);
  }

  clampInterval(seconds: unknown): number {
    const n = this.toInt(seconds, 5);
    return Math.min(30000, Math.max(1000, n * 1000));
  }

  save() {
    const bars = normalizeTickerBars(
      this.bars().map((bar) =>
        createTickerBar({
          ...bar,
          title: bar.title.trim() || defaultBarTitle(bar.kind, bar.source),
          customItems: bar.customItems
            .map((item) => ({ ...item, text: item.text.trim() }))
            .filter((item) => item.text.length > 0),
        }),
      ),
    );

    this.saving.set(true);
    this.api.saveTickerBars(bars).subscribe({
      next: (data) => {
        this.bars.set(normalizeTickerBars(data.bars));
        this.seedEmptyMenus();
        this.saving.set(false);
        this.toast.success('Benzile de sus au fost salvate.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Salvarea benzilor a eșuat.');
      },
    });
  }

  private seedEmptyMenus() {
    const cats = this.categories();
    if (!cats.length || !this.bars().length) return;
    this.bars.update((list) =>
      list.map((bar) =>
        bar.kind === 'menu' && bar.menuEntries.length === 0
          ? createTickerBar({ ...bar, menuEntries: seedMenuEntriesFromFlags(cats) })
          : bar,
      ),
    );
  }
}
