import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PostSummary } from '@civicpress/shared';

@Component({
  selector: 'cp-home-list-item',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (post) {
      <article class="flex gap-4 py-4 group">
        @if (post.heroImage) {
          <a [routerLink]="'/' + post.slug" class="flex-shrink-0">
            <div class="w-[120px] h-[80px] overflow-hidden bg-muted rounded-sm">
              <img
                [src]="post.heroImage.url"
                [alt]="post.heroImage.alt ?? post.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
                width="120"
                height="80"
              />
            </div>
          </a>
        }
        <div class="flex-1 min-w-0">
          @if (post.primaryCategory) {
            <a
              [routerLink]="['/category', post.primaryCategory.slug]"
              class="text-xs font-bold uppercase tracking-wider mb-1 inline-block hover:opacity-80 transition-opacity"
              [style.color]="post.primaryCategory.color ?? 'var(--color-primary)'"
              >{{ post.primaryCategory.name }}</a
            >
          }
          <h3 class="font-heading text-base font-bold leading-snug text-secondary line-clamp-2">
            <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
              {{ post.title }}
            </a>
          </h3>
          <div class="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            @if (post.author) {
              <span>{{ post.author.displayName }}</span>
              <span class="text-gray-300">•</span>
            }
            @if (post.publishedAt) {
              <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
            }
          </div>
        </div>
      </article>
    }
  `,
})
export class HomeListItemComponent {
  @Input() post: PostSummary | null = null;

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  }
}
