import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, TrashPost } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

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
  selector: 'cp-trash',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Coș de gunoi</h1>
        <p class="mt-1 text-sm text-gray-500">
          Articolele șterse rămân aici {{ retentionDays() }} de zile. Le poți recupera sau șterge
          definitiv mai devreme.
        </p>
      </div>

      <div class="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          [(ngModel)]="search"
          (ngModelChange)="onSearch()"
          placeholder="Caută în coș..."
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-52"
        />
      </div>

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
                Șters la
              </th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Rămâne</th>
              <th class="text-right px-4 py-3 font-medium text-gray-600">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="6" class="text-center py-10 text-gray-400">Se încarcă...</td>
              </tr>
            } @else if (posts().length === 0) {
              <tr>
                <td colspan="6" class="text-center py-10 text-gray-400">Coșul este gol.</td>
              </tr>
            }
            @for (post of posts(); track post.id) {
              <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-800 line-clamp-2">{{ post.title }}</p>
                  @if (post.primaryCategory) {
                    <p class="text-xs text-gray-400 mt-0.5">{{ post.primaryCategory.name }}</p>
                  }
                </td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    [class]="statusClass(post.status)"
                  >
                    {{ statusLabel(post.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-500 hidden md:table-cell">
                  {{ post.authorName ?? '—' }}
                </td>
                <td class="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                  {{ formatDate(post.deletedAt) }}
                </td>
                <td class="px-4 py-3 text-gray-600 text-xs">
                  {{ remainingLabel(post) }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      (click)="restore(post)"
                      [disabled]="busyId() === post.id"
                      class="text-xs text-green-700 hover:underline disabled:opacity-40"
                    >
                      Recuperează
                    </button>
                    <button
                      type="button"
                      (click)="permanentDelete(post)"
                      [disabled]="busyId() === post.id"
                      class="text-xs text-red-600 hover:underline disabled:opacity-40"
                    >
                      Șterge definitiv
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (total() > perPage) {
          <div
            class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500"
          >
            <span>{{ total() }} articole în coș</span>
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
export class TrashComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  posts = signal<TrashPost[]>([]);
  total = signal(0);
  page = signal(1);
  perPage = 20;
  loading = signal(false);
  busyId = signal<string | null>(null);
  retentionDays = signal(30);
  search = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .getTrash({
        page: this.page(),
        perPage: this.perPage,
        search: this.search || undefined,
      })
      .subscribe({
        next: (r) => {
          this.posts.set(r.posts);
          this.total.set(r.total);
          this.retentionDays.set(r.retentionDays);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Nu am putut încărca coșul.');
        },
      });
  }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 400);
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

  restore(post: TrashPost) {
    const ok = window.confirm(
      `Recuperezi „${post.title}”? Revine cu statusul ${this.statusLabel(post.status).toLowerCase()}.`,
    );
    if (!ok) return;
    this.busyId.set(post.id);
    this.api.restorePost(post.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success('Articol recuperat.');
        this.load();
      },
      error: (e) => {
        this.busyId.set(null);
        this.toast.error(e?.error?.message || 'Eroare la recuperare');
      },
    });
  }

  permanentDelete(post: TrashPost) {
    const ok = window.confirm(`Ștergi definitiv „${post.title}”? Nu mai poate fi recuperat.`);
    if (!ok) return;
    this.busyId.set(post.id);
    this.api.permanentDeletePost(post.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success('Articol șters definitiv.');
        this.load();
      },
      error: (e) => {
        this.busyId.set(null);
        this.toast.error(e?.error?.message || 'Eroare la ștergere');
      },
    });
  }

  statusLabel(s: string) {
    return STATUS_LABELS[s] ?? s;
  }

  statusClass(s: string) {
    return STATUS_COLORS[s] ?? '';
  }

  remainingLabel(post: TrashPost) {
    if (post.daysRemaining <= 0) return 'Astăzi';
    if (post.daysRemaining === 1) return '1 zi';
    return `${post.daysRemaining} zile`;
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
