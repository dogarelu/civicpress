import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { normalizeCategoryColor, type CategoryStrip } from '@civicpress/shared';

@Component({
  selector: 'cp-category-strip',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (strip) {
      <section class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2
            class="font-heading uppercase tracking-wide relative"
            [class.cp-module-section-title--cat-pill]="!!stripCategoryColor"
            [style.--category-color]="stripCategoryColor"
            style="font-size: var(--row-header-font-size, 18px); font-weight: var(--row-header-font-weight, 800); color: var(--row-header-color, #1f2937);"
          >
            <span class="cp-module-section-title-text">{{ strip.category.name }}</span>
            <span class="cp-module-section-title-rule" aria-hidden="true"></span>
          </h2>
          <a
            [routerLink]="['/category', strip.category.slug]"
            class="text-xs text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-wide"
            >Mai mult »</a
          >
        </div>

        <div [class]="gridClass">
          @for (post of strip.posts; track post.id; let i = $index) {
            <article class="group bg-background px-4 pt-3 pb-3">
              <a [routerLink]="'/' + post.slug" class="block">
                @if (post.heroImage) {
                  <div class="overflow-hidden bg-muted aspect-[16/9]">
                    <img
                      [src]="post.heroImage.url"
                      [alt]="post.heroImage.alt ?? post.title"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      width="500"
                      height="280"
                    />
                  </div>
                }
              </a>
              <div class="pt-3">
                <h3
                  class="font-heading leading-tight text-secondary"
                  style="font-size: var(--news-title-font-size, 20px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, currentColor);"
                >
                  <a
                    [routerLink]="'/' + post.slug"
                    class="hover:text-primary transition-colors line-clamp-3"
                  >
                    {{ post.title }}
                  </a>
                </h3>
              </div>
            </article>
          }
        </div>
      </section>
    }
  `,
})
export class CategoryStripComponent {
  @Input() strip: CategoryStrip | null = null;

  get stripCategoryColor(): string | null {
    return normalizeCategoryColor(this.strip?.category.color) ?? null;
  }

  get gridClass(): string {
    const count = this.strip?.posts?.length ?? 1;
    if (count >= 3) {
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-400 md:-mx-4';
    }
    if (count === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-400 md:-mx-4';
    return 'grid grid-cols-1';
  }
}
