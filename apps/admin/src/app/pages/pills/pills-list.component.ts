import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import type { AdminPill, PillCorner } from '@civicpress/shared';

interface EditState {
  text: string;
  color: string;
  textColor: string;
}

@Component({
  selector: 'cp-pills-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-800">Pill-uri imagine</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Badge-uri colorate afișate pe imaginile articolelor.
          </p>
        </div>
        <button
          type="button"
          (click)="startNew()"
          class="px-4 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium"
        >
          + Pill nou
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-12 text-gray-400">Se încarcă…</div>
      } @else {
        <section class="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 class="text-sm font-semibold text-gray-700 mb-1">Aspect global</h2>
          <p class="text-xs text-gray-400 mb-4">
            Colțul implicit (când un articol are un singur pill fără colț setat), mărimea textului
            și transparența se aplică pe tot site-ul. Colțul poate fi schimbat per articol din
            editor.
          </p>
          <div class="grid gap-4 sm:grid-cols-3">
            <label class="block">
              <span class="text-xs font-medium text-gray-600">Colț</span>
              <select
                [(ngModel)]="styleForm.pillCorner"
                name="pillCorner"
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="top-left">Stânga sus</option>
                <option value="top-right">Dreapta sus</option>
                <option value="bottom-left">Stânga jos</option>
                <option value="bottom-right">Dreapta jos</option>
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-medium text-gray-600">Mărime text (px)</span>
              <input
                type="number"
                min="8"
                max="24"
                [(ngModel)]="styleForm.pillFontSize"
                name="pillFontSize"
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
            <label class="block">
              <span class="text-xs font-medium text-gray-600">Transparență (0–100)</span>
              <input
                type="number"
                min="0"
                max="100"
                [(ngModel)]="styleForm.pillTransparency"
                name="pillTransparency"
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span class="mt-1 block text-xs text-gray-400">0 = opac, 100 = transparent</span>
            </label>
          </div>
          <div class="mt-4 flex justify-end">
            <button
              type="button"
              (click)="saveStyle()"
              [disabled]="savingStyle()"
              class="px-4 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 font-medium"
            >
              {{ savingStyle() ? 'Se salvează…' : 'Salvează aspectul' }}
            </button>
          </div>
        </section>

        @if (addingNew()) {
          <div class="bg-white border-2 border-red-200 rounded-xl p-5 mb-4 shadow-sm">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Pill nou</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Text *</label>
                <input
                  type="text"
                  [(ngModel)]="newForm.text"
                  maxlength="40"
                  placeholder="ex. Video, Breaking"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Culoare fundal *</label>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    [(ngModel)]="newForm.color"
                    class="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    [(ngModel)]="newForm.color"
                    maxlength="7"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Culoare text *</label>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    [(ngModel)]="newForm.textColor"
                    class="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    [(ngModel)]="newForm.textColor"
                    maxlength="7"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              @if (newForm.text.trim()) {
                <div class="sm:col-span-2">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold"
                    [style.backgroundColor]="newForm.color"
                    [style.color]="newForm.textColor"
                  >
                    {{ newForm.text.trim() }}
                  </span>
                </div>
              }
            </div>
            <div class="flex gap-2 justify-end">
              <button
                type="button"
                (click)="cancelNew()"
                class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                type="button"
                (click)="saveNew()"
                [disabled]="saving()"
                class="px-4 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 font-medium"
              >
                {{ saving() ? 'Se salvează…' : 'Creează pill' }}
              </button>
            </div>
          </div>
        }

        @if (pills().length === 0) {
          <div class="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
            Niciun pill definit încă.
          </div>
        } @else {
          <div class="space-y-4">
            @for (pill of pills(); track pill.id) {
              <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                @if (editingId() === pill.id) {
                  <div class="p-5">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Text *</label>
                        <input
                          type="text"
                          [(ngModel)]="editForm.text"
                          maxlength="40"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1"
                          >Culoare fundal *</label
                        >
                        <div class="flex items-center gap-2">
                          <input
                            type="color"
                            [(ngModel)]="editForm.color"
                            class="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            [(ngModel)]="editForm.color"
                            maxlength="7"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1"
                          >Culoare text *</label
                        >
                        <div class="flex items-center gap-2">
                          <input
                            type="color"
                            [(ngModel)]="editForm.textColor"
                            class="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            [(ngModel)]="editForm.textColor"
                            maxlength="7"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    </div>
                    <div class="flex gap-2 justify-end">
                      <button
                        type="button"
                        (click)="cancelEdit()"
                        class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Anulează
                      </button>
                      <button
                        type="button"
                        (click)="saveEdit(pill.id)"
                        [disabled]="saving()"
                        class="px-4 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 font-medium"
                      >
                        Salvează
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="p-5">
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex items-center gap-3 min-w-0">
                        <span
                          class="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold shrink-0"
                          [style.backgroundColor]="pill.color"
                          [style.color]="pill.textColor"
                        >
                          {{ pill.text }}
                        </span>
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-gray-800 truncate">{{ pill.text }}</p>
                          <p class="text-xs text-gray-500 font-mono">
                            fundal {{ pill.color }} · text {{ pill.textColor }}
                          </p>
                          <p class="text-xs text-gray-400 mt-0.5">
                            {{ pill.postCount }} articol{{ pill.postCount === 1 ? '' : 'e' }}
                          </p>
                        </div>
                      </div>
                      <div class="flex gap-2 shrink-0">
                        <button
                          type="button"
                          (click)="startEdit(pill)"
                          class="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Editează
                        </button>
                        <button
                          type="button"
                          (click)="deletePill(pill)"
                          [disabled]="pill.postCount > 0"
                          [title]="
                            pill.postCount > 0
                              ? 'Elimină pill-ul de pe toate articolele înainte de ștergere'
                              : 'Șterge pill'
                          "
                          class="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Șterge
                        </button>
                      </div>
                    </div>

                    @if (pill.posts.length > 0) {
                      <div class="mt-4 border-t border-gray-100 pt-4">
                        <p class="text-xs font-medium text-gray-600 mb-2">Articole cu acest pill</p>
                        <ul class="space-y-2">
                          @for (post of pill.posts; track post.id) {
                            <li
                              class="flex items-center justify-between gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2"
                            >
                              <div class="min-w-0">
                                <a
                                  [routerLink]="['/posts', post.id, 'edit']"
                                  class="text-gray-800 hover:text-red-700 truncate block font-medium"
                                >
                                  {{ post.title }}
                                </a>
                                <span class="text-xs text-gray-400">{{ post.status }}</span>
                              </div>
                              <button
                                type="button"
                                (click)="detach(pill.id, post.id)"
                                [disabled]="detaching() === post.id"
                                class="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 shrink-0"
                              >
                                Elimină
                              </button>
                            </li>
                          }
                        </ul>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class PillsListComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  savingStyle = signal(false);
  detaching = signal<string | null>(null);
  addingNew = signal(false);
  editingId = signal<string | null>(null);
  pills = signal<AdminPill[]>([]);

  newForm = { text: '', color: '#8A0808', textColor: '#ffffff' };
  editForm: EditState = { text: '', color: '#8A0808', textColor: '#ffffff' };
  styleForm = {
    pillCorner: 'top-right' as PillCorner,
    pillFontSize: 12,
    pillTransparency: 0,
  };

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    forkJoin({
      pills: this.api.getPills(),
      settings: this.api.getSettings(),
    }).subscribe({
      next: ({ pills, settings }) => {
        this.pills.set(pills);
        this.styleForm = {
          pillCorner: settings.pillCorner,
          pillFontSize: settings.pillFontSize,
          pillTransparency: settings.pillTransparency,
        };
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Eroare la încărcarea pill-urilor');
      },
    });
  }

  saveStyle() {
    const fontSize = Math.min(
      24,
      Math.max(8, Math.floor(Number(this.styleForm.pillFontSize) || 12)),
    );
    const transparency = Math.min(
      100,
      Math.max(0, Math.floor(Number(this.styleForm.pillTransparency) || 0)),
    );
    this.savingStyle.set(true);
    this.api
      .updateSettings({
        pillCorner: this.styleForm.pillCorner,
        pillFontSize: fontSize,
        pillTransparency: transparency,
      })
      .subscribe({
        next: (settings) => {
          this.styleForm = {
            pillCorner: settings.pillCorner,
            pillFontSize: settings.pillFontSize,
            pillTransparency: settings.pillTransparency,
          };
          this.savingStyle.set(false);
          this.toast.success('Aspect pill-uri salvat');
        },
        error: () => {
          this.savingStyle.set(false);
          this.toast.error('Salvarea aspectului a eșuat');
        },
      });
  }

  startNew() {
    this.addingNew.set(true);
    this.editingId.set(null);
    this.newForm = { text: '', color: '#8A0808', textColor: '#ffffff' };
  }

  cancelNew() {
    this.addingNew.set(false);
  }

  saveNew() {
    const text = this.newForm.text.trim();
    if (!text) {
      this.toast.error('Textul pill-ului este obligatoriu');
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(this.newForm.color)) {
      this.toast.error('Culoarea fundalului trebuie să fie în format #RRGGBB');
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(this.newForm.textColor)) {
      this.toast.error('Culoarea textului trebuie să fie în format #RRGGBB');
      return;
    }
    this.saving.set(true);
    this.api
      .createPill({ text, color: this.newForm.color, textColor: this.newForm.textColor })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.addingNew.set(false);
          this.toast.success('Pill creat');
          this.load();
        },
        error: (e) => {
          this.saving.set(false);
          this.toast.error(e?.error?.message || 'Eroare la creare');
        },
      });
  }

  startEdit(pill: AdminPill) {
    this.editingId.set(pill.id);
    this.addingNew.set(false);
    this.editForm = { text: pill.text, color: pill.color, textColor: pill.textColor };
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(id: string) {
    const text = this.editForm.text.trim();
    if (!text) {
      this.toast.error('Textul pill-ului este obligatoriu');
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(this.editForm.color)) {
      this.toast.error('Culoarea fundalului trebuie să fie în format #RRGGBB');
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(this.editForm.textColor)) {
      this.toast.error('Culoarea textului trebuie să fie în format #RRGGBB');
      return;
    }
    this.saving.set(true);
    this.api
      .updatePill(id, { text, color: this.editForm.color, textColor: this.editForm.textColor })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editingId.set(null);
          this.toast.success('Pill actualizat');
          this.load();
        },
        error: (e) => {
          this.saving.set(false);
          this.toast.error(e?.error?.message || 'Eroare la salvare');
        },
      });
  }

  deletePill(pill: AdminPill) {
    if (pill.postCount > 0) return;
    if (!confirm(`Ștergi pill-ul „${pill.text}"?`)) return;
    this.api.deletePill(pill.id).subscribe({
      next: () => {
        this.toast.success('Pill șters');
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message || 'Eroare la ștergere'),
    });
  }

  detach(pillId: string, postId: string) {
    this.detaching.set(postId);
    this.api.detachPillFromPost(pillId, postId).subscribe({
      next: () => {
        this.detaching.set(null);
        this.toast.success('Pill eliminat de pe articol');
        this.load();
      },
      error: (e) => {
        this.detaching.set(null);
        this.toast.error(e?.error?.message || 'Eroare la eliminare');
      },
    });
  }
}
