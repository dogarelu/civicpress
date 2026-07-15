import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthStore } from '../services/auth.store';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'cp-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- Toast container -->
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
      @for (toast of toasts(); track toast.id) {
        <div
          class="px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs"
          [class.bg-green-600]="toast.type === 'success'"
          [class.bg-red-600]="toast.type === 'error'"
          [class.bg-blue-600]="toast.type === 'info'"
          [class.text-white]="true"
        >
          {{ toast.message }}
        </div>
      }
    </div>

    <div class="flex h-screen bg-gray-100">
      <!-- Sidebar -->
      <aside class="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div class="px-4 py-5 border-b border-gray-700">
          <a
            href="/"
            target="_blank"
            class="text-lg font-bold text-red-400 hover:text-red-300 transition-colors"
          >
            Civicpress
          </a>
          <p class="text-xs text-gray-400 mt-0.5">Admin Panel</p>
        </div>

        <nav class="flex-1 py-4">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-gray-700 text-white"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Dashboard
          </a>
          <a
            routerLink="/posts"
            routerLinkActive="bg-gray-700 text-white"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Articole
          </a>
          @if (auth.isEditor()) {
            <a
              routerLink="/categories"
              routerLinkActive="bg-gray-700 text-white"
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Categorii
            </a>
            <a
              routerLink="/pills"
              routerLinkActive="bg-gray-700 text-white"
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Pill-uri
            </a>
            <a
              routerLink="/layouts"
              routerLinkActive="bg-gray-700 text-white"
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12-1a1 1 0 00-1 1v6a1 1 0 001 1h3a1 1 0 001-1v-6a1 1 0 00-1-1h-3z"
                />
              </svg>
              Aspect pagini
            </a>
          }
          @if (auth.isAdmin()) {
            <a
              routerLink="/users"
              routerLinkActive="bg-gray-700 text-white"
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Utilizatori
            </a>
          }
          <a
            routerLink="/audit"
            routerLinkActive="bg-gray-700 text-white"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Jurnal activitate
          </a>
          @if (auth.isEditor()) {
            <a
              routerLink="/settings"
              routerLinkActive="bg-gray-700 text-white"
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Setări
            </a>
          }
          <a
            routerLink="/notifications"
            routerLinkActive="bg-gray-700 text-white"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            Notificări
          </a>
        </nav>

        <div class="px-4 py-4 border-t border-gray-700">
          @if (user()) {
            <div class="mb-3">
              <p class="text-xs font-medium text-white truncate">{{ user()!.displayName }}</p>
              <p class="text-xs text-gray-400 truncate">{{ user()!.email }}</p>
              <span
                class="inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium"
                [class.bg-red-700]="user()!.role === 'ADMIN'"
                [class.bg-blue-700]="user()!.role === 'EDITOR'"
                [class.bg-gray-600]="user()!.role === 'AUTHOR'"
                >{{ user()!.role }}</span
              >
            </div>
          }
          <button
            (click)="logout()"
            class="w-full text-left text-xs text-gray-400 hover:text-white transition-colors py-1"
          >
            ← Deconectare
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="flex-1 overflow-y-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminShellComponent implements OnInit {
  private authStore = inject(AuthStore);
  private toastSvc = inject(ToastService);
  private router = inject(Router);

  auth = this.authStore;
  user = this.authStore.user;
  toasts = this.toastSvc.toasts;

  ngOnInit() {
    this.authStore.hydrate();
  }

  async logout() {
    await this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
