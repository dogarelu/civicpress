import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PostSummary } from '@civicpress/shared';

@Component({
  selector: 'cp-post-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (post) {
      <article class="group">
        <a [routerLink]="'/' + post.slug" class="block">
          @if (post.heroImage) {
            <div class="overflow-hidden bg-muted" [class]="imageClass">
              <img
                [src]="post.heroImage.url"
                [alt]="post.heroImage.alt ?? post.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          }
        </a>
        <div class="mt-2">
          @if (post.primaryCategory && showCategory) {
            <a
              [routerLink]="['/category', post.primaryCategory.slug]"
              class="text-xs font-bold uppercase tracking-wider mb-1 inline-block"
              [style.color]="post.primaryCategory.color ?? 'var(--color-primary)'"
            >
              {{ post.primaryCategory.name }}
            </a>
          }
          <h3 [class]="titleClass">
            <a
              [routerLink]="'/' + post.slug"
              class="hover:text-primary transition-colors leading-snug"
            >
              {{ post.title }}
            </a>
          </h3>
          @if (showExcerpt && post.excerpt) {
            <p class="text-sm text-gray-600 mt-1 line-clamp-3">{{ cleanExcerpt }}</p>
          }
          @if (showMeta) {
            <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
              @if (post.author) {
                <span>{{ post.author.displayName }}</span>
                <span>·</span>
              }
              @if (post.publishedAt) {
                <time [dateTime]="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
              }
            </div>
          }
        </div>
      </article>
    }
  `,
})
export class PostCardComponent {
  @Input() post: PostSummary | null = null;
  @Input() imageClass = 'aspect-[16/9]';
  @Input() titleClass = 'font-heading font-semibold text-sm leading-tight text-secondary';
  @Input() showCategory = true;
  @Input() showExcerpt = false;
  @Input() showMeta = false;

  get cleanExcerpt(): string {
    if (!this.post?.excerpt) return '';
    return this.post.excerpt.replace(/<[^>]*>/g, '').trim();
  }

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  }
}
