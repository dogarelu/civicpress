import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthStore } from '../../services/auth.store';
import { ToastService } from '../../services/toast.service';
import { RichTextEditorComponent } from '../../components/rich-text-editor.component';

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

@Component({
  selector: 'cp-post-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, RichTextEditorComponent],
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
              <label class="block text-sm font-medium text-gray-700 mb-1">Rezumat</label>
              <textarea
                [(ngModel)]="excerpt"
                name="excerpt"
                rows="2"
                placeholder="Scurt rezumat al articolului"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              ></textarea>
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
                class="w-full py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {{ saving() ? 'Se salvează...' : 'Salvează ciornă' }}
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

          <!-- Categories -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-3">Categorie principală</h2>
            <select
              [(ngModel)]="primaryCategoryId"
              name="primaryCategoryId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
            >
              <option value="">— Alege categoria —</option>
              @for (cat of categories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
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
  protected auth = inject(AuthStore);
  private toast = inject(ToastService);

  @ViewChild('richEditor') richEditor?: RichTextEditorComponent;

  postId = signal<string | null>(null);
  isNew = computed(() => !this.postId());
  status = signal<string>('DRAFT');
  saving = signal(false);
  uploading = signal(false);
  importingDocx = signal(false);
  htmlMode = signal(false);
  categories = signal<Category[]>([]);
  revisions = signal<unknown[]>([]);

  title = '';
  slug = '';
  excerpt = '';
  contentHtml = '';
  seoTitle = '';
  seoDescription = '';
  heroMediaId = signal<string | null>(null);
  heroUrl = signal<string | null>(null);
  primaryCategoryId = '';

  canSubmit = computed(() => this.status() === 'DRAFT' || this.status() === 'IN_REVIEW');
  canPublish = computed(
    () => this.auth.isEditor() && (this.status() === 'IN_REVIEW' || this.status() === 'DRAFT'),
  );
  canArchive = computed(() => this.auth.isEditor() && this.status() === 'PUBLISHED');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.postId.set(id);

    this.api.getCategories().subscribe((cats) => this.categories.set(cats));

    if (id) {
      this.api.getPost(id).subscribe((post) => {
        this.title = post['title'] as string;
        this.slug = post['slug'] as string;
        this.excerpt = (post['excerpt'] as string) ?? '';
        this.contentHtml = (post['contentHtml'] as string) ?? '';
        this.seoTitle = (post['seoTitle'] as string) ?? '';
        this.seoDescription = (post['seoDescription'] as string) ?? '';
        this.status.set(post['status'] as string);
        const cats = (post['categories'] as Array<{ id: string }>) ?? [];
        this.primaryCategoryId = cats[0]?.id ?? '';
        const heroImg = post['heroImage'] as { url: string; id?: string } | null;
        if (heroImg) {
          this.heroUrl.set(heroImg.url);
        }
      });

      this.api.getRevisions(id).subscribe((revs) => this.revisions.set(revs));
    }
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

  save() {
    const data = {
      title: this.title,
      slug: this.slug || undefined,
      excerpt: this.excerpt || null,
      contentHtml: this.contentHtml,
      seoTitle: this.seoTitle || null,
      seoDescription: this.seoDescription || null,
      heroMediaId: this.heroMediaId() ?? null,
      categoryIds: this.primaryCategoryId ? [this.primaryCategoryId] : [],
      primaryCategoryId: this.primaryCategoryId || null,
    };

    this.saving.set(true);
    const obs = this.isNew()
      ? this.api.createPost(data as Parameters<ApiService['createPost']>[0])
      : this.api.updatePost(this.postId()!, data);

    obs.subscribe({
      next: (post) => {
        this.saving.set(false);
        this.toast.success('Articol salvat!');
        if (this.isNew()) {
          this.router.navigate(['/posts', (post as { id: string }).id, 'edit']);
        }
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e?.error?.message || 'Eroare la salvare');
      },
    });
  }

  doTransition(action: string) {
    const id = this.postId();
    if (!id) {
      this.save();
      return;
    }
    this.saving.set(true);
    this.api.transitionPost(id, action).subscribe({
      next: (r) => {
        this.status.set(r.status);
        this.saving.set(false);
        this.toast.success(`Status: ${r.status}`);
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e?.error?.message || 'Eroare la tranziție');
      },
    });
  }

  formatDate(d: unknown): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d as string));
  }
}
