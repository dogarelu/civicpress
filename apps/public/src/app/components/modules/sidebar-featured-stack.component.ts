import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { hasModuleMedia, type LayoutDisplaySlot, type PostSummary } from '@civicpress/shared';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostModuleMediaComponent } from '../post-module-media.component';

/** Sidebar column: one main article + secondary title/thumb rows. */
@Component({
  selector: 'cp-sidebar-featured-stack',
  standalone: true,
  imports: [RouterModule, PostImagePillsComponent, PostSubtitleComponent, PostModuleMediaComponent],
  template: `
    @if (mainPost) {
      <aside>
        @if (title.trim().length > 0) {
          <h3
            class="font-heading leading-tight text-center text-secondary mb-3"
            style="font-size: var(--row-header-font-size, 18px); font-weight: var(--row-header-font-weight, 800); color: var(--row-header-color, currentColor);"
          >
            {{ title }}
          </h3>
        }

        <article class="group">
          @if (hasModuleMedia(mainPost)) {
            <div class="relative overflow-hidden bg-muted aspect-[16/9]">
              <cp-post-module-media [post]="mainPost" playMode="inline">
                <cp-post-image-pills [pills]="mainPost.pills" />
              </cp-post-module-media>
            </div>
          }
          <h3
            class="mt-2 font-heading leading-tight text-secondary"
            style="font-size: var(--hero-title-font-size, var(--news-title-font-size, 22px)); font-weight: var(--hero-title-font-weight, var(--news-title-font-weight, 700)); color: var(--hero-title-color, var(--news-title-color, currentColor));"
          >
            <a [routerLink]="'/' + mainPost.slug" class="hover:text-primary transition-colors">
              {{ mainPost.title }}
            </a>
          </h3>
          <cp-post-subtitle
            [show]="false"
            [showBumbi]="showBumbi"
            [bulbi]="mainPost.bulbi ?? []"
            listClass="text-gray-600 mt-2"
            textClass="text-gray-600 mt-2"
          />
        </article>

        @if (secondaryPosts.length > 0) {
          <div class="cp-stack-rule" aria-hidden="true"></div>
          <ul class="divide-y divide-gray-400">
            @for (post of secondaryPosts; track post.id) {
              <li class="py-3">
                <article class="group flex gap-3 items-start">
                  <h4
                    class="flex-1 min-w-0 leading-snug text-secondary"
                    style="font-size: var(--module-small-title-font-size, 14px); font-weight: var(--module-small-title-font-weight, 600); color: var(--module-small-title-color, currentColor);"
                  >
                    <a [routerLink]="'/' + post.slug" class="hover:text-primary transition-colors">
                      {{ post.title }}
                    </a>
                  </h4>
                  @if (hasModuleMedia(post)) {
                    <div class="relative w-[72px] h-[54px] overflow-hidden bg-muted flex-shrink-0">
                      <cp-post-module-media [post]="post" playMode="overlay" playButton="sm">
                        <cp-post-image-pills [pills]="post.pills" size="sm" />
                      </cp-post-module-media>
                    </div>
                  }
                </article>
              </li>
            }
          </ul>
        }
      </aside>
    }
  `,
})
export class SidebarFeaturedStackComponent {
  readonly hasModuleMedia = hasModuleMedia;

  @Input() posts: PostSummary[] = [];
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  @Input() title = '';
  /** How many secondary rows under the main article. */
  @Input() secondaryCount = 3;
  @Input() showBumbi = false;

  get mainPost(): PostSummary | null {
    return this.posts[0] ?? null;
  }

  get secondaryPosts(): PostSummary[] {
    return this.posts.slice(1, 1 + Math.max(1, this.secondaryCount));
  }
}
