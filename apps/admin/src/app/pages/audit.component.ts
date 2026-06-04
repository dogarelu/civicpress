import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthStore } from '../services/auth.store';
import type { AuditEntry } from '@civicpress/shared';

@Component({
  selector: 'cp-audit',
  standalone: true,
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Jurnal activitate</h1>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
  private auth = inject(AuthStore);
  logs = signal<AuditEntry[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const role = this.auth.user()?.role;
    const mine = role !== 'ADMIN' && role !== 'EDITOR';
    this.api.getAuditLog({ page: this.page(), mine }).subscribe({
      next: (r) => {
        this.logs.set(r.logs);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
