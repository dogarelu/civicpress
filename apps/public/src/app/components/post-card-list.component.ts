import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PostSummary } from '@civicpress/shared';
import { SiteSettingsService } from '../services/site-settings.service';

@Component({
  selector: 'cp-post-card-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (post) {
      <article class="flex gap-3 group">
        @if (post.heroImage) {
          <a [routerLink]="'/' + post.slug" class="flex-shrink-0">
            <div class="w-[160px] h-[90px] overflow-hidden bg-muted">
              <img
                [src]="post.heroImage.url"
                [alt]="post.heroImage.alt ?? post.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                width="160"
                height="90"
              />
            </div>
          </a>
        }
        <div class="flex-1 min-w-0">
          @if (post.primaryCategory) {
            <a
              [routerLink]="['/category', post.primaryCategory.slug]"
              class="text-xs font-bold uppercase tracking-wider mb-1 inline-block text-gray-600 hover:text-gray-800 transition-colors"
              >{{ post.primaryCategory.name }}</a
            >
          }
          <h3 class="text-sm font-semibold leading-tight text-secondary">
            <a
              [routerLink]="'/' + post.slug"
              class="hover:text-primary transition-colors line-clamp-3"
            >
              {{ post.title }}
            </a>
          </h3>
          @if (post.publishedAt) {
            <time class="text-xs text-gray-400 mt-1 block" [dateTime]="post.publishedAt">
              {{ formatDate(post.publishedAt) }}
            </time>
          }
        </div>
      </article>
    }
  `,
})
export class PostCardListComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() post: PostSummary | null = null;

  formatDate(dateStr: string): string {
    return this.siteSettings.formatPostDate(dateStr);
  }
}
