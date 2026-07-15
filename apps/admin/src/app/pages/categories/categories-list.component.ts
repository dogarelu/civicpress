import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import type { AdminCategory } from '@civicpress/shared';

interface EditState {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  showInMenu: boolean;
}

@Component({
  selector: 'cp-categories-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  styles: [
    `
      .drag-placeholder {
        background: #f9fafb;
        border: 2px dashed #e5e7eb;
        height: 56px;
      }
      .cdk-drag-preview {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        opacity: 0.95;
      }
      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
      .cdk-drop-list-dragging .cat-row:not(.cdk-drag-placeholder) {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-800">Categorii</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Trage pentru a reordona categoriile și subcategoriile.
          </p>
        </div>
        <button
          type="button"
          (click)="startNew()"
          class="px-4 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium"
        >
          + Categorie nouă
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-12 text-gray-400">Se încarcă…</div>
      } @else {
        <!-- New category inline form -->
        @if (addingNew()) {
          <div class="bg-white border-2 border-red-200 rounded-xl p-5 mb-4 shadow-sm">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Categorie nouă</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Nume *</label>
                <input
                  type="text"
                  [(ngModel)]="newForm.name"
                  placeholder="ex. Local"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  [(ngModel)]="newForm.slug"
                  placeholder="auto-generat din nume"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1"
                  >Categorie părinte</label
                >
                <select
                  [(ngModel)]="newForm.parentId"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">— fără (categorie principală) —</option>
                  @for (parent of parentOptions(); track parent.id) {
                    <option [value]="parent.id">{{ parent.name }}</option>
                  }
                </select>
              </div>
              <div class="flex items-center gap-3 sm:pt-6">
                <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" [(ngModel)]="newForm.showInMenu" class="rounded" />
                  Afișează în meniu
                </label>
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-600 mb-1">Descriere</label>
                <textarea
                  [(ngModel)]="newForm.description"
                  rows="2"
                  placeholder="Opțional"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none resize-none"
                ></textarea>
              </div>
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
                {{ saving() ? 'Se salvează…' : 'Creează categoria' }}
              </button>
            </div>
          </div>
        }

        <!-- Category list -->
        <div
          cdkDropList
          [cdkDropListData]="categories()"
          (cdkDropListDropped)="onDrop($event)"
          class="space-y-2"
        >
          @for (cat of categories(); track cat.id) {
            <div
              cdkDrag
              class="cat-row bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              [class.ml-8]="!!cat.parentId"
            >
              <!-- Drag placeholder -->
              <div *cdkDragPlaceholder class="drag-placeholder rounded-xl"></div>

              @if (editingId() === cat.id) {
                <!-- Edit form expanded -->
                <div class="p-5">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">Nume *</label>
                      <input
                        type="text"
                        [(ngModel)]="editForm.name"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">Slug (URL)</label>
                      <input
                        type="text"
                        [(ngModel)]="editForm.slug"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1"
                        >Categorie părinte</label
                      >
                      <select
                        [(ngModel)]="editForm.parentId"
                        [disabled]="editingCategoryHasChildren()"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        <option value="">— fără (categorie principală) —</option>
                        @for (parent of parentOptions(cat.id); track parent.id) {
                          <option [value]="parent.id">{{ parent.name }}</option>
                        }
                      </select>
                      @if (editingCategoryHasChildren()) {
                        <p class="mt-1 text-xs text-amber-700">
                          O categorie cu subcategorii nu poate deveni subcategorie.
                        </p>
                      }
                    </div>
                    <div class="flex items-center gap-3 sm:pt-6">
                      <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input type="checkbox" [(ngModel)]="editForm.showInMenu" class="rounded" />
                        Afișează în meniu
                      </label>
                    </div>
                    <div class="sm:col-span-2">
                      <label class="block text-xs font-medium text-gray-600 mb-1">Descriere</label>
                      <textarea
                        [(ngModel)]="editForm.description"
                        rows="2"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none resize-none"
                      ></textarea>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <button
                      type="button"
                      (click)="promptDelete(cat)"
                      class="text-xs text-red-600 hover:text-red-800 transition-colors"
                    >
                      Șterge categoria
                    </button>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        (click)="cancelEdit()"
                        class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Anulează
                      </button>
                      <button
                        type="button"
                        (click)="saveEdit(cat.id)"
                        [disabled]="saving()"
                        class="px-4 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 font-medium"
                      >
                        {{ saving() ? 'Se salvează…' : 'Salvează' }}
                      </button>
                    </div>
                  </div>
                </div>
              } @else {
                <!-- Row (collapsed) -->
                <div class="flex items-center gap-3 px-4 py-3">
                  <!-- Drag handle -->
                  <div
                    cdkDragHandle
                    class="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
                    title="Trage pentru reordonare"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="1.5" />
                      <circle cx="15" cy="5" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="19" r="1.5" />
                      <circle cx="15" cy="19" r="1.5" />
                    </svg>
                  </div>

                  <!-- Name + slug -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800 truncate">
                      @if (cat.parentId) {
                        <span class="text-gray-400 mr-1">—</span>
                      }
                      {{ cat.name }}
                    </p>
                    <p class="text-xs text-gray-400 font-mono truncate">{{ cat.slug }}</p>
                  </div>

                  <!-- Post count -->
                  <span class="flex-shrink-0 text-xs text-gray-400 tabular-nums">
                    {{ cat.postCount }} art.
                  </span>

                  <!-- Menu badge -->
                  <span
                    class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
                    [class.bg-green-100]="cat.showInMenu"
                    [class.text-green-700]="cat.showInMenu"
                    [class.bg-gray-100]="!cat.showInMenu"
                    [class.text-gray-400]="!cat.showInMenu"
                    >{{ cat.showInMenu ? 'Meniu' : 'Ascuns' }}</span
                  >
                  @if (cat.parentId && parentName(cat.parentId); as pName) {
                    <span
                      class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"
                    >
                      Subcategorie: {{ pName }}
                    </span>
                  }

                  <!-- Edit button -->
                  <button
                    type="button"
                    (click)="startEdit(cat)"
                    class="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded"
                    title="Editează"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>

                  <!-- Delete button -->
                  <button
                    type="button"
                    (click)="promptDelete(cat)"
                    class="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-600 transition-colors rounded"
                    title="Șterge"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>
              }
            </div>
          }

          @if (categories().length === 0) {
            <p class="text-sm text-gray-400 text-center py-12">Nicio categorie creată încă.</p>
          }
        </div>
      }
    </div>

    <!-- Delete confirm modal -->
    @if (deleteTarget()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        (click)="cancelDelete()"
      >
        <div
          class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
          (click)="$event.stopPropagation()"
        >
          <h2 class="text-base font-semibold text-gray-800 mb-3">Șterge categoria</h2>

          @if (deleteTarget()!.postCount > 0) {
            <p class="text-sm text-gray-600 mb-4">
              Categoria <strong>{{ deleteTarget()!.name }}</strong> este folosită de
              <strong>{{ deleteTarget()!.postCount }}</strong>
              {{ deleteTarget()!.postCount === 1 ? 'articol' : 'articole' }}. Acestea vor pierde
              această categorie. Ești sigur că vrei să continui?
            </p>
          } @else {
            <p class="text-sm text-gray-600 mb-4">
              Ești sigur că vrei să ștergi categoria <strong>{{ deleteTarget()!.name }}</strong
              >? Această acțiune nu poate fi anulată.
            </p>
          }

          <div class="flex gap-3 justify-end">
            <button
              type="button"
              (click)="cancelDelete()"
              class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anulează
            </button>
            <button
              type="button"
              (click)="confirmDelete()"
              [disabled]="saving()"
              class="px-4 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 font-medium"
            >
              {{ saving() ? 'Se șterge…' : 'Șterge categoria' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CategoriesListComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  categories = signal<AdminCategory[]>([]);

  addingNew = signal(false);
  editingId = signal<string | null>(null);
  deleteTarget = signal<AdminCategory | null>(null);

  newForm: EditState = this.blankForm();
  editForm: EditState = this.blankForm();

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(this.sortForHierarchy(cats));
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Eroare la încărcarea categoriilor.');
        this.loading.set(false);
      },
    });
  }

  private blankForm(): EditState {
    return { name: '', slug: '', description: '', parentId: '', showInMenu: true };
  }

  private sortForHierarchy(cats: AdminCategory[]): AdminCategory[] {
    const byId = new Map(cats.map((cat) => [cat.id, cat]));
    const topLevel = cats.filter((cat) => !cat.parentId || !byId.has(cat.parentId));
    const childrenByParent = new Map<string, AdminCategory[]>();
    for (const cat of cats) {
      if (!cat.parentId || !byId.has(cat.parentId)) continue;
      const siblings = childrenByParent.get(cat.parentId) ?? [];
      siblings.push(cat);
      childrenByParent.set(cat.parentId, siblings);
    }
    const ordered: AdminCategory[] = [];
    for (const parent of topLevel) {
      ordered.push(parent);
      ordered.push(...(childrenByParent.get(parent.id) ?? []));
    }
    return ordered;
  }

  parentOptions(excludeId?: string): AdminCategory[] {
    return this.categories().filter((cat) => !cat.parentId && cat.id !== excludeId);
  }

  parentName(parentId: string): string | null {
    return this.categories().find((cat) => cat.id === parentId)?.name ?? null;
  }

  private categoryHasChildren(id: string): boolean {
    return this.categories().some((cat) => cat.parentId === id);
  }

  editingCategoryHasChildren(): boolean {
    const id = this.editingId();
    return !!id && this.categoryHasChildren(id);
  }

  // ─── New category ──────────────────────────────────────────────────────────

  startNew() {
    this.newForm = this.blankForm();
    this.addingNew.set(true);
    this.editingId.set(null);
  }

  cancelNew() {
    this.addingNew.set(false);
  }

  saveNew() {
    if (!this.newForm.name.trim()) {
      this.toast.error('Numele categoriei este obligatoriu.');
      return;
    }
    this.saving.set(true);
    this.api
      .createCategory({
        name: this.newForm.name.trim(),
        slug: this.newForm.slug.trim() || undefined,
        description: this.newForm.description.trim() || null,
        parentId: this.newForm.parentId || null,
        showInMenu: this.newForm.showInMenu,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.addingNew.set(false);
          this.toast.success('Categorie creată cu succes.');
          this.load();
        },
        error: (e) => {
          this.saving.set(false);
          this.toast.error(e?.error?.message || 'Eroare la creare.');
        },
      });
  }

  // ─── Edit ──────────────────────────────────────────────────────────────────

  startEdit(cat: AdminCategory) {
    this.editForm = {
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      parentId: cat.parentId ?? '',
      showInMenu: cat.showInMenu,
    };
    this.editingId.set(cat.id);
    this.addingNew.set(false);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(id: string) {
    if (!this.editForm.name.trim()) {
      this.toast.error('Numele categoriei este obligatoriu.');
      return;
    }
    if (this.editForm.parentId && this.categoryHasChildren(id)) {
      this.toast.error('Categoria are subcategorii și nu poate deveni subcategorie.');
      return;
    }
    this.saving.set(true);
    this.api
      .updateCategory(id, {
        name: this.editForm.name.trim(),
        slug: this.editForm.slug.trim() || undefined,
        description: this.editForm.description.trim() || null,
        parentId: this.editForm.parentId || null,
        showInMenu: this.editForm.showInMenu,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.editingId.set(null);
          this.toast.success('Categorie salvată.');
          this.categories.update((cats) => {
            const next = cats.map((c) => (c.id === id ? { ...c, ...updated } : c));
            return this.sortForHierarchy(next);
          });
        },
        error: (e) => {
          this.saving.set(false);
          this.toast.error(e?.error?.message || 'Eroare la salvare.');
        },
      });
  }

  // ─── Reorder ───────────────────────────────────────────────────────────────

  onDrop(event: CdkDragDrop<AdminCategory[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const cats = [...this.categories()];
    const source = cats[event.previousIndex];
    const target = cats[event.currentIndex];
    if ((source.parentId ?? null) !== (target.parentId ?? null)) {
      this.toast.error('Poți reordona doar între categorii de același nivel.');
      return;
    }
    moveItemInArray(cats, event.previousIndex, event.currentIndex);
    this.categories.set(cats);
    this.api.reorderCategories(cats.map((c) => c.id)).subscribe({
      error: () => this.toast.error('Eroare la reordonare.'),
    });
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  promptDelete(cat: AdminCategory) {
    this.deleteTarget.set(cat);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const cat = this.deleteTarget();
    if (!cat) return;
    this.saving.set(true);
    this.api.deleteCategory(cat.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleteTarget.set(null);
        this.toast.success(`Categoria "${cat.name}" a fost ștearsă.`);
        this.categories.update((cats) =>
          this.sortForHierarchy(cats.filter((c) => c.id !== cat.id)),
        );
        if (this.editingId() === cat.id) this.editingId.set(null);
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e?.error?.message || 'Eroare la ștergere.');
      },
    });
  }
}
