import { Component, Input, signal, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectRouter } from '@analogjs/router';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { PostCardListComponent } from '../../components/post-card-list.component';
import type { CategoryDetail } from '@civicpress/shared';

export interface CatListOptions {
  perPage: number;
}

@Component({
  selector: 'cp-cat-list',
  standalone: true,
  imports: [RouterModule, BreadcrumbComponent, PostCardListComponent],
  template: `
    @if (data) {
      <cp-breadcrumb [items]="[{ label: data.name }]" />

      <div class="flex items-center justify-between mb-6">
        <h1
          class="font-heading text-2xl font-bold uppercase tracking-wide border-b-4 pb-1 pr-4"
          [style.border-color]="data.color ?? 'var(--color-primary)'"
          [style.color]="data.color ?? 'var(--color-primary)'"
        >
          {{ data.name }}
        </h1>
        <span class="text-sm text-gray-500">{{ data.total }} articole</span>
      </div>

      <div class="divide-y divide-border">
        @for (post of data.posts; track post.id) {
          <div class="py-5">
            <article class="flex gap-5 group">
              @if (post.heroImage) {
                <a [routerLink]="'/' + post.slug" class="flex-shrink-0">
                  <div class="w-[240px] h-[160px] overflow-hidden bg-muted">
                    <img
                      [src]="post.heroImage.url"
                      [alt]="post.heroImage.alt ?? post.title"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      width="240"
                      height="160"
                    />
                  </div>
                </a>
              }
              <div class="flex-1">
                @if (post.primaryCategory) {
                  <a
                    [routerLink]="['/category', post.primaryCategory.slug]"
                    class="text-xs font-bold uppercase tracking-wider mb-1 inline-block"
                    [style.color]="post.primaryCategory.color ?? 'var(--color-primary)'"
                    >{{ post.primaryCategory.name }}</a
                  >
                }
                <h2 class="font-heading text-lg font-bold leading-tight text-secondary mb-2">
                  <a
                    [routerLink]="'/' + post.slug"
                    class="hover:text-primary transition-colors line-clamp-2"
                  >
                    {{ post.title }}
                  </a>
                </h2>
                @if (post.excerpt) {
                  <p class="text-sm text-gray-600 line-clamp-3">{{ cleanExcerpt(post.excerpt) }}</p>
                }
                <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  @if (post.author) {
                    <span>{{ post.author.displayName }}</span>
                    <span>·</span>
                  }
                  @if (post.publishedAt) {
                    <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                  }
                </div>
              </div>
            </article>
          </div>
        }
      </div>

      @if (totalPages() > 1) {
        <div class="flex items-center justify-center gap-2 mt-8">
          @if (currentPage() > 1) {
            <button
              (click)="goToPage(currentPage() - 1)"
              class="px-3 py-1.5 border border-border text-sm rounded hover:bg-muted transition-colors"
            >
              « Anterior
            </button>
          }
          @for (p of pageNumbers(); track p) {
            <button
              (click)="goToPage(p)"
              class="px-3 py-1.5 border text-sm rounded transition-colors"
              [class.bg-primary]="p === currentPage()"
              [class.text-white]="p === currentPage()"
              [class.border-primary]="p === currentPage()"
              [class.border-border]="p !== currentPage()"
            >
              {{ p }}
            </button>
          }
          @if (currentPage() < totalPages()) {
            <button
              (click)="goToPage(currentPage() + 1)"
              class="px-3 py-1.5 border border-border text-sm rounded hover:bg-muted transition-colors"
            >
              Următor »
            </button>
          }
        </div>
      }
    }
  `,
})
export default class CatListComponent {
  private router = injectRouter();

  @Input() data: CategoryDetail | null = null;
  @Input() options: CatListOptions = { perPage: 15 };

  currentPage = signal(1);

  goToPage(page: number) {
    this.currentPage.set(page);
    const slug = this.data?.slug ?? '';
    this.router.navigate(['/category', slug], { queryParams: { page } });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  totalPages(): number {
    if (!this.data) return 1;
    return Math.ceil(this.data.total / this.options.perPage);
  }

  pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const range: number[] = [];
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) range.push(i);
    return range;
  }

  cleanExcerpt(excerpt: string): string {
    return excerpt.replace(/<[^>]*>/g, '').trim();
  }

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  }
}
