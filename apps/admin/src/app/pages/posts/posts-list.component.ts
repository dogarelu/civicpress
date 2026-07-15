import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthStore } from '../../services/auth.store';
import { ToastService } from '../../services/toast.service';
import type { AdminPostSummary, PostTransition } from '@civicpress/shared';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Ciornă',
  IN_REVIEW: 'În revizie',
  SCHEDULED: 'Programat',
  PUBLISHED: 'Publicat',
  ARCHIVED: 'Arhivat',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-amber-100 text-amber-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-red-100 text-red-700',
};

@Component({
  selector: 'cp-posts-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Articole</h1>
        <a
          routerLink="/posts/new"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style="background-color: #8A0808"
        >
          + Articol nou
        </a>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          [(ngModel)]="search"
          (ngModelChange)="onSearch()"
          placeholder="Caută articole..."
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-52"
        />
        <select
          [(ngModel)]="statusFilter"
          (ngModelChange)="onFilterChange()"
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">Toate statusurile</option>
          <option value="DRAFT">Ciornă</option>
          <option value="IN_REVIEW">În revizie</option>
          <option value="PUBLISHED">Publicat</option>
          <option value="ARCHIVED">Arhivat</option>
        </select>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="text-left px-4 py-3 font-medium text-gray-600">Titlu</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                Autor
              </th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">
                Categorie
              </th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">
                Data publicării
              </th>
              <th class="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                Vizualizări
              </th>
              <th class="text-right px-4 py-3 font-medium text-gray-600">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="7" class="text-center py-10 text-gray-400">Se încarcă...</td>
              </tr>
            } @else if (posts().length === 0) {
              <tr>
                <td colspan="7" class="text-center py-10 text-gray-400">Niciun articol.</td>
              </tr>
            }
            @for (post of posts(); track post.id) {
              <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3">
                  <a
                    [routerLink]="['/posts', post.id, 'edit']"
                    class="font-medium text-gray-800 hover:text-red-700 transition-colors line-clamp-2"
                  >
                    {{ post.title }}
                  </a>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    [class]="statusClass(post.status)"
                  >
                    {{ statusLabel(post.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 hidden md:table-cell text-gray-500">
                  {{ post.authorName ?? post.author?.displayName ?? '—' }}
                </td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  @if (post.primaryCategory) {
                    <span class="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {{ post.primaryCategory.name }}
                    </span>
                  }
                </td>
                <td class="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                  {{ post.publishedAt ? formatDate(post.publishedAt) : '—' }}
                </td>
                <td class="px-4 py-3 hidden md:table-cell text-right text-gray-600 tabular-nums">
                  {{ post.viewCount ?? 0 }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-2">
                    <a
                      [routerLink]="['/posts', post.id, 'edit']"
                      class="text-xs text-blue-600 hover:underline"
                      >Edit</a
                    >
                    @if (post.status === 'DRAFT' && canSubmit(post)) {
                      <button
                        (click)="transition(post, 'submit')"
                        class="text-xs text-amber-600 hover:underline"
                      >
                        Trimite
                      </button>
                    }
                    @if (post.status === 'DRAFT' && auth.isEditor()) {
                      <button
                        (click)="transition(post, 'publish')"
                        class="text-xs text-green-600 hover:underline"
                      >
                        Publică
                      </button>
                    }
                    @if (post.status === 'IN_REVIEW' && auth.isEditor()) {
                      <button
                        (click)="transition(post, 'approve')"
                        class="text-xs text-green-600 hover:underline"
                      >
                        Aprobă
                      </button>
                      <button
                        (click)="transition(post, 'reject')"
                        class="text-xs text-red-600 hover:underline"
                      >
                        Respinge
                      </button>
                    }
                    @if (post.status === 'PUBLISHED' && auth.isEditor()) {
                      <button
                        (click)="confirmTransition(post, 'archive')"
                        class="text-xs text-gray-500 hover:underline"
                      >
                        Arhivează
                      </button>
                    }
                    @if (post.status === 'ARCHIVED' && auth.isEditor()) {
                      <button
                        (click)="transition(post, 'republish')"
                        class="text-xs text-green-600 hover:underline"
                      >
                        Republică
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Pagination -->
        @if (total() > perPage) {
          <div
            class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500"
          >
            <span>{{ total() }} articole total</span>
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
  `,
})
export class PostsListComponent implements OnInit {
  private api = inject(ApiService);
  protected auth = inject(AuthStore);
  private toast = inject(ToastService);

  posts = signal<AdminPostSummary[]>([]);
  total = signal(0);
  page = signal(1);
  perPage = 20;
  loading = signal(false);
  search = '';
  statusFilter = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .getPosts({
        page: this.page(),
        perPage: this.perPage,
        status: this.statusFilter || undefined,
        search: this.search || undefined,
      })
      .subscribe({
        next: (r) => {
          this.posts.set(r.posts);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 400);
  }

  onFilterChange() {
    this.page.set(1);
    this.load();
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

  canSubmit(post: AdminPostSummary): boolean {
    const me = this.auth.user();
    if (!me) return false;
    return this.auth.isEditor() || post.author?.id === me.id;
  }

  confirmTransition(post: AdminPostSummary, action: PostTransition['action']) {
    const isDestructive = action === 'archive' || action === 'reject';
    if (isDestructive) {
      const ok = window.confirm(`Sigur vrei să continui cu „${action}” pentru „${post.title}”?`);
      if (!ok) return;
    }
    this.transition(post, action);
  }

  transition(post: AdminPostSummary, action: PostTransition['action']) {
    this.api.transitionPost(post.id, action).subscribe({
      next: (r) => {
        this.toast.success(`Status actualizat: ${r.status}`);
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message || 'Eroare la tranziție'),
    });
  }

  statusLabel(s: string) {
    return STATUS_LABELS[s] ?? s;
  }
  statusClass(s: string) {
    return STATUS_COLORS[s] ?? '';
  }
  formatDate(d: string) {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d));
  }
}
