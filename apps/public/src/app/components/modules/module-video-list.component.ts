import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { ResolvedModule } from '@civicpress/shared';
import { youtubeThumbnailUrl } from '@civicpress/shared';
import { VideoPlayerComponent } from '../video-player.component';
import { VideoPlayBadgeComponent } from '../video-play-badge.component';
import { PostSubtitleComponent } from '../post-subtitle.component';

type VideoListItem = ResolvedModule['posts'][number];

/**
 * Main-column module: one featured video + scrollable side list.
 * Side list matches the featured frame height; each item is ~1/2.7 of that
 * height so a partial third row signals scroll.
 *
 * Fox News–style: big video plays in-page; clicking a side item swaps it into
 * the main slot and autoplays.
 */
@Component({
  selector: 'cp-module-video-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    VideoPlayerComponent,
    VideoPlayBadgeComponent,
    PostSubtitleComponent,
  ],
  template: `
    @if (main; as featured) {
      <div class="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-0 gap-3">
        <div
          class="md:col-start-1 md:row-start-1 aspect-video rounded-sm shadow-sm overflow-hidden md:pr-4"
        >
          @for (slot of [featured]; track slot.post.id) {
            @if (slot.post.videoUrl; as videoUrl) {
              <cp-video-player
                [videoUrl]="videoUrl"
                [title]="slot.post.title"
                [posterUrl]="posterFor(slot)"
                [rounded]="false"
                [autoStart]="autoStartMain"
              />
            } @else {
              <div class="relative w-full h-full overflow-hidden bg-muted">
                @if (posterFor(slot); as poster) {
                  <img
                    [src]="poster"
                    [alt]="slot.post.title"
                    class="w-full h-full object-cover"
                    loading="eager"
                  />
                } @else {
                  <div class="w-full h-full bg-gray-200"></div>
                }
              </div>
            }
          }
        </div>

        @if (sideItems.length > 0) {
          <div
            class="md:col-start-2 md:row-start-1 min-h-0 md:h-full pt-3 border-t border-gray-400 md:pt-0 md:border-t-0 md:pl-4 md:border-l md:border-gray-400 overflow-y-auto [container-type:size]"
          >
            <div class="divide-y divide-gray-400">
              @for (item of sideItems; track trackKey(item, $index); let i = $index) {
                <button
                  type="button"
                  class="flex w-full gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  style="min-height: calc(100cqh / 2.7);"
                  (click)="promoteSide(i)"
                >
                  <div
                    class="relative shrink-0 w-[42%] max-w-[140px] aspect-video self-center overflow-hidden bg-muted rounded-sm"
                  >
                    @if (posterFor(item); as poster) {
                      <img
                        [src]="poster"
                        [alt]="item.post.title"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    }
                    <cp-video-play-badge size="sm" />
                  </div>
                  <h4
                    class="flex-1 min-w-0 self-center leading-snug"
                    style="font-size: var(--small-title-font-size, 15px); font-weight: var(--small-title-font-weight, 700); color: var(--small-title-color, #1e3a5f);"
                  >
                    {{ item.post.title }}
                  </h4>
                </button>
              }
            </div>
          </div>
        }

        <a
          [routerLink]="['/video', featured.post.slug]"
          class="group block md:col-start-1 md:row-start-2 mt-1"
        >
          <h3
            class="font-heading leading-tight text-secondary group-hover:text-primary transition-colors"
            style="font-size: var(--hero-title-font-size, 24px); font-weight: var(--hero-title-font-weight, 800); color: var(--hero-title-color, currentColor);"
          >
            {{ featured.post.title }}
          </h3>
        </a>
        <cp-post-subtitle
          [show]="false"
          [showBumbi]="showBumbi"
          [bulbi]="featured.post.bulbi ?? []"
          listClass="text-gray-600 mt-2"
          textClass="text-gray-600 mt-2"
        />
      </div>
    }
  `,
})
export class ModuleVideoListComponent implements OnChanges {
  @Input() items: ResolvedModule['posts'] = [];
  @Input() showBumbi = false;

  /** Local playlist order; first item is the featured/main video. */
  playlist: VideoListItem[] = [];
  /** After a side-item swap, the main player should autoplay. */
  autoStartMain = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.playlist = (this.items ?? []).slice(0, 11);
      this.autoStartMain = false;
    }
  }

  get main(): VideoListItem | null {
    return this.playlist[0] ?? null;
  }

  get sideItems(): VideoListItem[] {
    return this.playlist.slice(1, 11);
  }

  trackKey(item: VideoListItem, index: number): string {
    return item.post.id || `video-side-${index}`;
  }

  posterFor(item: VideoListItem): string | null {
    return item.post.heroImage?.url ?? youtubeThumbnailUrl(item.post.videoUrl ?? '') ?? null;
  }

  promoteSide(sideIndex: number): void {
    const playlistIndex = sideIndex + 1;
    if (playlistIndex <= 0 || playlistIndex >= this.playlist.length) return;

    const next = [...this.playlist];
    const previousMain = next[0];
    next[0] = next[playlistIndex];
    next[playlistIndex] = previousMain;
    this.playlist = next;
    this.autoStartMain = true;
  }
}
