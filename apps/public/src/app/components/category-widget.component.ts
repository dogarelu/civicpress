import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { CategoryStrip } from '@civicpress/shared';

@Component({
  selector: 'cp-category-widget',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (strip) {
      <aside class="bg-white border border-border rounded-sm shadow-sm overflow-hidden">
        <header
          class="px-3 py-2 flex items-center justify-between"
          [style.background-color]="strip.category.color ?? 'var(--color-primary)'"
        >
          <a
            [routerLink]="['/category', strip.category.slug]"
            class="text-white text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
            >{{ strip.category.name }}</a
          >
          <a
            [routerLink]="['/category', strip.category.slug]"
            class="text-white/80 text-[10px] hover:text-white transition-colors uppercase tracking-wide"
            >Mai mult »</a
          >
        </header>
        <ul class="divide-y divide-border">
          @for (post of strip.posts.slice(0, 4); track post.id) {
            <li class="hover:bg-muted transition-colors">
              <article class="flex gap-3 p-3 group">
                @if (post.heroImage) {
                  <a [routerLink]="'/' + post.slug" class="flex-shrink-0">
                    <div class="w-[72px] h-[54px] overflow-hidden bg-muted rounded-sm">
                      <img
                        [src]="post.heroImage.url"
                        [alt]="post.heroImage.alt ?? post.title"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        width="72"
                        height="54"
                      />
                    </div>
                  </a>
                }
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-semibold leading-tight text-secondary line-clamp-3">
                    <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
                      {{ post.title }}
                    </a>
                  </h4>
                  @if (post.publishedAt) {
                    <time
                      [dateTime]="post.publishedAt"
                      class="text-[10px] text-gray-400 mt-1 block"
                      >{{ formatDate(post.publishedAt) }}</time
                    >
                  }
                </div>
              </article>
            </li>
          }
        </ul>
      </aside>
    }
  `,
})
export class CategoryWidgetComponent {
  @Input() strip: CategoryStrip | null = null;

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  }
}
