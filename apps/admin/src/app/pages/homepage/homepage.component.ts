import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { PostPickerComponent, type PickedPost } from '../../components/post-picker.component';
import type { PostSummary } from '@civicpress/shared';

function toPickedPost(p: PostSummary | null | undefined): PickedPost | null {
  if (!p) return null;
  return { id: p.id, title: p.title };
}

@Component({
  selector: 'cp-homepage',
  standalone: true,
  imports: [CommonModule, PostPickerComponent],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-800">Pagina principală</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Configurează articolele afișate. Sloturile necompletate vor fi umplute automat cu cele
            mai recente articole.
          </p>
        </div>
        <div class="flex gap-3">
          <button
            type="button"
            (click)="reset()"
            [disabled]="saving()"
            class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Resetează
          </button>
          <button
            type="button"
            (click)="save()"
            [disabled]="saving()"
            class="px-4 py-2 text-sm bg-red-700 text-white rounded hover:bg-red-800 transition-colors disabled:opacity-50 font-medium"
          >
            {{ saving() ? 'Se salvează…' : 'Salvează' }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="text-center py-12 text-gray-400">Se încarcă…</div>
      } @else {
        <!-- Hero -->
        <section class="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
          <h2 class="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            Articol principal (Hero)
          </h2>
          <cp-post-picker
            label="Articolul principal afișat mare în pagină"
            [value]="hero()"
            (selected)="hero.set($event)"
          />
        </section>

        <!-- Grid -->
        <section class="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
          <h2 class="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            Grila de 4 articole (2×2)
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (slot of grid(); track $index; let i = $index) {
              <cp-post-picker
                [label]="'Articol ' + (i + 1)"
                [value]="slot"
                (selected)="setGrid(i, $event)"
              />
            }
          </div>
        </section>

        <!-- List -->
        <section class="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
          <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h2 class="text-sm font-semibold text-gray-700">
              Listă articole
              <span class="text-gray-400 font-normal">({{ list().length }} din min. 10)</span>
            </h2>
            <button
              type="button"
              (click)="addListSlot()"
              class="text-xs text-red-700 hover:text-red-800 font-medium transition-colors"
            >
              + Adaugă articol
            </button>
          </div>
          <div class="space-y-3">
            @for (slot of list(); track $index; let i = $index) {
              <div class="flex items-end gap-2">
                <div class="flex-1">
                  <cp-post-picker
                    [label]="'#' + (i + 1)"
                    [value]="slot"
                    (selected)="setList(i, $event)"
                  />
                </div>
                <button
                  type="button"
                  (click)="removeListSlot(i)"
                  class="flex-shrink-0 mb-0.5 text-gray-300 hover:text-red-600 transition-colors text-xl leading-none pb-1"
                  aria-label="Elimină"
                >
                  ×
                </button>
              </div>
            }
            @if (list().length === 0) {
              <p class="text-sm text-gray-400 text-center py-4">
                Niciun articol adăugat. Se vor afișa automat cele mai recente 10 articole.
              </p>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class HomepageComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);

  hero = signal<PickedPost | null>(null);
  grid = signal<(PickedPost | null)[]>([null, null, null, null]);
  list = signal<(PickedPost | null)[]>([]);

  ngOnInit() {
    this.api.getHomepageConfig().subscribe({
      next: (config) => {
        this.hero.set(toPickedPost(config.hero));
        this.grid.set(config.grid.map(toPickedPost));
        this.list.set(config.list.map(toPickedPost));
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Eroare la încărcarea configurației.');
        this.loading.set(false);
      },
    });
  }

  setGrid(index: number, post: PickedPost | null) {
    this.grid.update((arr) => {
      const next = [...arr];
      next[index] = post;
      return next;
    });
  }

  setList(index: number, post: PickedPost | null) {
    this.list.update((arr) => {
      const next = [...arr];
      next[index] = post;
      return next;
    });
  }

  addListSlot() {
    this.list.update((arr) => [...arr, null]);
  }

  removeListSlot(index: number) {
    this.list.update((arr) => arr.filter((_, i) => i !== index));
  }

  save() {
    this.saving.set(true);
    const payload = {
      hero: this.hero()?.id ?? null,
      grid: this.grid().map((p) => p?.id ?? null),
      list: this.list().map((p) => p?.id ?? null),
    };
    this.api.saveHomepageConfig(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Configurație salvată cu succes.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Eroare la salvare. Încearcă din nou.');
      },
    });
  }

  reset() {
    this.hero.set(null);
    this.grid.set([null, null, null, null]);
    this.list.set([]);
    this.save();
  }
}
