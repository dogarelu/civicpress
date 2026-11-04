import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthStore } from '../services/auth.store';
import type { AuditEntry, AuthorPostCountRange, AuthorPostStats } from '@civicpress/shared';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  CHIEF_EDITOR: 'Editor șef',
  EDITOR: 'Editor',
  AUTHOR: 'Autor',
};

const RANGES: { id: AuthorPostCountRange; label: string }[] = [
  { id: 'week', label: 'Săptămână' },
  { id: 'month', label: 'Lună' },
  { id: 'quarter', label: '3 luni' },
  { id: 'year', label: '1 an' },
  { id: 'all', label: 'Tot timpul' },
];

@Component({
  selector: 'cp-audit',
  standalone: true,
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Jurnal activitate</h1>

      @if (auth.isAdmin()) {
        <section class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div
            class="px-4 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <h2 class="font-semibold text-gray-800">Articole publicate</h2>
              <p class="text-xs text-gray-500 mt-0.5">
                Câte articole a publicat fiecare utilizator
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              @for (opt of ranges; track opt.id) {
                <button
                  type="button"
                  (click)="setRange(opt.id)"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  [class]="rangeClass(opt.id)"
                >
                  {{ opt.label }}
                </button>
              }
            </div>
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="text-left px-4 py-3 font-medium text-gray-600">Utilizator</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">
                  Rol
                </th>
                <th class="text-right px-4 py-3 font-medium text-gray-600 w-28">Articole</th>
              </tr>
            </thead>
            <tbody>
              @if (loadingStats()) {
                <tr>
                  <td colspan="3" class="text-center py-10 text-gray-400">Se încarcă...</td>
                </tr>
              } @else if (rows().length === 0) {
                <tr>
                  <td colspan="3" class="text-center py-10 text-gray-400">
                    Niciun articol publicat în această perioadă.
                  </td>
                </tr>
              }
              @for (author of rows(); track author.trackId) {
                <tr class="border-b border-gray-50">
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-800">{{ author.displayName }}</p>
                    @if (author.email) {
                      <p class="text-xs text-gray-400 hidden sm:block">{{ author.email }}</p>
                    }
                    <div class="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        class="h-full rounded-full bg-[#8A0808]"
                        [style.width]="author.bar"
                      ></div>
                    </div>
                  </td>
                  <td class="px-4 py-3 hidden sm:table-cell">
                    @if (author.roleLabel) {
                      <span
                        class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {{ author.roleLabel }}
                      </span>
                    } @else {
                      <span class="text-gray-400">—</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">
                    {{ author.count }}
                  </td>
                </tr>
              }
            </tbody>
            @if (!loadingStats() && rows().length > 0) {
              <tfoot>
                <tr class="bg-gray-50 border-t border-gray-100">
                  <td class="px-4 py-3 font-medium text-gray-700" colspan="2">Total</td>
                  <td class="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                    {{ totalForRange() }}
                  </td>
                </tr>
              </tfoot>
            }
          </table>
        </section>
      }

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-4 py-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-800">Istoric acțiuni</h2>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="text-left px-4 py-3 font-medium text-gray-600">Acțiune</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                Entitate
              </th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                Actor
              </th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Data</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="4" class="text-center py-10 text-gray-400">Se încarcă...</td>
              </tr>
            }
            @for (log of logs(); track log.id) {
              <tr class="border-b border-gray-50">
                <td class="px-4 py-3 font-medium text-gray-700">{{ formatAction(log.action) }}</td>
                <td class="px-4 py-3 text-gray-500 hidden md:table-cell">
                  {{ log.entity }}
                  <span class="font-mono text-xs">{{ log.entityId.slice(0, 8) }}</span>
                </td>
                <td class="px-4 py-3 text-gray-500 hidden md:table-cell">
                  {{ log.actor?.displayName ?? '—' }}
                </td>
                <td class="px-4 py-3 text-gray-400 text-xs">{{ formatDate(log.createdAt) }}</td>
              </tr>
            }
            @if (!loading() && logs().length === 0) {
              <tr>
                <td colspan="4" class="text-center py-10 text-gray-400">
                  Nicio activitate înregistrată.
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (total() > 20) {
          <div
            class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500"
          >
            <span>{{ total() }} intrări total</span>
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
                [disabled]="page() * 20 >= total()"
                class="px-3 py-1 border rounded text-xs disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AuditComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthStore);
  logs = signal<AuditEntry[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);

  readonly ranges = RANGES;
  range = signal<AuthorPostCountRange>('week');
  stats = signal<AuthorPostStats | null>(null);
  loadingStats = signal(false);

  rows = computed(() => {
    const data = this.stats();
    const selected = this.range();
    if (!data) return [];
    const authors = [...data.authors]
      .filter((author) => author.counts[selected] > 0)
      .sort(
        (a, b) =>
          b.counts[selected] - a.counts[selected] ||
          a.displayName.localeCompare(b.displayName, 'ro'),
      );
    const max = Math.max(1, ...authors.map((author) => author.counts[selected]));
    return authors.map((author) => ({
      trackId: author.userId ?? author.displayName,
      displayName: author.displayName,
      email: author.email,
      roleLabel: author.role ? (ROLE_LABELS[author.role] ?? author.role) : '',
      count: author.counts[selected],
      bar: `${(author.counts[selected] / max) * 100}%`,
    }));
  });

  totalForRange = computed(() => this.stats()?.totals[this.range()] ?? 0);

  ngOnInit() {
    this.load();
    if (this.auth.isAdmin()) this.loadStats();
  }

  load() {
    this.loading.set(true);
    const role = this.auth.user()?.role;
    const mine = role !== 'ADMIN' && role !== 'EDITOR' && role !== 'CHIEF_EDITOR';
    this.api.getAuditLog({ page: this.page(), mine }).subscribe({
      next: (r) => {
        this.logs.set(r.logs);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadStats() {
    this.loadingStats.set(true);
    this.api.getAuthorPostStats().subscribe({
      next: (r) => {
        this.stats.set(r);
        this.loadingStats.set(false);
      },
      error: () => this.loadingStats.set(false),
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

  setRange(id: AuthorPostCountRange) {
    this.range.set(id);
  }

  rangeClass(id: AuthorPostCountRange) {
    return this.range() === id
      ? 'text-white bg-[#8A0808]'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
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
