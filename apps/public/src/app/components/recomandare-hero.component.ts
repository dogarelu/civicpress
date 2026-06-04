import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PostSummary } from '@civicpress/shared';

@Component({
  selector: 'cp-recomandare-hero',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (post) {
      <article class="group">
        <a [routerLink]="'/' + post.slug" class="block">
          @if (post.heroImage) {
            <div
              class="overflow-hidden bg-muted aspect-[16/9] max-h-[440px] rounded-sm shadow-sm group-hover:shadow-lg transition-shadow duration-300"
            >
              <img
                [src]="post.heroImage.url"
                [alt]="post.heroImage.alt ?? post.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="eager"
                width="660"
                height="370"
              />
            </div>
          }
        </a>
        <div class="mt-3 px-1">
          @if (post.primaryCategory) {
            <a
              [routerLink]="['/category', post.primaryCategory.slug]"
              class="text-sm font-bold uppercase tracking-wider mb-2 inline-block px-2 py-0.5 rounded-sm transition-opacity hover:opacity-80"
              [style.color]="post.primaryCategory.color ?? 'var(--color-primary)'"
              [style.background-color]="categoryBg"
              >{{ post.primaryCategory.name }}</a
            >
          }
          <h2 class="font-heading text-2xl md:text-3xl font-extrabold leading-tight text-secondary">
            <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
              {{ post.title }}
            </a>
          </h2>
          @if (post.excerpt) {
            <p class="text-sm text-gray-600 mt-2 line-clamp-3">{{ cleanExcerpt }}</p>
          }
          <div class="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
            @if (post.author) {
              <span class="font-medium">{{ post.author.displayName }}</span>
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
export class RecomandareHeroComponent {
  @Input() post: PostSummary | null = null;

  get cleanExcerpt(): string {
    if (!this.post?.excerpt) return '';
    return this.post.excerpt.replace(/<[^>]*>/g, '').trim();
  }

  get categoryBg(): string {
    const color = this.post?.primaryCategory?.color ?? '#8a0808';
    return color + '18';
  }

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  }
}
