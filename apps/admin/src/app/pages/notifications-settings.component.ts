import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthStore } from '../services/auth.store';
import { ApiService } from '../services/api.service';

interface NotifForm {
  notificationEmail: string;
  signalNumber: string;
  notifyReviewEmail: boolean;
  notifyReviewSignal: boolean;
}

@Component({
  selector: 'cp-notifications-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-2xl">
      <h1 class="text-2xl font-bold text-gray-800 mb-1">Notificări</h1>
      <p class="text-sm text-gray-500 mb-6">Alege unde și când vrei să primești alerte automate.</p>

      @if (loading()) {
        <p class="text-sm text-gray-400">Se încarcă…</p>
      } @else if (form) {
        <form (ngSubmit)="save()" class="space-y-6">
          <!-- Contact details -->
          <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="font-semibold text-gray-800 mb-4">Date de contact pentru notificări</h2>

            <label class="block mb-4">
              <span class="text-sm font-medium text-gray-700">Adresă email pentru notificări</span>
              <input
                type="email"
                [(ngModel)]="form.notificationEmail"
                name="notificationEmail"
                placeholder="exemplu@email.com"
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span class="mt-1 block text-xs text-gray-400">
                Lasă gol pentru a nu primi email-uri.
              </span>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Număr de telefon Signal</span>
              <input
                type="tel"
                [(ngModel)]="form.signalNumber"
                name="signalNumber"
                placeholder="+40712345678"
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span class="mt-1 block text-xs text-gray-400">
                Format E.164 (ex: +40712345678). Lasă gol pentru a nu primi mesaje Signal.
              </span>
            </label>
          </section>

          <!-- Alert subscriptions -->
          @if (auth.isEditor()) {
            <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 class="font-semibold text-gray-800 mb-1">Alerte</h2>
              <p class="text-xs text-gray-400 mb-4">
                Bifează canalele pe care vrei să le primești pentru fiecare tip de alertă.
              </p>

              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-100">
                      <th class="text-left font-medium text-gray-600 pb-2 pr-6">Eveniment</th>
                      <th class="text-center font-medium text-gray-600 pb-2 px-4 w-24">
                        <div class="flex flex-col items-center gap-1">
                          <svg
                            class="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          Email
                        </div>
                      </th>
                      <th class="text-center font-medium text-gray-600 pb-2 px-4 w-24">
                        <div class="flex flex-col items-center gap-1">
                          <svg
                            class="w-4 h-4 text-gray-500"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
                            />
                          </svg>
                          Signal
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b border-gray-50">
                      <td class="py-3 pr-6 text-gray-700">
                        <span class="font-medium">Articol trimis spre revizie</span>
                        <p class="text-xs text-gray-400 mt-0.5">
                          Primești o alertă când un autor trimite un articol nou pentru verificare.
                        </p>
                      </td>
                      <td class="text-center py-3 px-4">
                        <input
                          type="checkbox"
                          [(ngModel)]="form.notifyReviewEmail"
                          name="notifyReviewEmail"
                          class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          [disabled]="!form.notificationEmail"
                          title="{{
                            !form.notificationEmail ? 'Adaugă mai întâi o adresă email' : ''
                          }}"
                        />
                      </td>
                      <td class="text-center py-3 px-4">
                        <input
                          type="checkbox"
                          [(ngModel)]="form.notifyReviewSignal"
                          name="notifyReviewSignal"
                          class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          [disabled]="!form.signalNumber"
                          title="{{ !form.signalNumber ? 'Adaugă mai întâi un număr Signal' : '' }}"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p class="mt-3 text-xs text-gray-400">
                Bifa este dezactivată automat dacă nu ai completat datele de contact
                corespunzătoare.
              </p>
            </section>
          }

          <div class="flex items-center gap-3">
            <button
              type="submit"
              [disabled]="saving()"
              class="px-5 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
            >
              {{ saving() ? 'Se salvează…' : 'Salvează' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class NotificationsSettingsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthStore);

  loading = signal(true);
  saving = signal(false);
  form: NotifForm | null = null;

  async ngOnInit() {
    try {
      const me = await firstValueFrom(this.api.getMe());
      this.form = {
        notificationEmail: me.notificationEmail ?? '',
        signalNumber: me.signalNumber ?? '',
        notifyReviewEmail: me.notifyReviewEmail ?? false,
        notifyReviewSignal: me.notifyReviewSignal ?? false,
      };
    } catch {
      this.toast.error('Nu s-au putut încărca preferințele.');
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    if (!this.form) return;
    this.saving.set(true);

    const payload = {
      notificationEmail: this.form.notificationEmail?.trim() || null,
      signalNumber: this.form.signalNumber?.trim() || null,
      notifyReviewEmail: this.form.notifyReviewEmail,
      notifyReviewSignal: this.form.notifyReviewSignal,
    };

    if (!payload.notificationEmail) payload.notifyReviewEmail = false;
    if (!payload.signalNumber) payload.notifyReviewSignal = false;

    try {
      await firstValueFrom(this.api.updateMe(payload));
      if (!payload.notificationEmail) this.form.notifyReviewEmail = false;
      if (!payload.signalNumber) this.form.notifyReviewSignal = false;
      this.toast.success('Preferințe salvate.');
    } catch {
      this.toast.error('Salvarea a eșuat. Încearcă din nou.');
    } finally {
      this.saving.set(false);
    }
  }
}
