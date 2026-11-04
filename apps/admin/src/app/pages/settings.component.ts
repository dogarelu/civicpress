import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';
import { AuthStore } from '../services/auth.store';
import { firstValueFrom, forkJoin } from 'rxjs';
import type { AdminSettings, SettingsUpdate } from '@civicpress/shared';

@Component({
  selector: 'cp-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="p-6 max-w-3xl">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Setări</h1>

      @if (loading()) {
        <p class="text-sm text-gray-400">Se încarcă…</p>
      } @else if (form) {
        @if (!isAdmin()) {
          <p class="mb-4 text-xs text-amber-600">Doar administratorii pot modifica setările.</p>
        }
        <div class="space-y-6">
          <!-- Meniu / Header -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-2">Meniu principal</h2>
            <p class="text-sm text-gray-600">
              Meniul desktop (categorii, culori, font, „Mai multe”) se configurează la
              <a
                routerLink="/layouts"
                [queryParams]="{ tab: 'tickers' }"
                class="text-red-700 underline"
                >Aspect pagini → Benzi de sus</a
              >.
            </p>
            <p class="text-xs text-gray-400 mt-2">
              Flag-urile din Categorii (web / burger / rând mobil) rămân valabile pentru meniul de
              pe telefon.
            </p>
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

            <label class="mt-4 block">
              <span class="text-sm font-medium text-gray-700">Format dată</span>
              <select
                [(ngModel)]="form.postDateFormat"
                name="postDateFormat"
                class="mt-1 block w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="time-if-today">Oră dacă e azi, dată în rest</option>
                <option value="always-date">Întotdeauna data (inclusiv azi)</option>
              </select>
              <span class="mt-1 block text-xs text-gray-400">
                Implicit, articolele de azi arată ora (ex. 14:30), iar celelalte arată data.
                Modulele pot suprascrie această valoare din Aspect.
              </span>
            </label>

            <label class="mt-4 block">
              <span class="text-sm font-medium text-gray-700">Rânduri rezumat (implicit)</span>
              <input
                type="number"
                min="1"
                [(ngModel)]="form.defaultSummaryRows"
                name="defaultSummaryRows"
                class="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span class="mt-1 block text-xs text-gray-400">
                Numărul de rânduri afișate din rezumat pe site. Modulele pot suprascrie această
                valoare din Aspect.
              </span>
            </label>

            <div class="mt-5 flex justify-end">
              <button
                type="button"
                (click)="saveArticleDisplay()"
                [disabled]="isSaving('articleDisplay') || !isAdmin()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style="background-color: #8A0808"
              >
                {{ isSaving('articleDisplay') ? 'Se salvează…' : 'Salvează' }}
              </button>
            </div>
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
                {{ savingPseudonyms() ? 'Se salvează…' : 'Salvează' }}
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
            <div class="mt-4 space-y-5">
              <div class="space-y-3">
                <p class="text-sm font-medium text-gray-700">Siglă desktop</p>
                <div class="flex items-center gap-3">
                  <div
                    class="h-16 w-28 rounded border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
                  >
                    @if (form.logoUrl) {
                      <img
                        [src]="form.logoUrl"
                        alt="Siglă desktop"
                        class="h-full w-full object-contain"
                      />
                    } @else {
                      <span class="text-xs text-gray-400 px-2 text-center">Fără siglă</span>
                    }
                  </div>
                  <div class="text-xs text-gray-500">
                    Apare în header-ul desktop. Formate recomandate: PNG, SVG, WebP.
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

              <div class="space-y-3 border-t border-gray-100 pt-4">
                <p class="text-sm font-medium text-gray-700">Siglă mobil</p>
                <div class="flex items-center gap-3">
                  <div
                    class="h-10 w-40 rounded border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
                  >
                    @if (form.mobileLogoUrl) {
                      <img
                        [src]="form.mobileLogoUrl"
                        alt="Siglă mobil"
                        class="h-full w-full object-contain"
                      />
                    } @else {
                      <span class="text-xs text-gray-400 px-2 text-center">Fără siglă mobil</span>
                    }
                  </div>
                  <div class="text-xs text-gray-500">
                    Variantă mai lată și mai scundă pentru header-ul mobil. Dacă lipsește, se
                    folosește sigla desktop.
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    (change)="onMobileLogoChange($event)"
                    class="block text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                  <button
                    type="button"
                    (click)="removeMobileLogo()"
                    [disabled]="
                      uploadingMobileLogo() || (!form.mobileLogoMediaId && !form.mobileLogoUrl)
                    "
                    class="px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Elimină sigla mobil
                  </button>
                  @if (uploadingMobileLogo()) {
                    <span class="text-xs text-gray-400">Se încarcă sigla mobil…</span>
                  }
                </div>
              </div>
            </div>

            <div class="mt-5 flex justify-end">
              <button
                type="button"
                (click)="saveIdentity()"
                [disabled]="isSaving('identity') || !isAdmin()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style="background-color: #8A0808"
              >
                {{ isSaving('identity') ? 'Se salvează…' : 'Salvează' }}
              </button>
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

            <div class="mt-5 flex justify-end">
              <button
                type="button"
                (click)="saveColors()"
                [disabled]="isSaving('colors') || !isAdmin()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style="background-color: #8A0808"
              >
                {{ isSaving('colors') ? 'Se salvează…' : 'Salvează' }}
              </button>
            </div>
          </section>

          <!-- Social -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-1">Rețele sociale</h2>
            <p class="text-xs text-gray-400 mb-3">
              Iconurile apar doar dacă URL-ul este completat, bifa „Afișează” este activă și locația
              de mai jos este bifată.
            </p>
            <p class="text-sm font-medium text-gray-700 mb-2">Afișează în</p>
            <div class="mb-4 flex flex-wrap gap-x-5 gap-y-2">
              <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="form.showSocialInHeader"
                  name="showSocialInHeader"
                  class="rounded border-gray-300"
                />
                Linia de categorii (desktop)
              </label>
              <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="form.showSocialInMobileMenu"
                  name="showSocialInMobileMenu"
                  class="rounded border-gray-300"
                />
                Meniu burger (mobil)
              </label>
              <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="form.showSocialInFooter"
                  name="showSocialInFooter"
                  class="rounded border-gray-300"
                />
                Footer
              </label>
            </div>
            <div class="space-y-3">
              <div class="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="form.showFacebook"
                    name="showFacebook"
                    class="rounded border-gray-300"
                  />
                  Facebook
                </label>
                <input
                  type="url"
                  [ngModel]="form.facebookUrl ?? ''"
                  (ngModelChange)="form.facebookUrl = $event.trim() || null"
                  name="facebookUrl"
                  placeholder="https://…"
                  class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div class="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="form.showInstagram"
                    name="showInstagram"
                    class="rounded border-gray-300"
                  />
                  Instagram
                </label>
                <input
                  type="url"
                  [ngModel]="form.instagramUrl ?? ''"
                  (ngModelChange)="form.instagramUrl = $event.trim() || null"
                  name="instagramUrl"
                  placeholder="https://…"
                  class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div class="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="form.showTwitter"
                    name="showTwitter"
                    class="rounded border-gray-300"
                  />
                  Twitter / X
                </label>
                <input
                  type="url"
                  [ngModel]="form.twitterUrl ?? ''"
                  (ngModelChange)="form.twitterUrl = $event.trim() || null"
                  name="twitterUrl"
                  placeholder="https://…"
                  class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div class="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="form.showYoutube"
                    name="showYoutube"
                    class="rounded border-gray-300"
                  />
                  YouTube
                </label>
                <input
                  type="url"
                  [ngModel]="form.youtubeUrl ?? ''"
                  (ngModelChange)="form.youtubeUrl = $event.trim() || null"
                  name="youtubeUrl"
                  placeholder="https://…"
                  class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div class="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="form.showWhatsapp"
                    name="showWhatsapp"
                    class="rounded border-gray-300"
                  />
                  WhatsApp
                </label>
                <input
                  type="url"
                  [ngModel]="form.whatsappUrl ?? ''"
                  (ngModelChange)="form.whatsappUrl = $event.trim() || null"
                  name="whatsappUrl"
                  placeholder="https://wa.me/40…"
                  class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div class="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="form.showTiktok"
                    name="showTiktok"
                    class="rounded border-gray-300"
                  />
                  TikTok
                </label>
                <input
                  type="url"
                  [ngModel]="form.tiktokUrl ?? ''"
                  (ngModelChange)="form.tiktokUrl = $event.trim() || null"
                  name="tiktokUrl"
                  placeholder="https://…"
                  class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div class="mt-5 flex justify-end">
              <button
                type="button"
                (click)="saveSocial()"
                [disabled]="isSaving('social') || !isAdmin()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style="background-color: #8A0808"
              >
                {{ isSaving('social') ? 'Se salvează…' : 'Salvează' }}
              </button>
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

            <div class="mt-5 flex justify-end">
              <button
                type="button"
                (click)="saveFooterPages()"
                [disabled]="isSaving('footer') || !isAdmin()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style="background-color: #8A0808"
              >
                {{ isSaving('footer') ? 'Se salvează…' : 'Salvează' }}
              </button>
            </div>
          </section>
        </div>
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
  savingSection = signal<string | null>(null);
  savingPseudonyms = signal(false);
  uploadingLogo = signal(false);
  uploadingMobileLogo = signal(false);
  form: AdminSettings | null = null;
  pseudonyms: string[] = [];
  newPseudonym = '';

  isAdmin() {
    return this.auth.user()?.role === 'ADMIN';
  }

  isSaving(section: string) {
    return this.savingSection() === section;
  }

  setTagline(value: string) {
    if (this.form) this.form.tagline = value || null;
  }

  ngOnInit() {
    forkJoin({
      settings: this.api.getSettings(),
      me: this.api.getMe(),
    }).subscribe({
      next: ({ settings, me }) => {
        this.form = this.normalizeSettings(settings);
        this.pseudonyms = [...(me.pseudonyms ?? [])];
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Nu s-au putut încărca setările.');
        this.loading.set(false);
      },
    });
  }

  private normalizeSettings(settings: AdminSettings): AdminSettings {
    return {
      ...settings,
      postDateFormat: settings.postDateFormat === 'always-date' ? 'always-date' : 'time-if-today',
      tickerBgColor: settings.tickerBgColor ?? '#8A0808',
      tickerTextColor: settings.tickerTextColor ?? '#FFFFFF',
      tickerFontWeight: settings.tickerFontWeight ?? 600,
    };
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

  onMobileLogoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.form) return;
    this.uploadingMobileLogo.set(true);
    this.api.uploadMedia(file).subscribe({
      next: (media) => {
        if (!this.form) {
          this.uploadingMobileLogo.set(false);
          return;
        }
        this.form.mobileLogoMediaId = media.id;
        this.form.mobileLogoUrl = media.url;
        this.uploadingMobileLogo.set(false);
        this.toast.success('Sigla mobil a fost încărcată.');
      },
      error: (e) => {
        this.uploadingMobileLogo.set(false);
        this.toast.error(e?.error?.message || 'Încărcarea siglei mobil a eșuat.');
      },
    });
  }

  removeMobileLogo() {
    if (!this.form) return;
    this.form.mobileLogoMediaId = null;
    this.form.mobileLogoUrl = null;
  }

  resetColors() {
    if (!this.form) return;
    this.form.primaryColor = this.defaultColors.primaryColor;
    this.form.secondaryColor = this.defaultColors.secondaryColor;
    this.form.accentColor = this.defaultColors.accentColor;
    this.form.backgroundColor = this.defaultColors.backgroundColor;
    this.form.textColor = this.defaultColors.textColor;
  }

  saveArticleDisplay() {
    const m = this.form;
    if (!m) return;
    this.saveSection('articleDisplay', {
      showArticleViews: m.showArticleViews,
      postDateFormat: m.postDateFormat === 'always-date' ? 'always-date' : 'time-if-today',
      defaultSummaryRows: Math.max(1, Math.floor(Number(m.defaultSummaryRows) || 3)),
    });
  }

  saveIdentity() {
    const m = this.form;
    if (!m) return;
    this.saveSection('identity', {
      siteName: m.siteName,
      tagline: m.tagline,
      logoMediaId: m.logoMediaId ?? null,
      mobileLogoMediaId: m.mobileLogoMediaId ?? null,
    });
  }

  saveColors() {
    const m = this.form;
    if (!m) return;
    this.saveSection('colors', {
      primaryColor: m.primaryColor,
      secondaryColor: m.secondaryColor,
      accentColor: m.accentColor,
      backgroundColor: m.backgroundColor,
      textColor: m.textColor,
    });
  }

  saveSocial() {
    const m = this.form;
    if (!m) return;
    this.saveSection('social', {
      facebookUrl: m.facebookUrl,
      twitterUrl: m.twitterUrl,
      youtubeUrl: m.youtubeUrl,
      instagramUrl: m.instagramUrl,
      whatsappUrl: m.whatsappUrl,
      tiktokUrl: m.tiktokUrl,
      showFacebook: m.showFacebook,
      showTwitter: m.showTwitter,
      showYoutube: m.showYoutube,
      showInstagram: m.showInstagram,
      showWhatsapp: m.showWhatsapp,
      showTiktok: m.showTiktok,
      showSocialInHeader: m.showSocialInHeader,
      showSocialInMobileMenu: m.showSocialInMobileMenu,
      showSocialInFooter: m.showSocialInFooter,
    });
  }

  saveFooterPages() {
    const m = this.form;
    if (!m) return;
    this.saveSection('footer', {
      footerContactInfo: m.footerContactInfo,
      contactPageHtml: m.contactPageHtml,
      termsPageHtml: m.termsPageHtml,
      privacyPageHtml: m.privacyPageHtml,
      cookiePageHtml: m.cookiePageHtml,
    });
  }

  private saveSection(section: string, payload: SettingsUpdate) {
    if (this.savingSection() || !this.isAdmin()) return;
    this.savingSection.set(section);
    this.api.updateSettings(payload).subscribe({
      next: (s) => {
        this.form = this.normalizeSettings(s);
        this.savingSection.set(null);
        this.toast.success('Setări salvate.');
      },
      error: () => {
        this.savingSection.set(null);
        this.toast.error('Salvarea a eșuat.');
      },
    });
  }
}
