import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectRouter } from '@analogjs/router';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { ModuleLayoutComponent } from '../../components/modules/module-layout.component';
import { HomeListItemComponent } from '../../components/home-list-item.component';
import { PostImagePillsComponent } from '../../components/post-image-pills.component';
import { PostSubtitleComponent } from '../../components/post-subtitle.component';
import { PostViewCountComponent } from '../../components/post-view-count.component';
import { SiteSettingsService } from '../../services/site-settings.service';
import type { CategoryDetail } from '@civicpress/shared';

@Component({
  selector: 'cp-cat-list',
  standalone: true,
  imports: [
    RouterModule,
    BreadcrumbComponent,
    ModuleLayoutComponent,
    HomeListItemComponent,
    PostImagePillsComponent,
    PostSubtitleComponent,
    PostViewCountComponent,
  ],
  template: `
    @if (data) {
      <cp-breadcrumb [items]="breadcrumbItems()" />

      @if (data.subcategories?.length) {
        <div class="mb-5 flex flex-wrap items-center gap-2">
          @for (sub of data.subcategories; track sub.id) {
            <a
              [routerLink]="['/category', sub.slug]"
              class="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            >
              {{ sub.name }}
            </a>
          }
        </div>
      }

      @if (
        (data.modules && data.modules.length > 0) ||
        (data.mobileModules && data.mobileModules.length > 0)
      ) {
        <!-- Configured module layout (page 1 full; page 2+ list + same sidebar) -->
        <cp-module-layout
          [modules]="data.modules ?? []"
          [sidebar]="data.sidebar ?? null"
          [mobileOrder]="data.mobileOrder ?? []"
          [mobileModules]="data.mobileModules ?? []"
          [categorySlug]="data.slug"
          [showDesktop]="!!(data.modules && data.modules.length > 0)"
        />
      } @else {
        <!-- Fallback list when no category layout is configured -->
        <div class="divide-y divide-border">
          @for (post of data.posts; track post.id) {
            <!-- Mobile: reuse cp-home-list-item (compact row) -->
            <div class="md:hidden">
              <cp-home-list-item [post]="post" [showSummary]="showCategorySummary()" />
            </div>

            <!-- Desktop: larger card with excerpt -->
            <div class="hidden md:block py-5">
              <article class="flex gap-5 group">
                @if (post.heroImage) {
                  <a [routerLink]="'/' + post.slug" class="flex-shrink-0">
                    <div class="relative w-[240px] h-[160px] overflow-hidden bg-muted">
                      <img
                        [src]="post.heroImage.url"
                        [alt]="post.heroImage.alt ?? post.title"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        width="240"
                        height="160"
                      />
                      <cp-post-image-pills [pills]="post.pills" />
                    </div>
                  </a>
                }
                <div class="flex-1">
                  @if (post.primaryCategory) {
                    <a
                      [routerLink]="['/category', post.primaryCategory.slug]"
                      class="text-xs font-bold uppercase tracking-wider mb-1 inline-block text-gray-600 hover:text-gray-800 transition-colors"
                      >{{ post.primaryCategory.name }}</a
                    >
                  }
                  <h2
                    class="font-heading leading-tight text-secondary mb-2"
                    style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
                  >
                    <a
                      [routerLink]="'/' + post.slug"
                      class="hover:text-primary transition-colors line-clamp-2"
                    >
                      {{ post.title }}
                    </a>
                  </h2>
                  <cp-post-subtitle
                    [show]="showCategorySummary()"
                    [bulbi]="post.bulbi ?? []"
                    [excerpt]="post.excerpt"
                    listClass="text-gray-600"
                    textClass="text-gray-600"
                  />
                  <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    @if (canShowAuthor(post) && displayAuthor(post); as authorName) {
                      <span>{{ authorName }}</span>
                    }
                    @if (canShowAuthor(post) && (canShowDate(post) || canShowViews(post))) {
                      <span>·</span>
                    }
                    @if (canShowDate(post)) {
                      <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
                    }
                    @if (canShowDate(post) && canShowViews(post)) {
                      <span>·</span>
                    }
                    @if (canShowViews(post)) {
                      <cp-post-view-count [count]="post.viewCount!" />
                    }
                  </div>
                </div>
              </article>
            </div>
          }
        </div>
      }

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
export default class CatListComponent {
  private router = injectRouter();
  private siteSettings = inject(SiteSettingsService);

  @Input() data: CategoryDetail | null = null;

  breadcrumbItems(): Array<{ label: string; url?: string }> {
    if (!this.data) return [];
    const items: Array<{ label: string; url?: string }> = [];
    if (this.data.parent) {
      items.push({ label: this.data.parent.name, url: `/category/${this.data.parent.slug}` });
    }
    items.push({ label: this.data.name });
    return items;
  }

  showCategorySummary(): boolean {
    return this.data?.showSummary ?? true;
  }

  displayAuthor(post: CategoryDetail['posts'][number]): string | null {
    return post.authorName?.trim() || post.author?.displayName || null;
  }

  canShowDate(post: CategoryDetail['posts'][number]): boolean {
    return post.showDate !== false && !!post.publishedAt;
  }

  canShowAuthor(post: CategoryDetail['posts'][number]): boolean {
    return post.showAuthor !== false && !!this.displayAuthor(post);
  }

  canShowViews(post: CategoryDetail['posts'][number]): boolean {
    return this.siteSettings.canShowViews(post);
  }

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

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr);
  }
}
