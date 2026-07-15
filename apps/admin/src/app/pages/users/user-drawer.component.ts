import {
  Component,
  inject,
  input,
  output,
  signal,
  OnInit,
  OnChanges,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthStore } from '../../services/auth.store';
import { ToastService } from '../../services/toast.service';
import type { UserDetail, AuditEntry } from '@civicpress/shared';

export type DrawerMode = 'info' | 'edit' | 'create';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  AUTHOR: 'Autor',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDITOR: 'bg-blue-100 text-blue-700',
  AUTHOR: 'bg-gray-100 text-gray-700',
};

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let pw = '';
  for (let i = 0; i < 12; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

@Component({
  selector: 'cp-user-drawer',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/40 z-40" (click)="close()"></div>

    <!-- Drawer panel -->
    <div
      class="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-md bg-white shadow-2xl"
      (click)="$event.stopPropagation()"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-800">
          @if (currentMode() === 'create') {
            Utilizator nou
          } @else if (currentMode() === 'edit') {
            Editare utilizator
          } @else {
            Informații utilizator
          }
        </h2>
        <button
          (click)="close()"
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Închide"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto">
        <!-- ═══ INFO MODE ═══ -->
        @if (currentMode() === 'info') {
          @if (loadingUser()) {
            <div class="flex items-center justify-center py-16 text-gray-400">Se încarcă...</div>
          } @else if (userDetail()) {
            <div class="p-5 space-y-5">
              <!-- Profile summary -->
              <div class="flex items-start gap-4">
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                  style="background-color: #8A0808"
                >
                  {{ initials(userDetail()!.displayName) }}
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-gray-800 text-base truncate">
                    {{ userDetail()!.displayName }}
                  </p>
                  <p class="text-sm text-gray-500 truncate">{{ userDetail()!.email }}</p>
                  <div class="flex items-center gap-2 mt-1.5">
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-medium"
                      [class]="roleClass(userDetail()!.role)"
                    >
                      {{ roleLabel(userDetail()!.role) }}
                    </span>
                    @if (!userDetail()!.isActive) {
                      <span
                        class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                      >
                        Inactiv
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- Stats row -->
              <div class="grid grid-cols-3 gap-3">
                <div class="bg-gray-50 rounded-lg p-3 text-center">
                  <p class="text-lg font-bold text-gray-800">{{ userDetail()!.postCount ?? 0 }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">Articole</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 text-center col-span-2">
                  <p class="text-sm font-medium text-gray-800 truncate">
                    {{
                      userDetail()!.lastLoginAt
                        ? formatDate(userDetail()!.lastLoginAt!)
                        : 'Niciodată'
                    }}
                  </p>
                  <p class="text-xs text-gray-500 mt-0.5">Ultima autentificare</p>
                </div>
              </div>

              <!-- Meta -->
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500">Slug</dt>
                  <dd class="font-mono text-gray-700 text-xs">{{ userDetail()!.slug }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500">Creat la</dt>
                  <dd class="text-gray-700">{{ formatDate(userDetail()!.createdAt) }}</dd>
                </div>
                @if (userDetail()!.bio) {
                  <div class="pt-1">
                    <dt class="text-gray-500 mb-1">Biografie</dt>
                    <dd class="text-gray-700">{{ userDetail()!.bio }}</dd>
                  </div>
                }
              </dl>

              <!-- Audit history -->
              <div>
                <h3 class="text-sm font-semibold text-gray-700 mb-3">Activitate recentă</h3>

                @if (loadingLogs()) {
                  <p class="text-sm text-gray-400">Se încarcă activitatea...</p>
                } @else if (logs().length === 0) {
                  <p class="text-sm text-gray-400">Nicio activitate înregistrată.</p>
                } @else {
                  <div class="space-y-2">
                    @for (log of logs(); track log.id) {
                      <div class="flex items-start gap-3 text-xs">
                        <div
                          class="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"
                        ></div>
                        <div class="min-w-0">
                          <p class="text-gray-700 font-medium">{{ formatAction(log.action) }}</p>
                          <p class="text-gray-400">
                            {{ log.entity }} · {{ formatDate(log.createdAt) }}
                          </p>
                        </div>
                      </div>
                    }
                  </div>

                  @if (logsTotal() > 20) {
                    <div class="flex items-center justify-between mt-3">
                      <button
                        (click)="prevLogsPage()"
                        [disabled]="logsPage() === 1"
                        class="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
                      >
                        ← Anterior
                      </button>
                      <span class="text-xs text-gray-400">Pagina {{ logsPage() }}</span>
                      <button
                        (click)="nextLogsPage()"
                        [disabled]="logsPage() * 20 >= logsTotal()"
                        class="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
                      >
                        Următor →
                      </button>
                    </div>
                  }
                }
              </div>
            </div>
          }
        }

        <!-- ═══ EDIT MODE ═══ -->
        @if (currentMode() === 'edit') {
          <form class="p-5 space-y-5" (ngSubmit)="submitEdit()" #editForm="ngForm">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nume afișat</label>
              <input
                type="text"
                [(ngModel)]="editDisplayName"
                name="displayName"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                [(ngModel)]="editRole"
                name="role"
                [disabled]="isSelf()"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                <option value="AUTHOR">Autor</option>
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
              </select>
              @if (isSelf()) {
                <p class="text-xs text-gray-400 mt-1">Nu îți poți schimba propriul rol.</p>
              }
            </div>

            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                [(ngModel)]="editIsActive"
                name="isActive"
                id="editIsActive"
                [disabled]="isSelf()"
                class="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 disabled:opacity-50"
              />
              <label for="editIsActive" class="text-sm text-gray-700">Cont activ</label>
              @if (isSelf()) {
                <span class="text-xs text-gray-400">(nu poți dezactiva propriul cont)</span>
              }
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Parolă nouă
                <span class="font-normal text-gray-400">(opțional)</span>
              </label>
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="editPassword"
                  name="password"
                  placeholder="Lasă gol pentru a nu schimba"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  (click)="editPassword = generatePw()"
                  class="px-3 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                >
                  Auto
                </button>
              </div>
            </div>
          </form>
        }

        <!-- ═══ CREATE MODE ═══ -->
        @if (currentMode() === 'create') {
          <form class="p-5 space-y-5" (ngSubmit)="submitCreate()" #createForm="ngForm">
            @if (createdPassword()) {
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <p class="text-sm font-medium text-green-800 mb-2">Utilizator creat cu succes!</p>
                <p class="text-xs text-green-700 mb-2">Rețineți parola — nu va mai fi afișată:</p>
                <div class="flex items-center gap-2">
                  <code
                    class="flex-1 bg-white border border-green-200 rounded px-3 py-1.5 text-sm font-mono text-green-900"
                  >
                    {{ createdPassword() }}
                  </code>
                  <button
                    type="button"
                    (click)="copyPassword()"
                    class="px-3 py-1.5 text-xs border border-green-300 text-green-700 rounded hover:bg-green-100"
                  >
                    {{ copied() ? 'Copiat!' : 'Copiază' }}
                  </button>
                </div>
                <button
                  type="button"
                  (click)="finishCreate()"
                  class="mt-3 w-full py-2 rounded-lg text-sm font-medium text-white"
                  style="background-color: #8A0808"
                >
                  Gata
                </button>
              </div>
            } @else {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  [(ngModel)]="createEmail"
                  name="email"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nume afișat</label>
                <input
                  type="text"
                  [(ngModel)]="createDisplayName"
                  name="displayName"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  [(ngModel)]="createRole"
                  name="role"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="AUTHOR">Autor</option>
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Parolă</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="createPassword"
                    name="password"
                    required
                    minlength="6"
                    placeholder="Minim 6 caractere"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    (click)="createPassword = generatePw()"
                    class="px-3 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                  >
                    Auto
                  </button>
                </div>
              </div>
            }
          </form>
        }
      </div>

      <!-- Footer actions -->
      @if (!createdPassword()) {
        <div class="px-5 py-4 border-t border-gray-100 flex gap-3">
          @if (currentMode() === 'info') {
            <button
              (click)="switchToEdit()"
              class="flex-1 py-2 rounded-lg text-sm font-medium text-white"
              style="background-color: #8A0808"
            >
              Editează
            </button>
            <button
              (click)="close()"
              class="flex-1 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
            >
              Închide
            </button>
          }
          @if (currentMode() === 'edit') {
            <button
              (click)="submitEdit()"
              [disabled]="saving()"
              class="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style="background-color: #8A0808"
            >
              {{ saving() ? 'Se salvează...' : 'Salvează' }}
            </button>
            <button
              (click)="currentMode.set('info')"
              class="flex-1 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
            >
              Anulează
            </button>
          }
          @if (currentMode() === 'create') {
            <button
              (click)="submitCreate()"
              [disabled]="
                saving() || !createEmail || !createDisplayName || createPassword.length < 6
              "
              class="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style="background-color: #8A0808"
            >
              {{ saving() ? 'Se creează...' : 'Creează utilizator' }}
            </button>
            <button
              (click)="close()"
              class="flex-1 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
            >
              Anulează
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class UserDrawerComponent implements OnInit, OnChanges {
  private api = inject(ApiService);
  private auth = inject(AuthStore);
  private toast = inject(ToastService);

  mode = input.required<DrawerMode>();
  userId = input<string | null>(null);

  closed = output<void>();
  saved = output<void>();

  currentMode = signal<DrawerMode>('info');

  userDetail = signal<UserDetail | null>(null);
  loadingUser = signal(false);

  logs = signal<AuditEntry[]>([]);
  logsTotal = signal(0);
  logsPage = signal(1);
  loadingLogs = signal(false);

  saving = signal(false);

  // Edit fields
  editDisplayName = '';
  editRole = 'AUTHOR';
  editIsActive = true;
  editPassword = '';

  // Create fields
  createEmail = '';
  createDisplayName = '';
  createRole = 'AUTHOR';
  createPassword = '';

  // Post-create state
  createdPassword = signal<string | null>(null);
  copied = signal(false);

  ngOnInit() {
    this.currentMode.set(this.mode());
    if (this.mode() === 'info' && this.userId()) {
      this.loadUser();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mode'] || changes['userId']) {
      this.currentMode.set(this.mode());
      this.createdPassword.set(null);
      if (this.mode() === 'info' && this.userId()) {
        this.loadUser();
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  loadUser() {
    const id = this.userId();
    if (!id) return;
    this.loadingUser.set(true);
    this.api.getUser(id).subscribe({
      next: (u) => {
        this.userDetail.set(u);
        this.loadingUser.set(false);
        this.loadLogs();
      },
      error: () => {
        this.toast.error('Eroare la încărcarea utilizatorului');
        this.loadingUser.set(false);
      },
    });
  }

  loadLogs() {
    const id = this.userId();
    if (!id) return;
    this.loadingLogs.set(true);
    this.api.getAuditLog({ actorId: id, page: this.logsPage() }).subscribe({
      next: (r) => {
        this.logs.set(r.logs);
        this.logsTotal.set(r.total);
        this.loadingLogs.set(false);
      },
      error: () => this.loadingLogs.set(false),
    });
  }

  prevLogsPage() {
    if (this.logsPage() > 1) {
      this.logsPage.update((p) => p - 1);
      this.loadLogs();
    }
  }

  nextLogsPage() {
    this.logsPage.update((p) => p + 1);
    this.loadLogs();
  }

  switchToEdit() {
    const u = this.userDetail();
    if (!u) return;
    this.editDisplayName = u.displayName;
    this.editRole = u.role;
    this.editIsActive = u.isActive;
    this.editPassword = '';
    this.currentMode.set('edit');
  }

  isSelf() {
    return this.auth.user()?.id === this.userId();
  }

  submitEdit() {
    const id = this.userId();
    if (!id || !this.editDisplayName.trim()) return;
    this.saving.set(true);
    const data: Record<string, unknown> = {
      displayName: this.editDisplayName.trim(),
    };
    if (!this.isSelf()) {
      data['role'] = this.editRole;
      data['isActive'] = this.editIsActive;
    }
    if (this.editPassword.trim()) {
      data['password'] = this.editPassword.trim();
    }
    this.api.updateUser(id, data as Parameters<typeof this.api.updateUser>[1]).subscribe({
      next: () => {
        this.toast.success('Utilizator actualizat');
        this.saving.set(false);
        this.saved.emit();
      },
      error: (e) => {
        this.toast.error(e?.error?.message || 'Eroare la salvare');
        this.saving.set(false);
      },
    });
  }

  submitCreate() {
    if (
      !this.createEmail.trim() ||
      !this.createDisplayName.trim() ||
      this.createPassword.length < 6
    )
      return;
    this.saving.set(true);
    this.api
      .createUser({
        email: this.createEmail.trim(),
        displayName: this.createDisplayName.trim(),
        role: this.createRole as 'AUTHOR' | 'EDITOR' | 'ADMIN',
        password: this.createPassword,
      })
      .subscribe({
        next: (r) => {
          this.createdPassword.set(r.password);
          this.saving.set(false);
        },
        error: (e) => {
          this.toast.error(e?.error?.message || 'Eroare la creare');
          this.saving.set(false);
        },
      });
  }

  copyPassword() {
    const pw = this.createdPassword();
    if (!pw) return;
    navigator.clipboard.writeText(pw).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  finishCreate() {
    this.saved.emit();
  }

  close() {
    this.closed.emit();
  }

  generatePw() {
    return generatePassword();
  }

  initials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
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

  formatAction(action: string) {
    return action.replace(/_/g, ' ').toLowerCase();
  }
}
