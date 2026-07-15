import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';
import { AuthStore } from '../services/auth.store';
import { firstValueFrom, forkJoin } from 'rxjs';
import type { AdminCategory, AdminSettings } from '@civicpress/shared';

@Component({
  selector: 'cp-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-3xl">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Setări</h1>

      @if (loading()) {
        <p class="text-sm text-gray-400">Se încarcă…</p>
      } @else if (form) {
        <form (ngSubmit)="save()" class="space-y-6">
          <!-- Meniu / Header -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-4">Meniu principal</h2>
            <label class="block">
              <span class="text-sm font-medium text-gray-700"
                >Număr maxim de categorii în meniu</span
              >
              <input
                type="number"
                min="1"
                max="20"
                [(ngModel)]="form.headerMaxCategories"
                name="headerMaxCategories"
                class="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span class="mt-1 block text-xs text-gray-400">
                Categoriile suplimentare vor apărea într-un meniu derulant „Mai multe”.
              </span>
            </label>

            <label class="mt-4 inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                [(ngModel)]="form.headerShowMoreDropdown"
                name="headerShowMoreDropdown"
                class="rounded border-gray-300"
              />
              Afișează meniul „Mai multe”
            </label>

            @if (form.headerShowMoreDropdown) {
              <div class="mt-4">
                <p class="text-sm font-medium text-gray-700">Categorii în „Mai multe”</p>
                <p class="text-xs text-gray-400 mt-1">
                  Dacă nu selectezi nimic, meniul va folosi automat categoriile care depășesc limita
                  de mai sus.
                </p>
                <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (cat of menuCategories(); track cat.id) {
                    <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        [checked]="isMoreCategorySelected(cat.id)"
                        (change)="toggleMoreCategory(cat.id, $any($event.target).checked)"
                        class="rounded border-gray-300"
                      />
                      {{ cat.name }}
                    </label>
                  }
                </div>
              </div>
            }
          </section>

          <!-- Tipografie -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-4">Tipografie</h2>
            <div class="space-y-3">
              <div
                class="hidden sm:grid grid-cols-[1fr_8rem_11rem] gap-4 text-xs font-medium text-gray-400 uppercase tracking-wide"
              >
                <span>Element</span>
                <span>Mărime (px)</span>
                <span>Grosime</span>
              </div>
              @for (row of typographyRows; track row.sizeKey) {
                <div
                  class="grid grid-cols-1 sm:grid-cols-[1fr_8rem_11rem] gap-2 sm:gap-4 sm:items-center"
                >
                  <div>
                    <span class="text-sm font-medium text-gray-700">{{ row.label }}</span>
                    <span class="block text-xs text-gray-400">{{ row.hint }}</span>
                  </div>
                  <input
                    type="number"
                    min="10"
                    max="60"
                    [(ngModel)]="$any(form)[row.sizeKey]"
                    [name]="row.sizeKey"
                    class="block w-32 sm:w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <select
                    [(ngModel)]="$any(form)[row.weightKey]"
                    [name]="row.weightKey"
                    class="block w-48 sm:w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    @for (w of fontWeights; track w.value) {
                      <option [ngValue]="w.value">{{ w.label }}</option>
                    }
                  </select>
                </div>
              }
            </div>

            <label class="mt-4 block">
              <span class="text-sm font-medium text-gray-700">Rânduri rezumat (implicit)</span>
              <input
                type="number"
                min="1"
                max="8"
                [(ngModel)]="form.defaultSummaryRows"
                name="defaultSummaryRows"
                class="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span class="mt-1 block text-xs text-gray-400">
                Numărul de rânduri afișate din rezumat pe site. Modulele pot suprascrie această
                valoare din Layouts.
              </span>
            </label>
          </section>

          <!-- Afișare articole -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-4">Afișare articole</h2>
            <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                [(ngModel)]="form.showArticleViews"
                name="showArticleViews"
                class="rounded border-gray-300"
              />
              Afișează numărul de vizualizări pe site
            </label>
            <p class="mt-2 text-xs text-gray-400">
              Când este activ, numărul de vizualizări apare pe toate paginile publice (liste,
              module, pagina articolului).
            </p>
          </section>

          <!-- Pseudonime autor -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-1">Pseudonime autor</h2>
            <p class="text-xs text-gray-400 mb-4">
              Salvează nume folosite frecvent la semnarea articolelor. Le vei putea selecta rapid la
              editarea articolelor.
            </p>

            @if (pseudonyms.length === 0) {
              <p class="text-sm text-gray-400 mb-3">Nu ai pseudonime salvate încă.</p>
            } @else {
              <ul class="space-y-2 mb-4">
                @for (pseudonym of pseudonyms; track pseudonym; let i = $index) {
                  <li
                    class="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <span class="text-sm text-gray-700">{{ pseudonym }}</span>
                    <button
                      type="button"
                      (click)="removePseudonym(i)"
                      class="text-xs text-red-600 hover:text-red-800"
                    >
                      Șterge
                    </button>
                  </li>
                }
              </ul>
            }

            <div class="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                [(ngModel)]="newPseudonym"
                name="newPseudonym"
                maxlength="200"
                placeholder="Nume pseudonim nou"
                class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                (keydown.enter)="addPseudonym(); $event.preventDefault()"
              />
              <button
                type="button"
                (click)="addPseudonym()"
                [disabled]="!newPseudonym.trim() || savingPseudonyms()"
                class="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Adaugă
              </button>
              <button
                type="button"
                (click)="savePseudonyms()"
                [disabled]="savingPseudonyms()"
                class="px-4 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
              >
                {{ savingPseudonyms() ? 'Se salvează…' : 'Salvează pseudonime' }}
              </button>
            </div>
          </section>

          <!-- Identitate site -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-4">Identitate site</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Nume site</span>
                <input
                  type="text"
                  [(ngModel)]="form.siteName"
                  name="siteName"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </label>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Slogan</span>
                <input
                  type="text"
                  [ngModel]="form.tagline ?? ''"
                  (ngModelChange)="setTagline($event)"
                  name="tagline"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </label>
            </div>
            <div class="mt-4 space-y-3">
              <div class="flex items-center gap-3">
                <div
                  class="h-16 w-28 rounded border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
                >
                  @if (form.logoUrl) {
                    <img
                      [src]="form.logoUrl"
                      alt="Siglă site"
                      class="h-full w-full object-contain"
                    />
                  } @else {
                    <span class="text-xs text-gray-400 px-2 text-center">Fără siglă</span>
                  }
                </div>
                <div class="text-xs text-gray-500">
                  Sigla va apărea în header-ul public. Formate recomandate: PNG, SVG, WebP.
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  (change)="onLogoChange($event)"
                  class="block text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
                <button
                  type="button"
                  (click)="removeLogo()"
                  [disabled]="uploadingLogo() || (!form.logoMediaId && !form.logoUrl)"
                  class="px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Elimină sigla
                </button>
                @if (uploadingLogo()) {
                  <span class="text-xs text-gray-400">Se încarcă sigla…</span>
                }
              </div>
            </div>
          </section>

          <!-- Culori -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 class="font-semibold text-gray-800">Culori</h2>
              <button
                type="button"
                (click)="resetColors()"
                class="px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Resetează culorile implicite
              </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Primară</span>
                <span class="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    [(ngModel)]="form.primaryColor"
                    name="primaryColor"
                    class="h-9 w-12 rounded border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    [(ngModel)]="form.primaryColor"
                    name="primaryColorHex"
                    class="block w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm uppercase focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </span>
              </label>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Secundară</span>
                <span class="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    [(ngModel)]="form.secondaryColor"
                    name="secondaryColor"
                    class="h-9 w-12 rounded border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    [(ngModel)]="form.secondaryColor"
                    name="secondaryColorHex"
                    class="block w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm uppercase focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </span>
              </label>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Accent</span>
                <span class="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    [(ngModel)]="form.accentColor"
                    name="accentColor"
                    class="h-9 w-12 rounded border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    [(ngModel)]="form.accentColor"
                    name="accentColorHex"
                    class="block w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm uppercase focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </span>
              </label>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Fundal</span>
                <span class="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    [(ngModel)]="form.backgroundColor"
                    name="backgroundColor"
                    class="h-9 w-12 rounded border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    [(ngModel)]="form.backgroundColor"
                    name="backgroundColorHex"
                    class="block w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm uppercase focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </span>
              </label>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Text</span>
                <span class="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    [(ngModel)]="form.textColor"
                    name="textColor"
                    class="h-9 w-12 rounded border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    [(ngModel)]="form.textColor"
                    name="textColorHex"
                    class="block w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm uppercase focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </span>
              </label>
            </div>
            <div
              class="mt-4 rounded-lg border border-gray-200 p-3"
              [style.background-color]="form.backgroundColor"
              [style.color]="form.textColor"
            >
              <p class="text-xs uppercase tracking-wide mb-2 opacity-80">Previzualizare rapidă</p>
              <p class="text-sm font-semibold" [style.color]="form.primaryColor">Titlu principal</p>
              <p class="text-sm" [style.color]="form.secondaryColor">Subtitlu / element secundar</p>
              <button
                type="button"
                class="mt-2 px-3 py-1 rounded text-xs font-medium text-white"
                [style.background-color]="form.accentColor"
              >
                Buton accent
              </button>
            </div>
          </section>

          <!-- Social -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-4">Rețele sociale</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Facebook</span>
                <input
                  type="url"
                  [ngModel]="form.facebookUrl ?? ''"
                  (ngModelChange)="form.facebookUrl = $event.trim() || null"
                  name="facebookUrl"
                  placeholder="https://…"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </label>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Twitter / X</span>
                <input
                  type="url"
                  [ngModel]="form.twitterUrl ?? ''"
                  (ngModelChange)="form.twitterUrl = $event.trim() || null"
                  name="twitterUrl"
                  placeholder="https://…"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </label>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">YouTube</span>
                <input
                  type="url"
                  [ngModel]="form.youtubeUrl ?? ''"
                  (ngModelChange)="form.youtubeUrl = $event.trim() || null"
                  name="youtubeUrl"
                  placeholder="https://…"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </label>
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Instagram</span>
                <input
                  type="url"
                  [ngModel]="form.instagramUrl ?? ''"
                  (ngModelChange)="form.instagramUrl = $event.trim() || null"
                  name="instagramUrl"
                  placeholder="https://…"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </label>
            </div>
          </section>

          <!-- Footer + pagini informative -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-4">Footer și pagini informative</h2>
            <div class="space-y-4">
              <label class="block">
                <span class="text-sm font-medium text-gray-700">Info contact în footer (HTML)</span>
                <textarea
                  [ngModel]="form.footerContactInfo ?? ''"
                  (ngModelChange)="form.footerContactInfo = $event || null"
                  name="footerContactInfo"
                  rows="4"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="<p>Email: contact@site.ro</p>"
                ></textarea>
              </label>

              <label class="block">
                <span class="text-sm font-medium text-gray-700">Pagina Contact (HTML)</span>
                <textarea
                  [ngModel]="form.contactPageHtml ?? ''"
                  (ngModelChange)="form.contactPageHtml = $event || null"
                  name="contactPageHtml"
                  rows="8"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                ></textarea>
              </label>

              <label class="block">
                <span class="text-sm font-medium text-gray-700"
                  >Pagina Termeni și condiții (HTML)</span
                >
                <textarea
                  [ngModel]="form.termsPageHtml ?? ''"
                  (ngModelChange)="form.termsPageHtml = $event || null"
                  name="termsPageHtml"
                  rows="8"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                ></textarea>
              </label>

              <label class="block">
                <span class="text-sm font-medium text-gray-700"
                  >Pagina Protecția datelor – GDPR (HTML)</span
                >
                <textarea
                  [ngModel]="form.privacyPageHtml ?? ''"
                  (ngModelChange)="form.privacyPageHtml = $event || null"
                  name="privacyPageHtml"
                  rows="8"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                ></textarea>
              </label>

              <label class="block">
                <span class="text-sm font-medium text-gray-700">Pagina Politica Cookie (HTML)</span>
                <textarea
                  [ngModel]="form.cookiePageHtml ?? ''"
                  (ngModelChange)="form.cookiePageHtml = $event || null"
                  name="cookiePageHtml"
                  rows="8"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                ></textarea>
              </label>
            </div>
          </section>

          <div class="flex items-center gap-3">
            <button
              type="submit"
              [disabled]="saving() || !isAdmin()"
              class="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style="background-color: #8A0808"
            >
              {{ saving() ? 'Se salvează…' : 'Salvează' }}
            </button>
            @if (!isAdmin()) {
              <span class="text-xs text-amber-600"
                >Doar administratorii pot modifica setările.</span
              >
            }
          </div>
        </form>
      }
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthStore);
  private readonly defaultColors = {
    primaryColor: '#8A0808',
    secondaryColor: '#1a1a1a',
    accentColor: '#c0392b',
    backgroundColor: '#ffffff',
    textColor: '#2d2d2d',
  } as const;

  loading = signal(true);
  saving = signal(false);
  savingPseudonyms = signal(false);
  uploadingLogo = signal(false);
  menuCategories = signal<AdminCategory[]>([]);
  form: AdminSettings | null = null;
  pseudonyms: string[] = [];
  newPseudonym = '';

  fontWeights = [
    { value: 400, label: 'Normal (400)' },
    { value: 500, label: 'Mediu (500)' },
    { value: 600, label: 'Semibold (600)' },
    { value: 700, label: 'Bold (700)' },
    { value: 800, label: 'Extrabold (800)' },
  ];

  typographyRows: {
    label: string;
    hint: string;
    sizeKey: keyof AdminSettings;
    weightKey: keyof AdminSettings;
  }[] = [
    {
      label: 'Titluri în liste',
      hint: 'Titlurile știrilor din liste și pagini de categorii',
      sizeKey: 'newsTitleFontSize',
      weightKey: 'newsTitleFontWeight',
    },
    {
      label: 'Sumar în liste',
      hint: 'Rezumatul știrilor din liste și hero',
      sizeKey: 'newsSummaryFontSize',
      weightKey: 'newsSummaryFontWeight',
    },
    {
      label: 'Titlu hero',
      hint: 'Titlul articolului principal (recomandare)',
      sizeKey: 'heroTitleFontSize',
      weightKey: 'heroTitleFontWeight',
    },
    {
      label: 'Titluri sidebar',
      hint: 'Titlurile articolelor mici din sidebar',
      sizeKey: 'sidebarTitleFontSize',
      weightKey: 'sidebarTitleFontWeight',
    },
    {
      label: 'Titlu articol',
      hint: 'Titlul de pe pagina articolului',
      sizeKey: 'articleTitleFontSize',
      weightKey: 'articleTitleFontWeight',
    },
    {
      label: 'Conținut articol',
      hint: 'Textul articolului',
      sizeKey: 'articleContentFontSize',
      weightKey: 'articleContentFontWeight',
    },
  ];

  isAdmin() {
    return this.auth.user()?.role === 'ADMIN';
  }

  setTagline(value: string) {
    if (this.form) this.form.tagline = value || null;
  }

  ngOnInit() {
    forkJoin({
      settings: this.api.getSettings(),
      categories: this.api.getCategories(),
      me: this.api.getMe(),
    }).subscribe({
      next: ({ settings, categories, me }) => {
        this.form = settings;
        this.menuCategories.set(categories.filter((cat) => cat.showInMenu));
        this.pseudonyms = [...(me.pseudonyms ?? [])];
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Nu s-au putut încărca setările.');
        this.loading.set(false);
      },
    });
  }

  isMoreCategorySelected(categoryId: string) {
    return this.form?.headerMoreCategoryIds.includes(categoryId) ?? false;
  }

  toggleMoreCategory(categoryId: string, checked: boolean) {
    if (!this.form) return;
    const next = new Set(this.form.headerMoreCategoryIds);
    if (checked) next.add(categoryId);
    else next.delete(categoryId);
    this.form.headerMoreCategoryIds = Array.from(next);
  }

  addPseudonym() {
    const value = this.newPseudonym.trim();
    if (!value) return;
    const exists = this.pseudonyms.some((p) => p.toLowerCase() === value.toLowerCase());
    if (exists) {
      this.toast.error('Acest pseudonim există deja.');
      return;
    }
    if (this.pseudonyms.length >= 20) {
      this.toast.error('Poți salva maximum 20 de pseudonime.');
      return;
    }
    this.pseudonyms = [...this.pseudonyms, value];
    this.newPseudonym = '';
  }

  removePseudonym(index: number) {
    this.pseudonyms = this.pseudonyms.filter((_, i) => i !== index);
  }

  async savePseudonyms() {
    if (this.savingPseudonyms()) return;
    this.savingPseudonyms.set(true);
    try {
      const me = await firstValueFrom(this.api.updateMe({ pseudonyms: this.pseudonyms }));
      this.pseudonyms = [...(me.pseudonyms ?? [])];
      this.auth.patchUser({ pseudonyms: me.pseudonyms ?? [] });
      this.toast.success('Pseudonime salvate.');
    } catch {
      this.toast.error('Salvarea pseudonimelor a eșuat.');
    } finally {
      this.savingPseudonyms.set(false);
    }
  }

  onLogoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.form) return;
    this.uploadingLogo.set(true);
    this.api.uploadMedia(file).subscribe({
      next: (media) => {
        if (!this.form) {
          this.uploadingLogo.set(false);
          return;
        }
        this.form.logoMediaId = media.id;
        this.form.logoUrl = media.url;
        this.uploadingLogo.set(false);
        this.toast.success('Sigla a fost încărcată.');
      },
      error: (e) => {
        this.uploadingLogo.set(false);
        this.toast.error(e?.error?.message || 'Încărcarea siglei a eșuat.');
      },
    });
  }

  removeLogo() {
    if (!this.form) return;
    this.form.logoMediaId = null;
    this.form.logoUrl = null;
  }

  resetColors() {
    if (!this.form) return;
    this.form.primaryColor = this.defaultColors.primaryColor;
    this.form.secondaryColor = this.defaultColors.secondaryColor;
    this.form.accentColor = this.defaultColors.accentColor;
    this.form.backgroundColor = this.defaultColors.backgroundColor;
    this.form.textColor = this.defaultColors.textColor;
  }

  save() {
    const m = this.form;
    if (!m) return;
    this.saving.set(true);
    this.api
      .updateSettings({
        siteName: m.siteName,
        tagline: m.tagline,
        logoMediaId: m.logoMediaId ?? null,
        primaryColor: m.primaryColor,
        secondaryColor: m.secondaryColor,
        accentColor: m.accentColor,
        backgroundColor: m.backgroundColor,
        textColor: m.textColor,
        headingFont: m.headingFont,
        bodyFont: m.bodyFont,
        headerMaxCategories: Number(m.headerMaxCategories),
        headerShowMoreDropdown: m.headerShowMoreDropdown,
        headerMoreCategoryIds: m.headerMoreCategoryIds,
        newsTitleFontSize: Number(m.newsTitleFontSize),
        newsTitleFontWeight: Number(m.newsTitleFontWeight),
        newsSummaryFontSize: Number(m.newsSummaryFontSize),
        newsSummaryFontWeight: Number(m.newsSummaryFontWeight),
        defaultSummaryRows: Math.max(1, Math.min(8, Math.floor(Number(m.defaultSummaryRows) || 3))),
        heroTitleFontSize: Number(m.heroTitleFontSize),
        heroTitleFontWeight: Number(m.heroTitleFontWeight),
        sidebarTitleFontSize: Number(m.sidebarTitleFontSize),
        sidebarTitleFontWeight: Number(m.sidebarTitleFontWeight),
        articleTitleFontSize: Number(m.articleTitleFontSize),
        articleTitleFontWeight: Number(m.articleTitleFontWeight),
        articleContentFontSize: Number(m.articleContentFontSize),
        articleContentFontWeight: Number(m.articleContentFontWeight),
        showArticleViews: m.showArticleViews,
        facebookUrl: m.facebookUrl,
        twitterUrl: m.twitterUrl,
        youtubeUrl: m.youtubeUrl,
        instagramUrl: m.instagramUrl,
        footerHtml: m.footerHtml,
        footerContactInfo: m.footerContactInfo,
        contactPageHtml: m.contactPageHtml,
        termsPageHtml: m.termsPageHtml,
        privacyPageHtml: m.privacyPageHtml,
        cookiePageHtml: m.cookiePageHtml,
      })
      .subscribe({
        next: (s) => {
          this.form = s;
          this.saving.set(false);
          this.toast.success('Setări salvate.');
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Salvarea a eșuat.');
        },
      });
  }
}
