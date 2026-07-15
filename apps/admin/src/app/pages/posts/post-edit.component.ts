import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { AuthStore } from '../../services/auth.store';
import { ToastService } from '../../services/toast.service';
import { RichTextEditorComponent } from '../../components/rich-text-editor.component';
import { PostPickerComponent, type PickedPost } from '../../components/post-picker.component';
import type {
  Pill,
  AdminLayouts,
  ModuleType,
  ModulePlacementPage,
  PostTransition,
} from '@civicpress/shared';
import { isYoutubeUrl, toYoutubeEmbedUrl } from '@civicpress/shared';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface CategoryOption {
  id: string;
  label: string;
}

interface ModulePlacementOption {
  key: string;
  page: ModulePlacementPage;
  moduleId: string;
  rowId?: string;
  label: string;
}

interface EditableBulb {
  postId: string;
  title: string;
  labelOverride: string;
  pickedPost: PickedPost | null;
}

const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  hero: '1 articol principal',
  'hero-list': '1 principal + 3 mici',
  'hero-list-6': '1 principal + 6 mici',
  'hero-top-list': '1 principal sus + 3 dedesubt',
  'hero-slideshow': 'Principal pe poză (slideshow)',
  grid: '4 articole în grilă (2×2)',
  list: 'Listă de articole',
  'rows-3': 'Rânduri de 3',
  'rows-4': 'Rânduri de 4',
  'rows-4-sm': 'Rânduri de 4 mici',
  slideshow: 'Slideshow articole',
};

function moduleTypeLabel(type: ModuleType): string {
  return MODULE_TYPE_LABELS[type] ?? type;
}

function buildPlacementOptions(
  layouts: AdminLayouts,
  categoryId: string,
  page: ModulePlacementPage,
): ModulePlacementOption[] {
  const config = layouts[page];
  const pageLabel = page === 'home' ? 'Pagina principală' : 'Pagina categorie';
  const options: ModulePlacementOption[] = [];

  for (const mod of config.modules) {
    const modName = mod.options?.name?.trim() || moduleTypeLabel(mod.type);

    if (mod.type === 'rows-3' || mod.type === 'rows-4' || mod.type === 'rows-4-sm') {
      for (const row of mod.options?.rows ?? []) {
        if (
          page === 'home' &&
          row.kind === 'category' &&
          row.categoryId &&
          row.categoryId !== categoryId
        ) {
          continue;
        }
        const rowTitle =
          row.name?.trim() || (row.kind === 'category' ? 'Rând categorie' : 'Rând personalizat');
        options.push({
          key: `${page}:${mod.id}:${row.id}`,
          page,
          moduleId: mod.id,
          rowId: row.id,
          label: `${pageLabel} — ${modName} — ${rowTitle}`,
        });
      }
    } else if (page === 'home' || page === 'category') {
      options.push({
        key: `${page}:${mod.id}`,
        page,
        moduleId: mod.id,
        label: `${pageLabel} — ${modName}`,
      });
    }
  }

  return options;
}

