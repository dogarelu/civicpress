import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import type { ModulePicturesCount, ResolvedModulePost } from '@civicpress/shared';
import { normalizeModulePicturesCount } from '@civicpress/shared';
import { PostImagePillsComponent } from '../post-image-pills.component';
import { PostSubtitleComponent } from '../post-subtitle.component';
import { PostModuleMediaComponent } from '../post-module-media.component';

/** Full-width (6–7) or main-column (5) row of portrait cards with title overlay + optional pill. */
@Component({
  selector: 'cp-module-pictures-7',
  standalone: true,
  imports: [RouterModule, PostImagePillsComponent, PostSubtitleComponent, PostModuleMediaComponent],
  styles: [
    `
      /* Fox News–style: each wrapped line gets its own white band, width = text. */
      .pictures-7-title {
        display: inline;
        margin: 0;
        padding: 2px 5px;
        /* Tighter than padded height so bands abut with no photo gap between rows. */
        line-height: 1.15;
        background: #fff;
        color: #111827;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        border-radius: 3px;
        word-break: break-word;
      }
    `,
  ],
  template: `
    @if (items.length > 0) {
      <div [class]="gridClass">
        @for (item of items.slice(0, pictureCount); track item.post.id) {
          <article
            class="group shrink-0 w-[42vw] max-w-[180px] lg:w-auto lg:max-w-none border-r border-gray-400 last:border-r-0"
          >
            <div
              class="relative aspect-[2/3] overflow-hidden rounded-md bg-muted shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <cp-post-module-media [post]="item.post" playMode="inline">
                <cp-post-image-pills [pills]="item.post.pills" size="sm" corner="top-right" />
              </cp-post-module-media>
              <a
                [routerLink]="'/' + item.post.slug"
                class="absolute inset-x-0 bottom-0 z-20 p-1.5 sm:p-2 text-left"
              >
                <h3
                  class="pictures-7-title"
                  style="font-size: var(--news-title-font-size, 10px); font-weight: var(--news-title-font-weight, 700); color: var(--news-title-color, #111827);"
                >
                  {{ item.post.title }}
                </h3>
              </a>
            </div>
            <cp-post-subtitle
              [show]="false"
              [showBumbi]="showBumbi"
              [bulbi]="item.post.bulbi ?? []"
              listClass="mt-1.5 text-gray-600"
              textClass="mt-1.5 text-gray-600"
            />
          </article>
        }
      </div>
    }
  `,
})
export class ModulePictures7Component {
  /** Resolved posts for this module (up to `count`). */
  @Input() items: ResolvedModulePost[] = [];
  /** Picture count: 5 (main column), 6 or 7 (full width). Default 7. */
  @Input() set count(value: number | null | undefined) {
    this.pictureCount = normalizeModulePicturesCount(value);
  }

  pictureCount: ModulePicturesCount = 7;
  @Input() showBumbi = false;

  get gridClass(): string {
    if (this.pictureCount === 5) {
      return 'flex gap-2.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0';
    }
    if (this.pictureCount === 6) {
      return 'flex gap-2.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0';
    }
    return 'flex gap-2.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-7 lg:overflow-visible lg:pb-0';
  }
}
