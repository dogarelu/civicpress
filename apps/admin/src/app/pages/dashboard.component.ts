import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthStore } from '../services/auth.store';
import type { AdminPostSummary, AuditEntry } from '@civicpress/shared';

@Component({
  selector: 'cp-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <!-- KPI cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p class="text-sm text-gray-500 mb-1">Ciorne</p>
          <p class="text-3xl font-bold text-gray-800">{{ draftCount() }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p class="text-sm text-gray-500 mb-1">În revizie</p>
          <p class="text-3xl font-bold text-amber-600">{{ reviewCount() }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p class="text-sm text-gray-500 mb-1">Publicate această săptămână</p>
          <p class="text-3xl font-bold text-green-600">{{ publishedWeekCount() }}</p>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="flex gap-3 mb-8">
        <a
          routerLink="/posts/new"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style="background-color: #8A0808"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Articol nou
        </a>
        <a
          routerLink="/posts"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Toate articolele
        </a>
      </div>

      <!-- Recent activity -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="px-5 py-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-800">Activitate recentă</h2>
        </div>
        @if (auditLogs().length === 0 && !loadingAudit()) {
          <p class="px-5 py-8 text-sm text-gray-400 text-center">Nicio activitate înregistrată.</p>
        }
        @for (log of auditLogs(); track log.id) {
          <div class="px-5 py-3 border-b border-gray-50 flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800">
                <span class="font-medium">{{ log.actor?.displayName ?? 'sistem' }}</span>
                — {{ formatAction(log.action) }}
                <span class="text-gray-500">{{ log.entity }} {{ log.entityId.slice(0, 8) }}</span>
              </p>
              <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(log.createdAt) }}</p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthStore);

  posts = signal<AdminPostSummary[]>([]);
  auditLogs = signal<AuditEntry[]>([]);
  loadingAudit = signal(false);

  draftCount = computed(() => this.posts().filter((p) => p.status === 'DRAFT').length);
  reviewCount = computed(() => this.posts().filter((p) => p.status === 'IN_REVIEW').length);
  publishedWeekCount = computed(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.posts().filter(
      (p) =>
        p.status === 'PUBLISHED' && p.publishedAt && new Date(p.publishedAt).getTime() > weekAgo,
    ).length;
  });

  ngOnInit() {
    this.api.getDashboardStats().subscribe((r) => this.posts.set(r.posts));
    this.loadingAudit.set(true);
    const role = this.auth.user()?.role;
    const mine = role === 'AUTHOR';
    this.api.getAuditLog({ page: 1, mine }).subscribe({
      next: (r) => {
        this.auditLogs.set(r.logs);
        this.loadingAudit.set(false);
      },
      error: () => this.loadingAudit.set(false),
    });
  }

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  }

  formatAction(action: string): string {
    return action.replace(/_/g, ' ').toLowerCase();
  }
}
