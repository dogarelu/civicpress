import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  OnDestroy,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import type { AdminPostSummary } from '@civicpress/shared';

export interface PickedPost {
  id: string;
  title: string;
  publishedAt?: string | null;
  authorDisplayName?: string | null;
}

@Component({
  selector: 'cp-post-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" (click)="$event.stopPropagation()">
      <label class="block text-xs font-medium text-gray-500 mb-1">{{ label }}</label>

      @if (value) {
        <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
          <div class="flex items-start gap-2">
            <div class="flex-1 min-w-0">
              <div class="truncate font-medium text-gray-800">{{ value.title }}</div>
              @if (value.authorDisplayName || value.publishedAt) {
                <div class="mt-1 text-xs text-gray-500">
                  @if (value.authorDisplayName) {
                    <span>{{ value.authorDisplayName }}</span>
                  }
                  @if (value.authorDisplayName && value.publishedAt) {
                    <span class="mx-1 text-gray-300">•</span>
                  }
                  @if (value.publishedAt) {
                    <span>{{ formatDate(value.publishedAt) }}</span>
                  }
                </div>
              }
            </div>
            <button
              type="button"
              (click)="clear()"
              class="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors text-lg leading-none"
              aria-label="Elimină"
            >
              ×
            </button>
          </div>
        </div>
      } @else {
        <div class="relative">
          <input
            type="text"
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange($event)"
            (focus)="onFocus()"
            placeholder="Caută articol..."
            class="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          @if (loading()) {
            <span class="absolute right-3 top-2.5 text-xs text-gray-400">se încarcă…</span>
          }
        </div>

        @if (open() && results().length > 0) {
          <div
            class="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto mt-1"
          >
            @for (post of results(); track post.id) {
              <button
                type="button"
                (click)="select(post)"
                class="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
              >
                <div class="text-sm font-medium text-gray-800 line-clamp-2">{{ post.title }}</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  @if (post.primaryCategory) {
                    <span>{{ post.primaryCategory.name }}</span>
                  }
                  @if (
                    post.primaryCategory && (post.authorName || post.author || post.publishedAt)
                  ) {
                    <span class="mx-1">•</span>
                  }
                  @if (post.authorName || post.author) {
                    <span>{{ post.authorName || post.author?.displayName }}</span>
                  }
                  @if ((post.authorName || post.author) && post.publishedAt) {
                    <span class="mx-1">•</span>
                  }
                  @if (post.publishedAt) {
                    <span>{{ formatDate(post.publishedAt) }}</span>
                  }
                </div>
              </button>
            }
          </div>
        }

        @if (open() && !loading() && results().length === 0 && query.length >= 2) {
          <div
            class="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded shadow-lg mt-1 px-3 py-2 text-sm text-gray-400"
          >
            Niciun rezultat
          </div>
        }
      }
    </div>
  `,
})
export class PostPickerComponent implements OnDestroy {
  @Input() label = 'Articol';
  @Input() value: PickedPost | null = null;
  @Output() selected = new EventEmitter<PickedPost | null>();

  private api = inject(ApiService);
  private el = inject(ElementRef);

  query = '';
  results = signal<AdminPostSummary[]>([]);
  loading = signal(false);
  open = signal(false);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event) {
    if (!this.el.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }

  onFocus() {
    if (this.query.length >= 2) this.open.set(true);
  }

  onQueryChange(val: string) {
    this.query = val;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (val.length < 2) {
      this.open.set(false);
      this.results.set([]);
      return;
    }
    this.loading.set(true);
    this.debounceTimer = setTimeout(() => {
      this.api.getPosts({ search: val, status: 'PUBLISHED', perPage: 10 }).subscribe({
        next: (res) => {
          this.results.set(res.posts);
          this.open.set(true);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
    }, 300);
  }

  select(post: AdminPostSummary) {
    this.open.set(false);
    this.query = '';
    this.results.set([]);
    this.selected.emit({
      id: post.id,
      title: post.title,
      publishedAt: post.publishedAt,
      authorDisplayName: post.authorName ?? post.author?.displayName ?? null,
    });
  }

  clear() {
    this.selected.emit(null);
  }

  ngOnDestroy() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  }
}
