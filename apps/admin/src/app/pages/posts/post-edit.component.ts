import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { AuthStore } from '../../services/auth.store';
import { ToastService } from '../../services/toast.service';
import { RichTextEditorComponent } from '../../components/rich-text-editor.component';
import { PostPickerComponent, type PickedPost } from '../../components/post-picker.component';
import { ArticlePreviewModalComponent } from '../../components/article-preview-modal.component';
import { resolvePreviewArticleUrl } from '../../utils/public-site-url';
import { videoFileRejection, videoUploadErrorMessage } from '../../utils/media-upload';
import type {
  Pill,
  PillCorner,
  PillSize,
  PostPillPlacement,
  AdminLayouts,
  ModuleType,
  ModulePlacementPage,
  PostTransition,
  PostPreviewRequest,
} from '@civicpress/shared';
import {
  canManageSiteStructure,
  isYoutubeUrl,
  listArticleBodyMedia,
  toYoutubeEmbedUrl,
} from '@civicpress/shared';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface EditablePostPill {
  /** Local row key for ngModel names / track. */
  key: string;
  pillId: string;
  /** Empty = use global default (only allowed when a single pill is set). */
  corner: '' | PillCorner;
  /** Relative to the layout/global default size. */
  size: PillSize;
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
  label: string;
  postId: string;
  title: string;
  pickedPost: PickedPost | null;
}

interface EditablePhotoCaption {
  label: string;
}

