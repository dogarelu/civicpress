import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../services/auth.store';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'cp-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
        <div class="text-center mb-8">
          <div class="text-3xl font-bold mb-2" style="color: #8A0808">Civicpress</div>
          <h1 class="text-xl font-semibold text-gray-800">Autentificare Admin</h1>
        </div>

        <form (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="email">Email</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="admin@civicpress.ro"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="password"
              >Parolă</label
            >
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="••••••••"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          @if (error()) {
            <div class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200">
              {{ error() }}
            </div>
          }

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style="background-color: #8A0808"
          >
            {{ loading() ? 'Se autentifică...' : 'Autentificare' }}
          </button>
        </form>

        <p class="text-xs text-gray-400 text-center mt-6">
          <a href="http://localhost:4200" class="hover:text-gray-600 transition-colors"
            >← Înapoi la site</a
          >
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthStore);
  private router = inject(Router);
  private toast = inject(ToastService);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  async submit() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.email, this.password);
      this.toast.success('Autentificat cu succes!');
      await this.router.navigate(['/dashboard']);
    } catch {
      this.error.set('Email sau parolă incorecte.');
    } finally {
      this.loading.set(false);
    }
  }
}