@Component({
  selector: 'cp-post-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, RichTextEditorComponent, PostPickerComponent],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <div class="flex items-center gap-4 mb-6">
        <a routerLink="/posts" class="text-sm text-gray-400 hover:text-gray-600">← Articole</a>
        <h1 class="text-xl font-bold text-gray-800">
          {{ isNew() ? 'Articol nou' : 'Editare articol' }}
        </h1>
        @if (!isNew() && status()) {
          <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{{
            status()
          }}</span>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main form -->
        <div class="lg:col-span-2 space-y-5">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Titlu *</label>
              <input
                type="text"
                [(ngModel)]="title"
                name="title"
                placeholder="Titlul articolului"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
              <input
                type="text"
                [(ngModel)]="slug"
                name="slug"
                placeholder="auto-generat din titlu"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Data articolului (ora Romaniei)
              </label>
              <input
                type="date"
                [(ngModel)]="postDate"
                name="postDate"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Ora articolului (ora Romaniei)
              </label>
              <input
                type="time"
                [(ngModel)]="postTime"
                name="postTime"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Autor (text afișat)</label
              >
              @if (pseudonyms().length > 0) {
                <select
                  [ngModel]="selectedPseudonym"
                  (ngModelChange)="onPseudonymSelect($event)"
                  name="selectedPseudonym"
                  class="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">— Alege pseudonim —</option>
                  @for (p of pseudonyms(); track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              }
              <input
                type="text"
                [(ngModel)]="authorName"
                name="authorName"
                list="author-pseudonyms"
                placeholder="Nume autor afișat public"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              @if (pseudonyms().length > 0) {
                <datalist id="author-pseudonyms">
                  @for (p of pseudonyms(); track p) {
                    <option [value]="p"></option>
                  }
                </datalist>
              }
              <p class="mt-1 text-xs text-gray-400">
                Poți alege un pseudonim salvat sau introduce orice nume manual.
              </p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  [(ngModel)]="showAuthor"
                  name="showAuthor"
                  class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                />
                Afișează autor în module/listări
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  [(ngModel)]="showDate"
                  name="showDate"
                  class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                />
                Afișează data în module/listări
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  [(ngModel)]="showSummary"
                  name="showSummary"
                  class="rounded border-gray-300 text-red-700 focus:ring-red-500"
                />
                Afișează rezumat în module/listări
              </label>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rezumat</label>
              <textarea
                [(ngModel)]="excerpt"
                name="excerpt"
                rows="2"
                placeholder="Scurt rezumat al articolului"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              ></textarea>
            </div>

            <div class="border border-gray-100 rounded-lg p-4 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-gray-700">Bulbi</h3>
                  <p class="text-xs text-gray-400 mt-0.5">
                    Link-uri către alte articole, afișate sub imagine și deasupra conținutului.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="addBulb()"
                  class="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  + Adaugă bulbi
                </button>
              </div>

              @if (bulbi.length === 0) {
                <p class="text-xs text-gray-400">Niciun bulbi adăugat.</p>
              }

              @for (bulb of bulbi; track $index; let i = $index) {
                <div class="border border-gray-200 rounded-lg p-3 space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-medium text-gray-500">Bulbi {{ i + 1 }}</span>
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        (click)="moveBulb(i, -1)"
                        [disabled]="i === 0"
                        class="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40"
                        aria-label="Mută sus"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        (click)="moveBulb(i, 1)"
                        [disabled]="i === bulbi.length - 1"
                        class="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40"
                        aria-label="Mută jos"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        (click)="removeBulb(i)"
                        class="px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                        aria-label="Elimină bulbi"
                      >
                        Șterge
                      </button>
                    </div>
                  </div>

                  <cp-post-picker
                    label="Articol legat"
                    [value]="bulb.pickedPost"
                    (selected)="onBulbSelected(i, $event)"
                  />

                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">
                      Text afișat (opțional)
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="bulb.labelOverride"
                      [name]="'bulbLabel' + i"
                      [placeholder]="bulb.title || 'Titlul articolului selectat'"
                      class="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p class="mt-1 text-xs text-gray-400">
                      Dacă lași gol, se afișează titlul articolului legat.
                    </p>
                  </div>
                </div>
              }
            </div>

            <!-- Content section with editor toggle + docx import -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-sm font-medium text-gray-700">
                  Conținut
                  @if (htmlMode()) {
                    <span class="ml-1 text-xs font-normal text-gray-400"
                      >— HTML sau Markdown acceptat</span
                    >
                  }
                </label>
                <div class="flex items-center gap-3">
                  <!-- Docx import -->
                  <button
                    type="button"
                    (click)="docxInput.click()"
                    [disabled]="importingDocx()"
                    class="text-xs text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                  >
                    {{ importingDocx() ? 'Se importă...' : '↑ Import Word (.docx)' }}
                  </button>
                  <input
                    #docxInput
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    class="hidden"
                    (change)="onDocxChange($event)"
                  />
                  <!-- HTML toggle -->
                  <button
                    type="button"
                    (click)="toggleHtmlMode()"
                    class="text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded px-2 py-0.5"
                  >
                    {{ htmlMode() ? 'Editor vizual' : 'Editare HTML' }}
                  </button>
                </div>
              </div>

              @if (htmlMode()) {
                <textarea
                  [(ngModel)]="contentHtml"
                  name="contentHtml"
                  rows="16"
                  placeholder="<p>Conținutul articolului...</p>"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500 resize-y"
                ></textarea>
              } @else {
                <cp-rich-text-editor
                  #richEditor
                  [html]="contentHtml"
                  (htmlChange)="contentHtml = $event"
                />
              }
            </div>
          </div>

          <!-- SEO -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 class="text-sm font-semibold text-gray-700">SEO</h2>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Titlu SEO</label>
              <input
                type="text"
                [(ngModel)]="seoTitle"
                name="seoTitle"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Descriere SEO</label>
              <textarea
                [(ngModel)]="seoDescription"
                name="seoDescription"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-5">
          <!-- Publish panel -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Publicare</h2>
            <div class="space-y-2">
              <button
                (click)="save()"
                [disabled]="saving()"
                class="w-full py-2 rounded-lg text-sm font-medium text-white bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {{ saving() ? 'Se salvează...' : 'Salvează' }}
              </button>
              @if (canSubmit()) {
                <button
                  (click)="doTransition('submit')"
                  [disabled]="saving()"
                  class="w-full py-2 rounded-lg text-sm font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors disabled:opacity-50"
                >
                  Trimite spre revizie
                </button>
              }
              @if (canPublish()) {
                <button
                  (click)="doTransition('approve')"
                  [disabled]="saving()"
                  class="w-full py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style="background-color: #22c55e"
                >
                  Publică acum
                </button>
              }
              @if (canPublish() && status() === 'DRAFT') {
                <button
                  (click)="doTransition('publish')"
                  [disabled]="saving()"
                  class="w-full py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style="background-color: #22c55e"
                >
                  Publică direct
                </button>
              }
              @if (canArchive()) {
                <button
                  (click)="doTransition('archive')"
                  [disabled]="saving()"
                  class="w-full py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Arhivează
                </button>
              }
              @if (canRepublish()) {
                <button
                  (click)="doTransition('republish')"
                  [disabled]="saving()"
                  class="w-full py-2 rounded-lg text-sm font-medium text-white bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  Republică
                </button>
              }
              @if (canDelete()) {
                <button
                  (click)="deletePost()"
                  [disabled]="saving()"
                  class="w-full py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Șterge articolul
                </button>
              }
            </div>
          </div>

          <!-- Hero image -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-3">Imagine principală</h2>
            @if (heroUrl()) {
              <img
                [src]="heroUrl()"
                class="w-full rounded-lg object-cover mb-3"
                style="max-height: 160px;"
              />
            }
            <label class="block">
              <span class="text-xs text-gray-500 block mb-1">Încarcă imagine</span>
              <input
                type="file"
                accept="image/*"
                (change)="onFileChange($event)"
                class="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />
            </label>
            @if (uploading()) {
              <p class="text-xs text-gray-400 mt-1">Se încarcă...</p>
            }
          </div>

          <!-- Video -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-3">Video</h2>
            <div class="flex flex-col gap-2 mb-3">
              <label class="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="radio"
                  name="videoSource"
                  value="none"
                  [(ngModel)]="videoSource"
                  class="border-gray-300 text-red-700 focus:ring-red-500"
                />
                Fără video
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="radio"
                  name="videoSource"
                  value="youtube"
                  [(ngModel)]="videoSource"
                  class="border-gray-300 text-red-700 focus:ring-red-500"
                />
                YouTube
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="radio"
                  name="videoSource"
                  value="upload"
                  [(ngModel)]="videoSource"
                  class="border-gray-300 text-red-700 focus:ring-red-500"
                />
                Încarcă MP4
              </label>
            </div>

            @if (videoSource === 'youtube') {
              <label class="block">
                <span class="text-xs text-gray-500 block mb-1">Link YouTube (watch sau embed)</span>
                <input
                  type="url"
                  [(ngModel)]="videoUrl"
                  name="videoUrl"
                  placeholder="https://www.youtube.com/watch?v=..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </label>
            }

            @if (videoSource === 'upload') {
              <label class="block">
                <span class="text-xs text-gray-500 block mb-1">Fișier MP4 (max 100MB)</span>
                <input
                  type="file"
                  accept="video/mp4,.mp4"
                  (change)="onVideoFileChange($event)"
                  class="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
              </label>
              @if (uploadingVideo()) {
                <p class="text-xs text-gray-400 mt-1">Se încarcă videoclipul...</p>
              }
            }

            @if (videoUrl.trim() && videoSource !== 'none') {
              <p class="text-xs text-gray-500 mt-3 break-all">URL salvat: {{ videoUrl }}</p>
              @if (videoPreviewIsYoutube) {
                <div class="mt-3 aspect-video rounded overflow-hidden border border-gray-200">
                  <iframe
                    [src]="videoPreviewEmbedUrl"
                    class="w-full h-full"
                    frameborder="0"
                    allowfullscreen
                  ></iframe>
                </div>
              } @else {
                <video
                  [src]="videoUrl"
                  controls
                  class="mt-3 w-full rounded border border-gray-200"
                ></video>
              }
            }
          </div>

          <!-- Categories -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-3">Categorie principală</h2>
            <select
              [(ngModel)]="primaryCategoryId"
              name="primaryCategoryId"
              (ngModelChange)="onPrimaryCategoryChange()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
            >
              <option value="">— Alege categoria —</option>
              @for (cat of categoryOptions(); track cat.id) {
                <option [value]="cat.id">{{ cat.label }}</option>
              }
            </select>
          </div>

          <!-- Module placement -->
          @if (primaryCategoryId) {
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 class="text-sm font-semibold text-gray-700 mb-1">Plasare în module</h2>
              <p class="text-xs text-gray-400 mb-3">
                Opțional. La salvare, articolul este pus pe prima poziție în modulul ales (ultimul
                articol iese dacă modulul e plin).
              </p>
              <label class="block text-xs text-gray-500 mb-3">
                Pagină țintă
                <select
                  [(ngModel)]="placementPage"
                  name="placementPage"
                  (ngModelChange)="onPlacementPageChange()"
                  class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                >
                  <option value="">— Fără plasare —</option>
                  <option value="home">Pagina principală</option>
                  <option value="category">Pagina categorie</option>
                </select>
              </label>
              @if (placementPage) {
                <label class="block text-xs text-gray-500">
                  Modul
                  <select
                    [(ngModel)]="selectedPlacementKey"
                    name="selectedPlacementKey"
                    class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">— Alege modulul —</option>
                    @for (opt of filteredPlacementOptions(); track opt.key) {
                      <option [value]="opt.key">{{ opt.label }}</option>
                    }
                  </select>
                </label>
                @if (filteredPlacementOptions().length === 0) {
                  <p class="mt-2 text-xs text-amber-600">
                    Nu există module disponibile pentru această categorie pe pagina selectată.
                  </p>
                }
              }
            </div>
          }

          <!-- Image pill -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-3">Pill imagine</h2>
            <select
              [(ngModel)]="selectedPillId"
              name="selectedPillId"
              (ngModelChange)="onPillSelectChange()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none mb-3"
            >
              <option value="">— Fără pill —</option>
              @for (pill of pills(); track pill.id) {
                <option [value]="pill.id">{{ pill.text }} ({{ pill.color }})</option>
              }
            </select>
            @if (selectedPillId) {
              @for (pill of pills(); track pill.id) {
                @if (pill.id === selectedPillId) {
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold mb-3"
                    [style.backgroundColor]="pill.color"
                    [style.color]="pill.textColor"
                  >
                    {{ pill.text }}
                  </span>
                }
              }
            }
            <button
              type="button"
              (click)="showNewPill.set(!showNewPill())"
              class="text-xs text-red-700 hover:text-red-800 font-medium"
            >
              {{ showNewPill() ? 'Anulează pill nou' : '+ Pill nou' }}
            </button>
            @if (showNewPill()) {
              <div class="mt-3 pt-3 border-t border-gray-100 space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Text</label>
                  <input
                    type="text"
                    [(ngModel)]="newPillText"
                    name="newPillText"
                    maxlength="40"
                    placeholder="ex. Video"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Culoare fundal</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      [(ngModel)]="newPillColor"
                      name="newPillColor"
                      class="w-9 h-9 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      [(ngModel)]="newPillColor"
                      maxlength="7"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Culoare text</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      [(ngModel)]="newPillTextColor"
                      name="newPillTextColor"
                      class="w-9 h-9 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      [(ngModel)]="newPillTextColor"
                      maxlength="7"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none"
                    />
                  </div>
                </div>
                @if (newPillText.trim()) {
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold"
                    [style.backgroundColor]="newPillColor"
                    [style.color]="newPillTextColor"
                  >
                    {{ newPillText.trim() }}
                  </span>
                }
                <p class="text-xs text-gray-400">
                  Pill-ul va fi salvat global și atașat la acest articol la salvare.
                </p>
              </div>
            }
          </div>

          <!-- Revisions -->
          @if (!isNew() && revisions().length > 0) {
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 class="text-sm font-semibold text-gray-700 mb-3">Istoricul versiunilor</h2>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                @for (rev of revisions(); track rev['id']) {
                  <div class="text-xs text-gray-500 flex justify-between">
                    <span>{{ rev['message'] }}</span>
                    <span>{{ formatDate(rev['createdAt']) }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PostEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  protected auth = inject(AuthStore);
  private toast = inject(ToastService);

  @ViewChild('richEditor') richEditor?: RichTextEditorComponent;

  postId = signal<string | null>(null);
  isNew = computed(() => !this.postId());
  status = signal<string>('DRAFT');
  saving = signal(false);
  uploading = signal(false);
  uploadingVideo = signal(false);
  importingDocx = signal(false);
  htmlMode = signal(false);
  categories = signal<Category[]>([]);
  layouts = signal<AdminLayouts | null>(null);
  pills = signal<Pill[]>([]);
  pseudonyms = signal<string[]>([]);
  revisions = signal<unknown[]>([]);
  authorId = signal<string | null>(null);

  title = '';
  slug = '';
  postDate = '';
  postTime = '';
  excerpt = '';
  contentHtml = '';
  seoTitle = '';
  seoDescription = '';
  authorName = '';
  selectedPseudonym = '';
  showDate = true;
  showAuthor = true;
  showSummary = false;
  heroMediaId = signal<string | null>(null);
  heroUrl = signal<string | null>(null);
  primaryCategoryId = '';
  placementPage: ModulePlacementPage | '' = '';
  selectedPlacementKey = '';
  selectedPillId = '';
  showNewPill = signal(false);
  newPillText = '';
  newPillColor = '#8A0808';
  newPillTextColor = '#ffffff';
  videoSource: 'none' | 'youtube' | 'upload' = 'none';
  videoUrl = '';
  bulbi: EditableBulb[] = [];
  private publishedAtIso: string | null = null;

  get videoPreviewIsYoutube(): boolean {
    return !!this.videoUrl.trim() && isYoutubeUrl(this.videoUrl.trim());
  }

  get videoPreviewEmbedUrl() {
    return this.sanitizer.bypassSecurityTrustResourceUrl(toYoutubeEmbedUrl(this.videoUrl.trim()));
  }

  canSubmit = computed(() => {
    if (this.status() !== 'DRAFT') return false;
    const userId = this.auth.user()?.id;
    return this.auth.isEditor() || this.isNew() || (!!userId && this.authorId() === userId);
  });
  canPublish = computed(
    () => this.auth.isEditor() && (this.status() === 'IN_REVIEW' || this.status() === 'DRAFT'),
  );
  canArchive = computed(() => this.auth.isEditor() && this.status() === 'PUBLISHED');
  canRepublish = computed(() => this.auth.isEditor() && this.status() === 'ARCHIVED');
  canDelete = computed(() => {
    if (this.isNew()) return false;
    if (this.auth.isEditor()) return true;
    const userId = this.auth.user()?.id;
    return !!userId && this.authorId() === userId;
  });

  filteredPlacementOptions(): ModulePlacementOption[] {
    const layouts = this.layouts();
    if (!layouts || !this.placementPage || !this.primaryCategoryId) return [];
    return buildPlacementOptions(layouts, this.primaryCategoryId, this.placementPage);
  }

  categoryOptions(): CategoryOption[] {
    const categories = this.categories();
    const byId = new Map(categories.map((cat) => [cat.id, cat]));
    const topLevel = categories.filter((cat) => !cat.parentId || !byId.has(cat.parentId));
    const options: CategoryOption[] = [];
    for (const parent of topLevel) {
      options.push({ id: parent.id, label: parent.name });
      for (const child of categories) {
        if (child.parentId !== parent.id) continue;
        options.push({ id: child.id, label: `— ${child.name}` });
      }
    }
    return options;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.postId.set(id);

    this.api.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([]),
    });
    this.api.getPillsForPicker().subscribe({
      next: (pills) => this.pills.set(pills),
      error: () => this.pills.set([]),
    });
    this.api.getMe().subscribe({
      next: (me) => {
        this.pseudonyms.set(me.pseudonyms ?? []);
        this.syncSelectedPseudonym();
        if (me.role === 'EDITOR' || me.role === 'ADMIN') {
          this.api.getLayouts().subscribe({
            next: (layouts) => this.layouts.set(layouts),
            error: () => this.layouts.set(null),
          });
        } else {
          this.layouts.set(null);
        }
      },
      error: () => {
        this.pseudonyms.set([]);
        this.layouts.set(null);
      },
    });

    if (id) {
      this.api.getPost(id).subscribe((post) => {
        this.title = post['title'] as string;
        this.slug = post['slug'] as string;
        this.excerpt = (post['excerpt'] as string) ?? '';
        this.contentHtml = (post['contentHtml'] as string) ?? '';
        this.seoTitle = (post['seoTitle'] as string) ?? '';
        this.seoDescription = (post['seoDescription'] as string) ?? '';
        this.publishedAtIso = (post['publishedAt'] as string | null) ?? null;
        this.postDate = this.resolvePostDate(this.publishedAtIso);
        this.postTime = this.resolvePostTime(this.publishedAtIso);
        this.authorName =
          (post['authorName'] as string) ??
          (post['author'] as { displayName?: string } | null)?.displayName ??
          '';
        this.syncSelectedPseudonym();
        this.showDate = (post['showDate'] as boolean | undefined) ?? true;
        this.showAuthor = (post['showAuthor'] as boolean | undefined) ?? true;
        this.showSummary = (post['showSummary'] as boolean | undefined) ?? !!this.excerpt.trim();
        this.status.set(post['status'] as string);
        this.authorId.set((post['author'] as { id?: string } | null)?.id ?? null);
        const cats = (post['categories'] as Array<{ id: string }>) ?? [];
        this.primaryCategoryId = cats[0]?.id ?? '';
        const pill = post['pill'] as Pill | null | undefined;
        this.selectedPillId = pill?.id ?? '';
        this.showNewPill.set(false);
        this.newPillText = '';
        this.newPillColor = '#8A0808';
        this.newPillTextColor = '#ffffff';
        const heroImg = post['heroImage'] as { url: string; id?: string } | null;
        if (heroImg) {
          this.heroMediaId.set(heroImg.id ?? null);
          this.heroUrl.set(heroImg.url);
        } else {
          this.heroMediaId.set(null);
          this.heroUrl.set(null);
        }
        const savedVideoUrl = (post['videoUrl'] as string | null) ?? '';
        this.videoUrl = savedVideoUrl;
        this.videoSource = savedVideoUrl
          ? isYoutubeUrl(savedVideoUrl)
            ? 'youtube'
            : 'upload'
          : 'none';
        this.bulbi = this.mapBulbiFromPost(post['bulbi']);
      });

      this.api.getRevisions(id).subscribe((revs) => this.revisions.set(revs));
    } else {
      this.authorName = this.auth.user()?.displayName ?? '';
      this.syncSelectedPseudonym();
      this.showDate = true;
      this.showAuthor = true;
      this.showSummary = false;
      this.publishedAtIso = new Date().toISOString();
      this.postDate = this.resolvePostDate(this.publishedAtIso);
      this.postTime = this.resolvePostTime(this.publishedAtIso);
      this.bulbi = [];
    }
  }

  addBulb() {
    this.bulbi = [...this.bulbi, { postId: '', title: '', labelOverride: '', pickedPost: null }];
  }

  removeBulb(index: number) {
    this.bulbi = this.bulbi.filter((_, i) => i !== index);
  }

  moveBulb(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.bulbi.length) return;
    const next = [...this.bulbi];
    [next[index], next[target]] = [next[target], next[index]];
    this.bulbi = next;
  }

  onBulbSelected(index: number, picked: PickedPost | null) {
    if (!picked) {
      this.bulbi[index] = { postId: '', title: '', labelOverride: '', pickedPost: null };
      this.bulbi = [...this.bulbi];
      return;
    }

    const currentPostId = this.postId();
    if (currentPostId && picked.id === currentPostId) {
      this.toast.error('Nu poți lega articolul de el însuși.');
      return;
    }
    if (this.bulbi.some((item, i) => i !== index && item.postId === picked.id)) {
      this.toast.error('Acest articol este deja adăugat în Bulbi.');
      return;
    }

    this.bulbi[index] = {
      postId: picked.id,
      title: picked.title,
      labelOverride: this.bulbi[index]?.labelOverride ?? '',
      pickedPost: picked,
    };
    this.bulbi = [...this.bulbi];
  }

  private mapBulbiFromPost(raw: unknown): EditableBulb[] {
    if (!Array.isArray(raw)) return [];
    const items: EditableBulb[] = [];
    for (const item of raw) {
      const record = item as {
        postId?: string;
        labelOverride?: string | null;
        post?: {
          id?: string;
          title?: string;
          publishedAt?: string | null;
          authorName?: string | null;
          author?: { displayName?: string } | null;
        };
      };
      const postId = record.postId ?? record.post?.id ?? '';
      const title = record.post?.title ?? '';
      if (!postId) continue;
      items.push({
        postId,
        title,
        labelOverride: record.labelOverride ?? '',
        pickedPost: {
          id: postId,
          title,
          publishedAt: record.post?.publishedAt ?? null,
          authorDisplayName: record.post?.authorName ?? record.post?.author?.displayName ?? null,
        },
      });
    }
    return items;
  }

  private buildBulbiPayload() {
    return this.bulbi
      .filter((item) => item.postId)
      .map((item) => ({
        postId: item.postId,
        labelOverride: item.labelOverride.trim() || null,
      }));
  }

  onPseudonymSelect(value: string) {
    this.selectedPseudonym = value;
    if (value) {
      this.authorName = value;
    }
  }

  private syncSelectedPseudonym() {
    const current = this.authorName.trim();
    this.selectedPseudonym = current && this.pseudonyms().some((p) => p === current) ? current : '';
  }

  toggleHtmlMode() {
    this.htmlMode.update((v) => !v);
  }

  async onDocxChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importingDocx.set(true);
    try {
      // Dynamic import so mammoth is only loaded on demand
      const mammoth = await import('mammoth/mammoth.browser');
      const arrayBuffer = await file.arrayBuffer();
      const { value, messages } = await (
        mammoth as unknown as {
          convertToHtml: (opts: {
            arrayBuffer: ArrayBuffer;
          }) => Promise<{ value: string; messages: unknown[] }>;
        }
      ).convertToHtml({ arrayBuffer });
      this.contentHtml = value;
      // Push into the live editor if WYSIWYG mode is active
      this.richEditor?.setHtml(value);
      if (messages.length) {
        this.toast.info(`Document importat (${messages.length} avertismente).`);
      } else {
        this.toast.success('Document Word importat cu succes.');
      }
    } catch {
      this.toast.error('Eroare la importul documentului Word.');
    } finally {
      this.importingDocx.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.api.uploadMedia(file).subscribe({
      next: (media) => {
        this.heroMediaId.set(media.id);
        this.heroUrl.set(media.url);
        this.uploading.set(false);
        this.toast.success('Imagine încărcată cu succes!');
      },
      error: (e) => {
        this.uploading.set(false);
        this.toast.error(e?.error?.message || 'Eroare la încărcare');
      },
    });
  }

  onPillSelectChange() {
    if (this.selectedPillId) {
      this.showNewPill.set(false);
      this.newPillText = '';
    }
  }

  async onVideoFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingVideo.set(true);
    this.api.uploadMedia(file).subscribe({
      next: (media) => {
        this.videoUrl = media.url;
        this.videoSource = 'upload';
        this.uploadingVideo.set(false);
        this.toast.success('Videoclip încărcat cu succes!');
      },
      error: (e) => {
        this.uploadingVideo.set(false);
        this.toast.error(e?.error?.message || 'Eroare la încărcarea videoclipului');
      },
    });
  }

  private resolveVideoUrlForSave(): string | null {
    if (this.videoSource === 'none') return null;
    const trimmed = this.videoUrl.trim();
    if (!trimmed) return null;
    if (this.videoSource === 'youtube' && isYoutubeUrl(trimmed)) {
      return toYoutubeEmbedUrl(trimmed);
    }
    return trimmed;
  }

  onPrimaryCategoryChange() {
    this.placementPage = '';
    this.selectedPlacementKey = '';
  }

  onPlacementPageChange() {
    this.selectedPlacementKey = '';
  }

  private applyModulePlacement(postId: string, onDone: () => void) {
    if (!this.selectedPlacementKey || !this.primaryCategoryId || !this.placementPage) {
      onDone();
      return;
    }

    const layouts = this.layouts();
    if (!layouts) {
      onDone();
      return;
    }

    const option = buildPlacementOptions(layouts, this.primaryCategoryId, this.placementPage).find(
      (opt) => opt.key === this.selectedPlacementKey,
    );

    if (!option) {
      onDone();
      return;
    }

    this.api
      .pinPostAtFront({
        postId,
        categoryId: this.primaryCategoryId,
        page: option.page,
        moduleId: option.moduleId,
        rowId: option.rowId,
      })
      .subscribe({
        next: () => {
          this.toast.success('Articol plasat în modul.');
          onDone();
        },
        error: (e) => {
          this.toast.error(e?.error?.message || 'Articol salvat, dar plasarea în modul a eșuat.');
          onDone();
        },
      });
  }

  save(options: { transitionAfterSave?: 'submit' } = {}) {
    let pillPayload: {
      pillId?: string | null;
      pillText?: string | null;
      pillColor?: string | null;
      pillTextColor?: string | null;
    };
    try {
      pillPayload = this.buildPillPayload();
    } catch {
      return;
    }
    const data = {
      title: this.title,
      slug: this.slug || undefined,
      excerpt: this.excerpt || null,
      contentHtml: this.contentHtml,
      publishedAt: this.buildPublishedAtForSave(),
      seoTitle: this.seoTitle || null,
      seoDescription: this.seoDescription || null,
      authorName: this.authorName || null,
      showDate: this.showDate,
      showAuthor: this.showAuthor,
      showSummary: this.showSummary,
      heroMediaId: this.heroMediaId() ?? null,
      videoUrl: this.resolveVideoUrlForSave(),
      categoryIds: this.primaryCategoryId ? [this.primaryCategoryId] : [],
      primaryCategoryId: this.primaryCategoryId || null,
      bulbi: this.buildBulbiPayload(),
      ...pillPayload,
    };

    this.saving.set(true);
    const obs = this.isNew()
      ? this.api.createPost(data as Parameters<ApiService['createPost']>[0])
      : this.api.updatePost(this.postId()!, data);

    obs.subscribe({
      next: (post) => {
        this.publishedAtIso = (post['publishedAt'] as string | null) ?? this.publishedAtIso;
        this.postDate = this.resolvePostDate(this.publishedAtIso);
        this.postTime = this.resolvePostTime(this.publishedAtIso);
        const savedId = (post as { id: string }).id;
        const wasNew = this.isNew();
        const finish = () => {
          const savedPill = (post as { pill?: Pill | null }).pill;
          if (savedPill) {
            this.selectedPillId = savedPill.id;
            this.showNewPill.set(false);
            this.newPillText = '';
            if (!this.pills().some((p) => p.id === savedPill.id)) {
              this.pills.update((list) => [...list, savedPill]);
            }
          }
          this.bulbi = this.mapBulbiFromPost((post as { bulbi?: unknown }).bulbi);
          if (options.transitionAfterSave) {
            this.postId.set(savedId);
            this.transitionSavedPost(savedId, options.transitionAfterSave, () => {
              if (wasNew) {
                this.router.navigate(['/posts', savedId, 'edit']);
              }
            });
            return;
          }

          this.saving.set(false);
          this.toast.success('Articol salvat!');
          if (wasNew) {
            this.router.navigate(['/posts', savedId, 'edit']);
          }
        };

        if (this.selectedPlacementKey && this.primaryCategoryId) {
          this.applyModulePlacement(savedId, finish);
        } else {
          finish();
        }
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e?.error?.message || 'Eroare la salvare');
      },
    });
  }

  doTransition(action: PostTransition['action']) {
    if (action === 'submit') {
      this.save({ transitionAfterSave: 'submit' });
      return;
    }

    const id = this.postId();
    if (!id) {
      this.save();
      return;
    }
    this.transitionSavedPost(id, action);
  }

  private transitionSavedPost(id: string, action: PostTransition['action'], onDone?: () => void) {
    this.saving.set(true);
    this.api.transitionPost(id, action).subscribe({
      next: (r) => {
        this.status.set(r.status);
        this.saving.set(false);
        this.toast.success(`Status: ${r.status}`);
        onDone?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e?.error?.message || 'Eroare la tranziție');
        onDone?.();
      },
    });
  }

  deletePost() {
    const id = this.postId();
    if (!id) return;
    if (!confirm('Sigur vrei să ștergi acest articol? Acțiunea este ireversibilă.')) return;
    this.saving.set(true);
    this.api.deletePost(id).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Articol șters.');
        this.router.navigate(['/posts']);
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e?.error?.message || 'Eroare la ștergere');
      },
    });
  }

  private buildPillPayload(): {
    pillId?: string | null;
    pillText?: string | null;
    pillColor?: string | null;
    pillTextColor?: string | null;
  } {
    if (this.showNewPill() && this.newPillText.trim()) {
      if (!/^#[0-9a-fA-F]{6}$/.test(this.newPillColor)) {
        this.toast.error('Culoarea fundalului trebuie să fie în format #RRGGBB');
        throw new Error('invalid pill color');
      }
      if (!/^#[0-9a-fA-F]{6}$/.test(this.newPillTextColor)) {
        this.toast.error('Culoarea textului trebuie să fie în format #RRGGBB');
        throw new Error('invalid pill text color');
      }
      return {
        pillId: null,
        pillText: this.newPillText.trim(),
        pillColor: this.newPillColor,
        pillTextColor: this.newPillTextColor,
      };
    }
    return { pillId: this.selectedPillId || null };
  }

  formatDate(d: unknown): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d as string));
  }

  private resolvePostTime(isoDate: string | null): string {
    const base = isoDate ? new Date(isoDate) : new Date();
    if (Number.isNaN(base.getTime())) return this.currentRomanianHour();
    return new Intl.DateTimeFormat('ro-RO', {
      timeZone: 'Europe/Bucharest',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(base);
  }

  private resolvePostDate(isoDate: string | null): string {
    const base = isoDate ? new Date(isoDate) : new Date();
    if (Number.isNaN(base.getTime())) return this.currentRomanianDate();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(base);
    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';
    return `${year}-${month}-${day}`;
  }

  private currentRomanianDate(): string {
    return this.resolvePostDate(new Date().toISOString());
  }

  private currentRomanianHour(): string {
    return new Intl.DateTimeFormat('ro-RO', {
      timeZone: 'Europe/Bucharest',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  }

  private buildPublishedAtForSave(): string | null {
    if (!this.postDate || !this.postTime) return this.publishedAtIso;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.postDate)) {
      this.toast.error('Data trebuie să fie în format YYYY-MM-DD.');
      return this.publishedAtIso;
    }
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(this.postTime);
    if (!match) {
      this.toast.error('Ora trebuie să fie în format HH:mm.');
      return this.publishedAtIso;
    }
    const baseDate = this.publishedAtIso ? new Date(this.publishedAtIso) : new Date();
    const normalizedBase = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const tzPart = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Bucharest',
      timeZoneName: 'shortOffset',
      hour: '2-digit',
    })
      .formatToParts(normalizedBase)
      .find((part) => part.type === 'timeZoneName')?.value;
    const offsetMatch = /GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(tzPart ?? 'GMT+2');
    const signHour = offsetMatch?.[1] ?? '+2';
    const sign = signHour.startsWith('-') ? '-' : '+';
    const hour = signHour.replace(/[+-]/g, '').padStart(2, '0');
    const minute = (offsetMatch?.[2] ?? '00').padStart(2, '0');
    const offset = `${sign}${hour}:${minute}`;
    const withTimezone = new Date(`${this.postDate}T${this.postTime}:00${offset}`);
    if (Number.isNaN(withTimezone.getTime())) {
      this.toast.error('Nu am putut interpreta data sau ora selectată.');
      return this.publishedAtIso;
    }
    return withTimezone.toISOString();
  }
}
