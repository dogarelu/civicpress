import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { UserDrawerComponent, DrawerMode } from './user-drawer.component';
import type { UserSummary } from '@civicpress/shared';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  CHIEF_EDITOR: 'Editor șef',
  EDITOR: 'Editor',
  AUTHOR: 'Autor',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  CHIEF_EDITOR: 'bg-purple-100 text-purple-700',
  EDITOR: 'bg-blue-100 text-blue-700',
  AUTHOR: 'bg-gray-100 text-gray-700',
};

@Component({
  selector: 'cp-users-list',
  standalone: true,
  imports: [UserDrawerComponent],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Utilizatori</h1>
        <button
          (click)="openCreate()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style="background-color: #8A0808"
        >
          + Utilizator nou
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="text-left px-4 py-3 font-medium text-gray-600">Nume</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">
                Email
              </th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                Status
              </th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">
                Ultima autentificare
              </th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">
                Creat la
              </th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="6" class="text-center py-10 text-gray-400">Se încarcă...</td>
              </tr>
            } @else if (users().length === 0) {
              <tr>
                <td colspan="6" class="text-center py-10 text-gray-400">Niciun utilizator.</td>
              </tr>
            }
            @for (user of users(); track user.id) {
              <tr
                class="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                (click)="openInfo(user)"
              >
                <td class="px-4 py-3">
                  <span class="font-medium text-gray-800">{{ user.displayName }}</span>
                </td>
                <td class="px-4 py-3 hidden sm:table-cell text-gray-500">{{ user.email }}</td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    [class]="roleClass(user.role)"
                  >
                    {{ roleLabel(user.role) }}
                  </span>
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  @if (user.isActive) {
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"
                    >
                      Activ
                    </span>
                  } @else {
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                    >
                      Inactiv
                    </span>
                  }
                </td>
                <td class="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                  {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : '—' }}
                </td>
                <td class="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                  {{ formatDate(user.createdAt) }}
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (total() > perPage) {
          <div
            class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500"
          >
            <span>{{ total() }} utilizatori total</span>
            <div class="flex gap-2">
              <button
                (click)="prevPage()"
                [disabled]="page() === 1"
                class="px-3 py-1 border rounded text-xs disabled:opacity-40"
              >
                ← Prev
              </button>
              <span class="px-2 py-1 text-xs">Pagina {{ page() }}</span>
              <button
                (click)="nextPage()"
                [disabled]="page() * perPage >= total()"
                class="px-3 py-1 border rounded text-xs disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        }
      </div>
    </div>

    @if (drawerOpen()) {
      <cp-user-drawer
        [mode]="drawerMode()"
        [userId]="selectedUserId()"
        (closed)="closeDrawer()"
        (saved)="onSaved()"
      />
    }
  `,
})
export class UsersListComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  users = signal<UserSummary[]>([]);
  total = signal(0);
  page = signal(1);
  perPage = 20;
  loading = signal(false);

  drawerOpen = signal(false);
  drawerMode = signal<DrawerMode>('info');
  selectedUserId = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getUsers(this.page(), this.perPage).subscribe({
      next: (r) => {
        this.users.set(r.users);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Eroare la încărcarea utilizatorilor');
        this.loading.set(false);
      },
    });
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  nextPage() {
    this.page.update((p) => p + 1);
    this.load();
  }

  openInfo(user: UserSummary) {
    this.selectedUserId.set(user.id);
    this.drawerMode.set('info');
    this.drawerOpen.set(true);
  }

  openCreate() {
    this.selectedUserId.set(null);
    this.drawerMode.set('create');
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    this.selectedUserId.set(null);
  }

  onSaved() {
    this.closeDrawer();
    this.load();
  }

  roleLabel(role: string) {
    return ROLE_LABELS[role] ?? role;
  }

  roleClass(role: string) {
    return ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700';
  }

  formatDate(d: string) {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d));
  }
}
