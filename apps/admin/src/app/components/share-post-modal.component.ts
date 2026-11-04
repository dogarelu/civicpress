import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';
import { resolvePublicSiteUrl } from '../utils/public-site-url';
import type { AdminPostSummary, UtmPreset, UtmPresetCreate } from '@civicpress/shared';

const PUBLIC_SITE = resolvePublicSiteUrl();

@Component({
  selector: 'cp-share-post-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      (click)="close.emit()"
    >
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div class="min-w-0">
            <h2 class="font-semibold text-gray-800">Distribuie articol</h2>
            <p class="text-xs text-gray-400 truncate mt-0.5">{{ post?.title }}</p>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            aria-label="Închide"
          >
            ×
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Link</label>
            <div class="flex gap-2">
              <input
                type="text"
                readonly
                [value]="shareUrl()"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-mono"
              />
              <button
                type="button"
                (click)="copyLink()"
                class="px-3 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap"
                style="background-color: #8A0808"
              >
                Copiază
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">UTM (opțional)</label>
            <select
              [(ngModel)]="selectedPresetId"
              (ngModelChange)="onPresetSelect()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Fără UTM</option>
              @for (p of presets(); track p.id) {
                <option [value]="p.id">{{ p.code }}</option>
              }
              <option value="__new__">+ Adaugă UTM nou…</option>
            </select>
          </div>

          @if (selectedPresetId === '__new__') {
            <div class="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <label class="block">
                <span class="text-xs text-gray-500">Cod UTM</span>
                <input
                  [(ngModel)]="newCode"
                  class="mt-0.5 w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono"
                  placeholder="ex. facebook, newsletter, ads-martie"
                />
                <span class="mt-1 block text-xs text-gray-400"
                  >Linkul va conține <span class="font-mono">?utm=…</span></span
                >
              </label>
              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  (click)="selectedPresetId = ''; activePreset = null; updateUrl()"
                  class="px-3 py-1.5 text-sm text-gray-600 hover:underline"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  (click)="saveNewPreset()"
                  [disabled]="saving()"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style="background-color: #8A0808"
                >
                  Salvează & aplică
                </button>
              </div>
            </div>
          }

          @if (activePreset && selectedPresetId !== '__new__') {
            <p class="text-xs text-gray-500">
              Parametru:
              <span class="font-mono text-gray-700">utm={{ activePreset.code }}</span>
            </p>
          }
        </div>
      </div>
    </div>
  `,
})
export class SharePostModalComponent implements OnChanges {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  @Input({ required: true }) post!: AdminPostSummary | null;
  @Output() close = new EventEmitter<void>();

  presets = signal<UtmPreset[]>([]);
  saving = signal(false);
  shareUrl = signal('');
  selectedPresetId = '';
  activePreset: UtmPreset | null = null;
  newCode = '';

  ngOnChanges() {
    if (!this.post) return;
    this.selectedPresetId = '';
    this.activePreset = null;
    this.newCode = '';
    this.updateUrl();
    this.api.getUtmPresets().subscribe({
      next: (list) => this.presets.set(list),
      error: () => this.toast.error('Nu s-au putut încărca codurile UTM'),
    });
  }

  onPresetSelect() {
    if (this.selectedPresetId === '__new__') {
      this.activePreset = null;
      this.updateUrl();
      return;
    }
    this.activePreset = this.presets().find((p) => p.id === this.selectedPresetId) ?? null;
    this.updateUrl();
  }

  saveNewPreset() {
    const data: UtmPresetCreate = { code: this.newCode.trim() };
    if (!data.code) {
      this.toast.error('Introdu un cod UTM');
      return;
    }
    this.saving.set(true);
    this.api.createUtmPreset(data).subscribe({
      next: (created) => {
        this.presets.update((list) =>
          [...list, created].sort((a, b) => a.code.localeCompare(b.code)),
        );
        this.selectedPresetId = created.id;
        this.activePreset = created;
        this.newCode = '';
        this.updateUrl();
        this.saving.set(false);
        this.toast.success('UTM salvat');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e?.error?.message || 'Eroare la salvare');
      },
    });
  }

  async copyLink() {
    const url = this.shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('Link copiat');
    } catch {
      this.toast.error('Nu s-a putut copia linkul');
    }
  }

  updateUrl() {
    if (!this.post) {
      this.shareUrl.set('');
      return;
    }
    const base = PUBLIC_SITE.replace(/\/$/, '');
    let url = `${base}/${this.post.slug}`;
    if (this.activePreset) {
      url += `?utm=${encodeURIComponent(this.activePreset.code)}`;
    }
    this.shareUrl.set(url);
  }
}
