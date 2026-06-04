import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { CategoryStrip } from '@civicpress/shared';

@Component({
  selector: 'cp-category-strip',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (strip) {
      <section class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-heading text-lg font-extrabold uppercase tracking-wide relative">
            <span
              class="relative z-10 pr-3 bg-background"
              [style.color]="strip.category.color ?? 'var(--color-primary)'"
              >{{ strip.category.name }}</span
            >
            <span
              class="absolute bottom-0 left-0 w-full h-[3px]"
              [style.background-color]="strip.category.color ?? 'var(--color-primary)'"
            ></span>
          </h2>
          <a
            [routerLink]="['/category', strip.category.slug]"
            class="text-xs text-gray-500 hover:text-primary transition-colors uppercase tracking-wide"
            >Mai mult »</a
          >
        </div>

        <div [class]="gridClass">
          @for (post of strip.posts; track post.id; let i = $index) {
            <article
              class="group bg-white border border-border rounded-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
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
              <div class="p-3">
                <h3 class="font-heading text-sm font-semibold leading-tight text-secondary">
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

  get gridClass(): string {
    const count = this.strip?.posts?.length ?? 1;
    if (count >= 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
    if (count === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    return 'grid grid-cols-1 gap-4';
  }
}