const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  hero: '1 articol principal',
  'hero-list': '1 principal + mici în dreapta',
  'hero-list-6': '1 principal + mici în dreapta (complet)',
  'hero-list-center': '1 principal pe mijloc + mici stânga/dreapta',
  'hero-top-list': '1 principal sus + mici dedesubt',
  'hero-slideshow': 'Principal pe poză (slideshow)',
  grid: '4 articole în grilă (2×2)',
  list: 'Listă de articole',
  'rows-3': 'Rânduri de 3',
  'rows-4': 'Rânduri de 4',
  'rows-4-sm': 'Rânduri de 4 mici',
  'rows-5': 'Rânduri de 5',
  'pictures-7': 'Imagini cu titlu pe poză',
  'category-columns': 'Coloane categorii',
  slideshow: 'Slideshow articole',
  'video-list': '1 video + listă scroll (manual)',
  'article-list': '1 articol + listă scroll',
  split: 'Split (1 articol)',
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

    if (
      mod.type === 'rows-3' ||
      mod.type === 'rows-4' ||
      mod.type === 'rows-4-sm' ||
      mod.type === 'rows-5'
    ) {
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
    } else if (mod.type === 'category-columns') {
      for (const col of mod.options?.columns ?? []) {
        if (page === 'home' && col.categoryId && col.categoryId !== categoryId) {
          continue;
        }
        const colTitle = col.name?.trim() || 'Coloană categorie';
        options.push({
          key: `${page}:${mod.id}:${col.id}`,
          page,
          moduleId: mod.id,
          rowId: col.id,
          label: `${pageLabel} — ${modName} — ${colTitle}`,
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
  imports: [
    FormsModule,
    RouterLink,
    RichTextEditorComponent,
    PostPickerComponent,
    ArticlePreviewModalComponent,
  ],
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
        <button
          type="button"
          (click)="openPreview()"
          [disabled]="previewing()"
          class="ml-auto text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {{ previewing() ? 'Se încarcă…' : 'Previzualizare' }}
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main form -->
        <div class="lg:col-span-2 space-y-5">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Supratitlu</label>
              <input
                type="text"
                [(ngModel)]="kicker"
                name="kicker"
                placeholder="Text mic, italic, deasupra titlului"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm italic focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p class="mt-1 text-xs text-gray-400">
                Apare doar pe pagina articolului, deasupra titlului.
              </p>
            </div>
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
                Afișează subtitlu în module/listări
              </label>
            </div>

            <div class="border border-gray-100 rounded-lg p-4 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-gray-700">Subtitlu (bumbi)</h3>
                  <p class="text-xs text-gray-400 mt-0.5">
                    Înlocuiește rezumatul: listă de puncte sub titlu și în module. Linkul către un
                    alt articol este opțional.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="addBulb()"
                  class="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  + Adaugă bumb
                </button>
              </div>

              @if (bulbi.length === 0) {
                <p class="text-xs text-gray-400">Niciun bumb adăugat.</p>
              }

              @for (bulb of bulbi; track $index; let i = $index) {
                <div class="border border-gray-200 rounded-lg p-3 space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-medium text-gray-500">Bumb {{ i + 1 }}</span>
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
                        aria-label="Elimină bumb"
                      >
                        Șterge
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Text *</label>
                    <input
                      type="text"
                      [(ngModel)]="bulb.label"
                      [name]="'bulbLabel' + i"
                      placeholder="Textul bumbului"
                      class="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <cp-post-picker
                    label="Link către articol (opțional)"
                    [value]="bulb.pickedPost"
                    (selected)="onBulbSelected(i, $event)"
                  />
                </div>
              }
            </div>

            <div class="border border-gray-100 rounded-lg p-4 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-gray-700">Explicații foto și video</h3>
                  <p class="text-xs text-gray-400 mt-0.5">
                    Câte o explicație pentru fiecare poză sau video, afișată sub ele. Prima e mereu
                    pentru poza principală, apoi pozele și videourile din text, de sus în jos. Lasă
                    un rând gol ca să sari un element.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="addPhotoCaption()"
                  class="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  + Adaugă explicație
                </button>
              </div>

              @if (photoCaptions.length === 0) {
                <p class="text-xs text-gray-400">Nicio explicație adăugată.</p>
              }

              @for (caption of photoCaptions; track $index; let i = $index) {
                <div class="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-medium text-gray-500">{{
                      photoCaptionSlotLabel(i)
                    }}</span>
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        (click)="movePhotoCaption(i, -1)"
                        [disabled]="i === 0"
                        class="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40"
                        aria-label="Mută sus"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        (click)="movePhotoCaption(i, 1)"
                        [disabled]="i === photoCaptions.length - 1"
                        class="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40"
                        aria-label="Mută jos"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        (click)="removePhotoCaption(i)"
                        class="px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                        aria-label="Elimină explicație"
                      >
                        Șterge
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="caption.label"
                    [name]="'photoCaption' + i"
                    placeholder="Explicație"
                    maxlength="1000"
                    class="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
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
                type="button"
                (click)="openPreview()"
                [disabled]="previewing()"
                class="w-full py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {{ previewing() ? 'Se încarcă…' : 'Previzualizare' }}
              </button>
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

          <!-- Tags -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-1">Tag-uri</h2>
            <p class="text-xs text-gray-400 mb-3">
              Scrie un tag și apasă Enter sau virgulă. Apar la finalul articolului pe site.
            </p>
            <div
              class="flex flex-wrap items-center gap-1.5 min-h-[42px] px-2 py-1.5 border border-gray-300 rounded-lg focus-within:ring-1 focus-within:ring-gray-400"
              (click)="tagInputEl.focus()"
            >
              @for (tag of tags; track tag; let i = $index) {
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                >
                  {{ tag }}
                  <button
                    type="button"
                    (click)="removeTag(i); $event.stopPropagation()"
                    class="text-gray-400 hover:text-gray-700 leading-none"
                    aria-label="Șterge tag"
                  >
                    ×
                  </button>
                </span>
              }
              <input
                #tagInputEl
                type="text"
                [(ngModel)]="tagInput"
                name="tagInput"
                (keydown)="onTagKeydown($event)"
                (blur)="commitTagInput()"
                placeholder="{{ tags.length ? '' : 'ex: alegeri, primărie…' }}"
                class="flex-1 min-w-[8rem] border-0 outline-none text-sm py-1 px-1 bg-transparent"
                maxlength="100"
              />
            </div>
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

          <!-- Image pills -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-1">Pill-uri imagine</h2>
            <p class="text-xs text-gray-400 mb-3">
              Maxim 4, colțuri diferite. Cu un singur pill, colțul poate rămâne implicit (setare
              globală). Mărimea (mai mic / implicit / mai mare) e relativă la dimensiunea implicită.
            </p>
            <div class="space-y-3">
              @for (row of postPills; track row.key; let i = $index) {
                <div class="rounded-lg border border-gray-100 p-3 space-y-2">
                  <div class="flex items-start gap-2">
                    <select
                      [(ngModel)]="row.pillId"
                      [name]="'postPillId_' + row.key"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="">— Alege pill —</option>
                      @for (pill of pills(); track pill.id) {
                        <option [value]="pill.id" [disabled]="isPillTaken(pill.id, row.key)">
                          {{ pill.text }} ({{ pill.color }})
                        </option>
                      }
                    </select>
                    <button
                      type="button"
                      (click)="removePillRow(i)"
                      class="shrink-0 px-2 py-2 text-xs text-gray-500 hover:text-red-700"
                      title="Elimină"
                    >
                      ✕
                    </button>
                  </div>
                  @if (row.pillId) {
                    @for (pill of pills(); track pill.id) {
                      @if (pill.id === row.pillId) {
                        <span
                          class="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold"
                          [style.backgroundColor]="pill.color"
                          [style.color]="pill.textColor"
                        >
                          {{ pill.text }}
                        </span>
                      }
                    }
                  }
                  <div class="grid grid-cols-2 gap-2">
                    <label class="block">
                      <span class="block text-xs font-medium text-gray-600 mb-1">
                        Colț{{ requiresExplicitCorners() ? ' *' : '' }}
                      </span>
                      <select
                        [(ngModel)]="row.corner"
                        [name]="'postPillCorner_' + row.key"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                      >
                        @if (!requiresExplicitCorners()) {
                          <option value="">Implicit (setare globală)</option>
                        }
                        <option value="top-left" [disabled]="isCornerTaken('top-left', row.key)">
                          Stânga sus
                        </option>
                        <option value="top-right" [disabled]="isCornerTaken('top-right', row.key)">
                          Dreapta sus
                        </option>
                        <option
                          value="bottom-left"
                          [disabled]="isCornerTaken('bottom-left', row.key)"
                        >
                          Stânga jos
                        </option>
                        <option
                          value="bottom-right"
                          [disabled]="isCornerTaken('bottom-right', row.key)"
                        >
                          Dreapta jos
                        </option>
                      </select>
                    </label>
                    <label class="block">
                      <span class="block text-xs font-medium text-gray-600 mb-1">Mărime</span>
                      <select
                        [(ngModel)]="row.size"
                        [name]="'postPillSize_' + row.key"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                      >
                        <option value="smaller">Mai mic</option>
                        <option value="default">Implicit</option>
                        <option value="bigger">Mai mare</option>
                      </select>
                    </label>
                  </div>
                </div>
              }
            </div>
            <div class="flex flex-wrap items-center gap-3 mt-3">
              <button
                type="button"
                (click)="addPillRow()"
                [disabled]="!canAddPillRow()"
                class="text-xs font-medium text-red-700 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                + Adaugă pill
              </button>
              <button
                type="button"
                (click)="showNewPill.set(!showNewPill())"
                [disabled]="!canAddPillRow() && !showNewPill()"
                class="text-xs font-medium text-red-700 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                {{ showNewPill() ? 'Anulează pill nou' : '+ Pill nou' }}
              </button>
            </div>
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
                <div class="grid grid-cols-2 gap-2">
                  <label class="block">
                    <span class="block text-xs font-medium text-gray-600 mb-1">
                      Colț{{ requiresExplicitCornersForNew() ? ' *' : '' }}
                    </span>
                    <select
                      [(ngModel)]="newPillCorner"
                      name="newPillCorner"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                    >
                      @if (!requiresExplicitCornersForNew()) {
                        <option value="">Implicit (setare globală)</option>
                      }
                      <option value="top-left" [disabled]="isCornerTaken('top-left')">
                        Stânga sus
                      </option>
                      <option value="top-right" [disabled]="isCornerTaken('top-right')">
                        Dreapta sus
                      </option>
                      <option value="bottom-left" [disabled]="isCornerTaken('bottom-left')">
                        Stânga jos
                      </option>
                      <option value="bottom-right" [disabled]="isCornerTaken('bottom-right')">
                        Dreapta jos
                      </option>
                    </select>
                  </label>
                  <label class="block">
                    <span class="block text-xs font-medium text-gray-600 mb-1">Mărime</span>
                    <select
                      [(ngModel)]="newPillSize"
                      name="newPillSize"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="smaller">Mai mic</option>
                      <option value="default">Implicit</option>
                      <option value="bigger">Mai mare</option>
                    </select>
                  </label>
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

    @if (previewOpen()) {
      <cp-article-preview-modal
        [loading]="previewing()"
        [iframeSrc]="previewIframeSrc()"
        (close)="closePreview()"
        (refresh)="openPreview()"
      />
    }
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
  kicker = '';
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
  tags: string[] = [];
  tagInput = '';
  placementPage: ModulePlacementPage | '' = '';
  selectedPlacementKey = '';
  postPills: EditablePostPill[] = [];
  private pillRowSeq = 0;
  showNewPill = signal(false);
  newPillText = '';
  newPillColor = '#8A0808';
  newPillTextColor = '#ffffff';
  newPillCorner: '' | PillCorner = '';
  newPillSize: PillSize = 'default';
  videoSource: 'none' | 'youtube' | 'upload' = 'none';
  videoUrl = '';
  bulbi: EditableBulb[] = [];
  photoCaptions: EditablePhotoCaption[] = [];
  private publishedAtIso: string | null = null;
  previewOpen = signal(false);
  previewing = signal(false);
  previewIframeSrc = signal<string | null>(null);

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
        if (canManageSiteStructure(me.role)) {
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
        this.kicker = (post['kicker'] as string) ?? '';
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
        this.bulbi = this.mapBulbiFromPost(post['bulbi']);
        this.photoCaptions = this.mapPhotoCaptionsFromPost(post['photoCaptions']);
        this.showSummary =
          (post['showSummary'] as boolean | undefined) ??
          (this.bulbi.length > 0 || !!this.excerpt.trim());
        this.status.set(post['status'] as string);
        this.authorId.set((post['author'] as { id?: string } | null)?.id ?? null);
        const cats = (post['categories'] as Array<{ id: string }>) ?? [];
        this.primaryCategoryId = cats[0]?.id ?? '';
        const loadedTags = (post['tags'] as Array<{ name: string }> | undefined) ?? [];
        this.tags = loadedTags.map((t) => t.name).filter(Boolean);
        this.tagInput = '';
        this.loadPostPills(post);
        this.showNewPill.set(false);
        this.newPillText = '';
        this.newPillColor = '#8A0808';
        this.newPillTextColor = '#ffffff';
        this.newPillCorner = '';
        this.newPillSize = 'default';
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
      this.photoCaptions = [];
      this.tags = [];
      this.tagInput = '';
    }
  }

  onTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitTagInput();
      return;
    }
    if (event.key === 'Backspace' && !this.tagInput && this.tags.length > 0) {
      this.removeTag(this.tags.length - 1);
    }
  }

  commitTagInput() {
    const parts = this.tagInput
      .split(',')
      .map((part) => part.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    for (const name of parts) {
      this.addTag(name);
    }
    this.tagInput = '';
  }

  addTag(name: string) {
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!normalized || normalized.length > 100) return;
    const exists = this.tags.some(
      (t) => t.toLocaleLowerCase('ro') === normalized.toLocaleLowerCase('ro'),
    );
    if (exists) return;
    this.tags = [...this.tags, normalized];
  }

  removeTag(index: number) {
    this.tags = this.tags.filter((_, i) => i !== index);
  }

  private buildTagNamesPayload(): string[] {
    this.commitTagInput();
    return [...this.tags];
  }

  addBulb() {
    this.bulbi = [...this.bulbi, { label: '', postId: '', title: '', pickedPost: null }];
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
      this.bulbi[index] = {
        ...this.bulbi[index],
        postId: '',
        title: '',
        pickedPost: null,
      };
      this.bulbi = [...this.bulbi];
      return;
    }

    const currentPostId = this.postId();
    if (currentPostId && picked.id === currentPostId) {
      this.toast.error('Nu poți lega articolul de el însuși.');
      return;
    }
    if (this.bulbi.some((item, i) => i !== index && item.postId === picked.id)) {
      this.toast.error('Acest articol este deja legat într-un bumb.');
      return;
    }

    const currentLabel = this.bulbi[index]?.label?.trim() ?? '';
    this.bulbi[index] = {
      label: currentLabel || picked.title,
      postId: picked.id,
      title: picked.title,
      pickedPost: picked,
    };
    this.bulbi = [...this.bulbi];
  }

  private mapBulbiFromPost(raw: unknown): EditableBulb[] {
    if (!Array.isArray(raw)) return [];
    const items: EditableBulb[] = [];
    for (const item of raw) {
      const record = item as {
        label?: string | null;
        labelOverride?: string | null;
        postId?: string;
        linkedPost?: {
          id?: string;
          title?: string;
          slug?: string;
        } | null;
        post?: {
          id?: string;
          title?: string;
          publishedAt?: string | null;
          authorName?: string | null;
          author?: { displayName?: string } | null;
        };
      };
      const linked = record.linkedPost ?? record.post ?? null;
      const postId = linked?.id ?? record.postId ?? '';
      const title = linked?.title ?? '';
      const label = record.label?.trim() || record.labelOverride?.trim() || title || '';
      if (!label) continue;
      items.push({
        label,
        postId,
        title,
        pickedPost: postId
          ? {
              id: postId,
              title,
              publishedAt: record.post?.publishedAt ?? null,
              authorDisplayName:
                record.post?.authorName ?? record.post?.author?.displayName ?? null,
            }
          : null,
      });
    }
    return items;
  }

  private buildBulbiPayload() {
    return this.bulbi
      .filter((item) => item.label.trim())
      .map((item) => ({
        label: item.label.trim(),
        postId: item.postId || null,
      }));
  }

  addPhotoCaption() {
    this.photoCaptions = [...this.photoCaptions, { label: '' }];
  }

  removePhotoCaption(index: number) {
    this.photoCaptions = this.photoCaptions.filter((_, i) => i !== index);
  }

  movePhotoCaption(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.photoCaptions.length) return;
    const next = [...this.photoCaptions];
    [next[index], next[target]] = [next[target], next[index]];
    this.photoCaptions = next;
  }

  photoCaptionSlotLabel(index: number): string {
    if (index === 0) return 'Poză principală';
    const media = listArticleBodyMedia(this.contentHtml);
    const kind = media[index - 1];
    const before = media.slice(0, index);
    if (kind === 'video') {
      return `Video din text ${before.filter((item) => item === 'video').length}`;
    }
    if (kind === 'image') {
      return `Poză din text ${before.filter((item) => item === 'image').length}`;
    }
    return `Poză din text ${index}`;
  }

  private mapPhotoCaptionsFromPost(raw: unknown): EditablePhotoCaption[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      label: typeof item === 'string' ? item : ((item as { label?: string })?.label ?? ''),
    }));
  }

  private buildPhotoCaptionsPayload() {
    const items = this.photoCaptions.map((item) => ({ label: item.label }));
    while (items.length > 0 && !items[items.length - 1].label.trim()) {
      items.pop();
    }
    return items;
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

  private nextPillKey(): string {
    this.pillRowSeq += 1;
    return `pill_${this.pillRowSeq}`;
  }

  private loadPostPills(post: Record<string, unknown>) {
    const placements = (post['pills'] as PostPillPlacement[] | undefined) ?? [];
    if (placements.length > 0) {
      this.postPills = placements.map((p) => ({
        key: this.nextPillKey(),
        pillId: p.pill.id,
        corner: (p.corner ?? '') as '' | PillCorner,
        size: p.size ?? 'default',
      }));
      return;
    }
    // Legacy single-pill response fallback
    const pill = post['pill'] as Pill | null | undefined;
    if (pill?.id) {
      const corner = post['pillCorner'] as PillCorner | null | undefined;
      this.postPills = [
        {
          key: this.nextPillKey(),
          pillId: pill.id,
          corner: (corner ?? '') as '' | PillCorner,
          size: 'default',
        },
      ];
      return;
    }
    this.postPills = [];
  }

  canAddPillRow(): boolean {
    const pendingNew = this.showNewPill() && !!this.newPillText.trim();
    return this.postPills.length + (pendingNew ? 1 : 0) < 4;
  }

  /** More than one placed pill (or one + pending new) requires explicit corners. */
  requiresExplicitCorners(): boolean {
    const pendingNew = this.showNewPill() && !!this.newPillText.trim();
    return this.postPills.length + (pendingNew ? 1 : 0) > 1;
  }

  requiresExplicitCornersForNew(): boolean {
    return this.postPills.length >= 1;
  }

  isPillTaken(pillId: string, exceptKey?: string): boolean {
    return this.postPills.some((r) => r.pillId === pillId && r.key !== exceptKey);
  }

  isCornerTaken(corner: PillCorner, exceptKey?: string): boolean {
    return this.postPills.some((r) => r.corner === corner && r.key !== exceptKey);
  }

  addPillRow() {
    if (!this.canAddPillRow()) return;
    this.postPills = [
      ...this.postPills,
      { key: this.nextPillKey(), pillId: '', corner: '', size: 'default' },
    ];
    if (this.requiresExplicitCorners()) {
      for (const row of this.postPills) {
        if (!row.corner) {
          row.corner = this.firstFreeCorner() ?? 'top-right';
        }
      }
    }
  }

  removePillRow(index: number) {
    this.postPills = this.postPills.filter((_, i) => i !== index);
  }

  private firstFreeCorner(): PillCorner | null {
    const used = new Set(this.postPills.map((r) => r.corner).filter((c): c is PillCorner => !!c));
    if (this.showNewPill() && this.newPillCorner) used.add(this.newPillCorner);
    const all: PillCorner[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
    return all.find((c) => !used.has(c)) ?? null;
  }

  async onVideoFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const rejection = videoFileRejection(file);
    if (rejection) {
      this.toast.error(rejection);
      input.value = '';
      return;
    }
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
        this.toast.error(videoUploadErrorMessage(e));
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

  openPreview() {
    let pillsPayload: ReturnType<PostEditComponent['buildPillsPayload']>;
    try {
      pillsPayload = this.buildPillsPayload();
    } catch {
      return;
    }

    const data: PostPreviewRequest = {
      id: this.postId() ?? undefined,
      title: this.title,
      kicker: this.kicker.trim() || null,
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
      tagNames: this.buildTagNamesPayload(),
      bulbi: this.buildBulbiPayload(),
      photoCaptions: this.buildPhotoCaptionsPayload(),
      pills: pillsPayload,
    };

    this.previewOpen.set(true);
    this.previewing.set(true);
    this.api.previewPost(data).subscribe({
      next: ({ token }) => {
        this.previewIframeSrc.set(resolvePreviewArticleUrl(token));
        this.previewing.set(false);
      },
      error: (e) => {
        this.previewing.set(false);
        if (!this.previewIframeSrc()) this.previewOpen.set(false);
        this.toast.error(e?.error?.message || 'Eroare la previzualizare');
      },
    });
  }

  closePreview() {
    this.previewOpen.set(false);
    this.previewing.set(false);
    this.previewIframeSrc.set(null);
  }

  save(options: { transitionAfterSave?: 'submit' } = {}) {
    let pillsPayload: ReturnType<PostEditComponent['buildPillsPayload']>;
    try {
      pillsPayload = this.buildPillsPayload();
    } catch {
      return;
    }
    const data = {
      title: this.title,
      kicker: this.kicker.trim() || null,
      slug: this.slug || undefined,
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
      tagNames: this.buildTagNamesPayload(),
      bulbi: this.buildBulbiPayload(),
      photoCaptions: this.buildPhotoCaptionsPayload(),
      pills: pillsPayload,
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
          this.loadPostPills(post as Record<string, unknown>);
          const savedPlacements = ((post as { pills?: PostPillPlacement[] }).pills ?? []).map(
            (p) => p.pill,
          );
          for (const savedPill of savedPlacements) {
            if (!this.pills().some((p) => p.id === savedPill.id)) {
              this.pills.update((list) => [...list, savedPill]);
            }
          }
          this.showNewPill.set(false);
          this.newPillText = '';
          this.newPillCorner = '';
          this.newPillSize = 'default';
          this.bulbi = this.mapBulbiFromPost((post as { bulbi?: unknown }).bulbi);
          this.photoCaptions = this.mapPhotoCaptionsFromPost(
            (post as { photoCaptions?: unknown }).photoCaptions,
          );
          const savedTags = (post as { tags?: Array<{ name: string }> }).tags ?? [];
          this.tags = savedTags.map((t) => t.name).filter(Boolean);
          this.tagInput = '';
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
    if (
      !confirm(
        'Muți articolul în coș? Rămâne acolo 30 de zile și îl poți recupera, sau îl poți șterge definitiv din coș.',
      )
    )
      return;
    this.saving.set(true);
    this.api.deletePost(id).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Articol mutat în coș.');
        this.router.navigate(['/posts']);
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e?.error?.message || 'Eroare la ștergere');
      },
    });
  }

  private buildPillsPayload(): Array<{
    pillId?: string | null;
    pillText?: string | null;
    pillColor?: string | null;
    pillTextColor?: string | null;
    corner?: PillCorner | null;
    size?: PillSize;
  }> {
    const rows = this.postPills.filter((r) => !!r.pillId);
    const pendingNew = this.showNewPill() && !!this.newPillText.trim();
    const total = rows.length + (pendingNew ? 1 : 0);

    if (total > 4) {
      this.toast.error('Maxim 4 pill-uri pe articol');
      throw new Error('too many pills');
    }

    const pillIds = rows.map((r) => r.pillId);
    if (new Set(pillIds).size !== pillIds.length) {
      this.toast.error('Același pill nu poate fi atașat de două ori');
      throw new Error('duplicate pill');
    }

    if (total > 1) {
      for (const row of rows) {
        if (!row.corner) {
          this.toast.error('Alege un colț pentru fiecare pill');
          throw new Error('corner required');
        }
      }
      if (pendingNew && !this.newPillCorner) {
        this.toast.error('Alege un colț pentru pill-ul nou');
        throw new Error('new pill corner required');
      }
    }

    const corners = [
      ...rows.map((r) => r.corner).filter((c): c is PillCorner => !!c),
      ...(pendingNew && this.newPillCorner ? [this.newPillCorner] : []),
    ];
    if (new Set(corners).size !== corners.length) {
      this.toast.error('Fiecare pill trebuie să aibă un colț diferit');
      throw new Error('duplicate corner');
    }

    const payload: Array<{
      pillId?: string | null;
      pillText?: string | null;
      pillColor?: string | null;
      pillTextColor?: string | null;
      corner?: PillCorner | null;
      size?: PillSize;
    }> = rows.map((r) => ({
      pillId: r.pillId,
      corner: (r.corner || null) as PillCorner | null,
      size: r.size ?? 'default',
    }));

    if (pendingNew) {
      if (!/^#[0-9a-fA-F]{6}$/.test(this.newPillColor)) {
        this.toast.error('Culoarea fundalului trebuie să fie în format #RRGGBB');
        throw new Error('invalid pill color');
      }
      if (!/^#[0-9a-fA-F]{6}$/.test(this.newPillTextColor)) {
        this.toast.error('Culoarea textului trebuie să fie în format #RRGGBB');
        throw new Error('invalid pill text color');
      }
      payload.push({
        pillText: this.newPillText.trim(),
        pillColor: this.newPillColor,
        pillTextColor: this.newPillTextColor,
        corner: (this.newPillCorner || null) as PillCorner | null,
        size: this.newPillSize,
      });
    }

    return payload;
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
