import { Component, computed, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectLoad, injectRouter, type PageServerLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { PostImagePillsComponent } from '../../components/post-image-pills.component';
import { SeoService } from '../../services/seo.service';
import { SiteSettingsService } from '../../services/site-settings.service';
import type { SearchResponse } from '@civicpress/shared';

type SearchLoad = (args: PageServerLoad) => Promise<{ results: SearchResponse }>;

@Component({
  selector: 'cp-search-page',
  standalone: true,
  imports: [RouterModule, BreadcrumbComponent, PostImagePillsComponent],
  template: `
    <cp-breadcrumb [items]="[{ label: 'Căutare' }]" />

    <h1 class="text-2xl md:text-3xl font-bold text-secondary mb-2">
      @if (query()) {
        Rezultate pentru „{{ query() }}”
      } @else {
        Căutare
      }
    </h1>
    <p class="text-sm text-gray-500 mb-6">
      @if (!query()) {
        Introdu un termen de căutare din header.
      } @else if (total() === 0) {
        Nu am găsit articole pentru acest termen.
      } @else {
        {{ total() }} {{ total() === 1 ? 'articol găsit' : 'articole găsite' }}
      }
    </p>

    <div class="divide-y divide-border">
      @for (post of posts(); track post.id) {
        <article class="py-4 md:py-5 flex flex-row-reverse md:flex-row gap-3 md:gap-5 group">
          @if (post.heroImage) {
            <a [routerLink]="'/' + post.slug" class="shrink-0 self-start w-[120px] md:w-[240px]">
              <div class="relative w-full aspect-[16/9] overflow-hidden bg-muted">
                <img
                  [src]="post.heroImage.url"
                  [alt]="post.heroImage.alt ?? post.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  width="240"
                  height="135"
                />
                <cp-post-image-pills [pills]="post.pills" />
              </div>
            </a>
          }
          <div class="flex-1 min-w-0 flex flex-col">
            <h2
              class="font-heading leading-tight text-secondary mb-1 md:mb-2"
              style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
            >
              <a
                [routerLink]="'/' + post.slug"
                class="hover:text-primary transition-colors line-clamp-3 md:line-clamp-2"
              >
                {{ post.title }}
              </a>
            </h2>
            <div class="mt-auto pt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
              @if (post.publishedAt) {
                <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
              } @else {
                <span></span>
              }
              @if (post.primaryCategory) {
                <a
                  [routerLink]="['/category', post.primaryCategory.slug]"
                  class="shrink-0 uppercase tracking-wide text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {{ post.primaryCategory.name }}
                </a>
              }
            </div>
          </div>
        </article>
      }
    </div>

    @if (totalPages() > 1) {
      <div class="flex flex-wrap items-center justify-center gap-2 mt-8">
        @if (currentPage() > 1) {
          <button
            type="button"
            (click)="goToPage(currentPage() - 1)"
            class="px-3 py-1.5 border border-border text-sm rounded hover:bg-muted transition-colors"
          >
            « Anterior
          </button>
        }
        @for (p of pageNumbers(); track p) {
          <button
            type="button"
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
            type="button"
            (click)="goToPage(currentPage() + 1)"
            class="px-3 py-1.5 border border-border text-sm rounded hover:bg-muted transition-colors"
          >
            Următor »
          </button>
        }
      </div>
    }
  `,
})
export default class SearchPageComponent {
  private router = injectRouter();
  private seo = inject(SeoService);
  private siteSettings = inject(SiteSettingsService);
  private loadData = toSignal(injectLoad<SearchLoad>());

  constructor() {
    effect(() => {
      const query = this.query();
      this.seo.applyStatic({
        path: '/search',
        title: query ? `Căutare: ${query}` : 'Căutare',
        description: query
          ? `Rezultate de căutare pentru „${query}” pe Civicpress.`
          : 'Caută articole pe Civicpress.',
        robots: 'noindex, follow',
      });
    });
  }

  results = computed(() => this.loadData()?.results ?? null);
  query = computed(() => this.results()?.query ?? '');
  posts = computed(() => this.results()?.posts ?? []);
  total = computed(() => this.results()?.total ?? 0);
  currentPage = computed(() => this.results()?.page ?? 1);
  perPage = computed(() => this.results()?.perPage ?? 15);

  totalPages = computed(() => {
    const total = this.total();
    const perPage = this.perPage();
    if (!total || !perPage) return 1;
    return Math.ceil(total / perPage);
  });

  pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const range: number[] = [];
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) range.push(i);
    return range;
  }

  goToPage(page: number) {
    this.router.navigate(['/search'], {
      queryParams: { q: this.query(), page },
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr);
  }
}
