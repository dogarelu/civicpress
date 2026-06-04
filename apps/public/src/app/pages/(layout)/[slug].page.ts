import { Component, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { ShareButtonsComponent } from '../../components/share-buttons.component';
import { PostCardListComponent } from '../../components/post-card-list.component';

import type { PostDetail } from '@civicpress/shared';

type SlugLoad = (args: PageServerLoad) => Promise<{ post: PostDetail }>;

@Component({
  selector: 'cp-article-page',
  standalone: true,
  imports: [RouterModule, BreadcrumbComponent, ShareButtonsComponent, PostCardListComponent],
  template: `
    <main class="container mx-auto px-4 py-6">
      @if (post()) {
        <div class="max-w-4xl mx-auto">
          <cp-breadcrumb [items]="breadcrumbs()" />

          <article>
            @if (post()!.categories[0]) {
              <a
                [routerLink]="['/category', post()!.categories[0].slug]"
                class="text-sm font-bold uppercase tracking-wider mb-3 inline-block"
                [style.color]="post()!.categories[0].color ?? 'var(--color-primary)'"
                >{{ post()!.categories[0].name }}</a
              >
            }

            <h1
              class="font-heading text-2xl md:text-3xl font-bold leading-tight text-secondary mb-4"
            >
              {{ post()!.title }}
            </h1>

            <div
              class="flex items-center gap-3 text-sm text-gray-500 mb-6 border-b border-border pb-4"
            >
              @if (post()!.author) {
                <span class="font-medium text-secondary">{{ post()!.author!.displayName }}</span>
                <span>·</span>
              }
              @if (post()!.publishedAt) {
                <time [dateTime]="post()!.publishedAt!">{{
                  formatDate(post()!.publishedAt!)
                }}</time>
              }
            </div>

            @if (post()!.videoUrl) {
              <div class="mb-6 aspect-video">
                <iframe
                  [src]="post()!.videoUrl"
                  class="w-full h-full rounded"
                  frameborder="0"
                  allowfullscreen
                ></iframe>
              </div>
            } @else if (post()!.heroImage) {
              <figure class="mb-6">
                <img
                  [src]="post()!.heroImage!.url"
                  [alt]="post()!.heroImage!.alt ?? post()!.title"
                  class="w-full rounded object-cover"
                  loading="eager"
                />
                @if (post()!.heroImage!.caption) {
                  <figcaption class="text-xs text-gray-500 mt-1 text-center italic">
                    {{ post()!.heroImage!.caption }}
                  </figcaption>
                }
              </figure>
            }

            <div
              class="article-content prose prose-sm max-w-none"
              [innerHTML]="post()!.contentHtml"
            ></div>

            @if (post()!.tags?.length > 0) {
              <div class="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border">
                <span class="text-xs text-gray-500">Tag-uri:</span>
                @for (tag of post()!.tags; track tag.id) {
                  <span class="px-2 py-0.5 bg-muted text-xs text-gray-600 rounded">{{
                    tag.name
                  }}</span>
                }
              </div>
            }

            <cp-share-buttons [title]="post()!.title" [url]="currentUrl()" />
          </article>

          @if (post()!.relatedPosts?.length > 0) {
            <aside class="mt-10 pt-6 border-t-2 border-primary">
              <h2
                class="font-heading text-base font-bold uppercase tracking-wide text-secondary mb-4"
              >
                Articole asemănătoare
              </h2>
              <div class="space-y-4">
                @for (related of post()!.relatedPosts; track related.id) {
                  <cp-post-card-list [post]="related" />
                }
              </div>
            </aside>
          }
        </div>
      }
    </main>
  `,
})
export default class ArticlePageComponent {
  private load = toSignal(injectLoad<SlugLoad>());
  post = computed(() => this.load()?.post ?? null);

  breadcrumbs = computed(() => {
    const p = this.post();
    if (!p) return [];
    const cat = p.categories[0];
    return [
      ...(cat ? [{ label: cat.name, href: `/category/${cat.slug}` }] : []),
      { label: p.title.slice(0, 50) + (p.title.length > 50 ? '…' : '') },
    ];
  });

  currentUrl() {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  }
}
