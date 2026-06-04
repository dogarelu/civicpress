import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RecomandareHeroComponent } from '../../components/recomandare-hero.component';
import { CategoryWidgetComponent } from '../../components/category-widget.component';
import { HomeListItemComponent } from '../../components/home-list-item.component';
import type { HomeResponse, PostSummary } from '@civicpress/shared';

export interface HomeMagazineOptions {
  featuredCount: number;
}

@Component({
  selector: 'cp-home-magazine',
  standalone: true,
  imports: [RouterModule, RecomandareHeroComponent, CategoryWidgetComponent, HomeListItemComponent],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- ── Left: hero + grid + list ───────────────────────────── -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Hero -->
        <cp-recomandare-hero [post]="data?.hero ?? null" />

        <!-- 2×2 Grid -->
        @if (gridPosts.length > 0) {
          <section>
            <div class="flex items-center mb-4">
              <h2
                class="font-heading text-lg font-extrabold uppercase tracking-wider text-secondary border-b-[3px] border-primary pb-2 pr-6"
              >
                Recomandate
              </h2>
              <span class="flex-1 border-b border-border ml-2"></span>
            </div>
            <div class="grid grid-cols-2 gap-4">
              @for (post of gridPosts; track post.id) {
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
                          width="400"
                          height="225"
                        />
                      </div>
                    }
                  </a>
                  <div class="p-3">
                    @if (post.primaryCategory) {
                      <a
                        [routerLink]="['/category', post.primaryCategory.slug]"
                        class="text-xs font-bold uppercase tracking-wider mb-1 inline-block hover:opacity-80 transition-opacity"
                        [style.color]="post.primaryCategory.color ?? 'var(--color-primary)'"
                        >{{ post.primaryCategory.name }}</a
                      >
                    }
                    <h3
                      class="font-heading text-sm font-semibold leading-tight text-secondary line-clamp-3"
                    >
                      <a
                        [routerLink]="'/' + post.slug"
                        class="hover:text-primary transition-colors"
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

        <!-- List -->
        @if (listPosts.length > 0) {
          <section>
            <div class="flex items-center mb-4">
              <h2
                class="font-heading text-lg font-extrabold uppercase tracking-wider text-secondary border-b-[3px] border-primary pb-2 pr-6"
              >
                Ultimele știri
              </h2>
              <span class="flex-1 border-b border-border ml-2"></span>
            </div>
            <div class="divide-y divide-border">
              @for (post of listPosts; track post.id) {
                <cp-home-list-item [post]="post" />
              }
            </div>
          </section>
        }
      </div>

      <!-- ── Right: category widgets sidebar ────────────────────── -->
      <div class="lg:col-span-1 space-y-6">
        @for (strip of data?.categoryStrips ?? []; track strip.category.id) {
          @if (strip.posts.length > 0) {
            <cp-category-widget [strip]="strip" />
          }
        }
      </div>
    </div>
  `,
})
export default class HomeMagazineComponent {
  @Input() data: HomeResponse | null = null;
  @Input() options: HomeMagazineOptions = { featuredCount: 10 };

  get gridPosts(): PostSummary[] {
    return this.data?.grid ?? [];
  }

  get listPosts(): PostSummary[] {
    return this.data?.list ?? [];
  }
}
