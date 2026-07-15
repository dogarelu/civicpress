import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectRouter } from '@analogjs/router';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import type { CategoryDetail } from '@civicpress/shared';

@Component({
  selector: 'cp-cat-video',
  standalone: true,
  imports: [RouterModule, BreadcrumbComponent],
  template: `
    @if (data) {
      <cp-breadcrumb [items]="[{ label: data.name }]" />

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        @for (post of data.posts; track post.id) {
          <article
            class="group bg-white border border-border rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <a
              [routerLink]="['/video', post.slug]"
              class="block relative aspect-video bg-muted overflow-hidden"
            >
              @if (post.heroImage) {
                <img
                  [src]="post.heroImage.url"
                  [alt]="post.heroImage.alt ?? post.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              } @else {
                <div class="w-full h-full bg-gray-800"></div>
              }
              <div
                class="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors"
              ></div>
              <span
                class="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"
              >
                <svg
                  class="w-6 h-6 ml-0.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </a>

            <div class="p-3">
              <h2
                class="font-heading leading-tight text-secondary mb-1"
                style="font-size: var(--news-title-font-size, 16px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
              >
                <a
                  [routerLink]="['/video', post.slug]"
                  class="hover:text-primary transition-colors line-clamp-2"
                >
                  {{ post.title }}
                </a>
              </h2>
              @if (post.excerpt) {
                <p
                  class="text-gray-600 line-clamp-2 mt-1"
                  style="font-size: var(--news-summary-font-size, 13px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
                >
                  {{ cleanExcerpt(post.excerpt) }}
                </p>
              }
            </div>
          </article>
        }
      </div>

      @if (totalPages() > 1) {
        <div class="flex flex-wrap items-center justify-center gap-2 mt-8">
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
              [class.bg-gray-800]="p === currentPage()"
              [class.text-white]="p === currentPage()"
              [class.border-gray-800]="p === currentPage()"
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
export default class CatVideoComponent {
  private router = injectRouter();

  @Input() data: CategoryDetail | null = null;

  currentPage(): number {
    return this.data?.page ?? 1;
  }

  goToPage(page: number) {
    const slug = this.data?.slug ?? '';
    this.router.navigate(['/category', slug], { queryParams: { page } });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  totalPages(): number {
    if (!this.data) return 1;
    return Math.ceil(this.data.total / this.data.perPage);
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
}
