import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PostSummary } from '@civicpress/shared';

@Component({
  selector: 'cp-recomandare-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-4">
      @for (post of posts; track post.id) {
        <article class="flex gap-2 group border-b border-border pb-4 last:border-0 last:pb-0">
          @if (post.heroImage) {
            <a [routerLink]="'/' + post.slug" class="flex-shrink-0">
              <div class="w-[90px] h-[60px] overflow-hidden bg-muted">
                <img
                  [src]="post.heroImage.url"
                  [alt]="post.heroImage.alt ?? post.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                  width="90"
                  height="60"
                />
              </div>
            </a>
          }
          <div class="flex-1 min-w-0">
            @if (post.primaryCategory) {
              <span
                class="text-[10px] font-bold uppercase tracking-wider mb-0.5 block"
                [style.color]="post.primaryCategory.color ?? 'var(--color-primary)'"
              >
                {{ post.primaryCategory.name }}
              </span>
            }
            <h4 class="text-xs font-semibold leading-tight text-secondary">
              <a
                [routerLink]="'/' + post.slug"
                class="hover:text-primary transition-colors line-clamp-3"
              >
                {{ post.title }}
              </a>
            </h4>
          </div>
        </article>
      }
    </div>
  `,
})
export class RecomandateSidebarComponent {
  @Input() posts: PostSummary[] = [];
}
