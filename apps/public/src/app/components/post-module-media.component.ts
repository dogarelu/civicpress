import { Component, computed, input, output, signal, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import type { PostSummary } from '@civicpress/shared';
import { moduleMediaPosterUrl } from '@civicpress/shared';
import { VideoPlayerComponent } from './video-player.component';
import { VideoPlayBadgeComponent } from './video-play-badge.component';
import { VideoOverlayService } from '../services/video-overlay.service';

/**
 * Module media slot: hero image, or video poster + in-page play.
 * `inline` plays in the frame; `overlay` opens the fullscreen player.
 */
@Component({
  selector: 'cp-post-module-media',
  standalone: true,
  imports: [RouterModule, VideoPlayerComponent, VideoPlayBadgeComponent],
  host: {
    class: 'relative block w-full h-full overflow-hidden bg-muted',
  },
  template: `
    @if (isInlineVideo()) {
      <cp-video-player
        [videoUrl]="inlineVideoUrl()"
        [title]="post().title"
        [posterUrl]="posterUrl()"
        [rounded]="false"
        [playButton]="playButton()"
        (playingChange)="onPlayingChange($event)"
      />
    } @else {
      @if (isOverlayVideo()) {
        <button
          type="button"
          class="absolute inset-0 z-10 group"
          (click)="openOverlay($event)"
          [attr.aria-label]="playAriaLabel()"
        >
          @if (posterUrl(); as poster) {
            <img
              [src]="poster"
              [alt]="imageAlt()"
              class="absolute inset-0 w-full h-full object-cover"
              [loading]="eager() ? 'eager' : 'lazy'"
            />
          }
          <cp-video-play-badge [size]="playButton()" />
        </button>
      } @else {
        @if (posterUrl(); as poster) {
          @if (linkImage()) {
            <a [routerLink]="'/' + post().slug" class="absolute inset-0 block">
              <img
                [src]="poster"
                [alt]="imageAlt()"
                class="w-full h-full object-cover"
                [loading]="eager() ? 'eager' : 'lazy'"
              />
            </a>
          } @else {
            <img
              [src]="poster"
              [alt]="imageAlt()"
              class="absolute inset-0 w-full h-full object-cover"
              [loading]="eager() ? 'eager' : 'lazy'"
            />
          }
        } @else {
          <div class="absolute inset-0 bg-gray-200"></div>
        }
      }
    }

    <div class="absolute inset-0 pointer-events-none" [class.hidden]="playing()">
      <ng-content />
    </div>
  `,
})
export class PostModuleMediaComponent {
  private overlay = inject(VideoOverlayService);

  post = input.required<PostSummary>();
  playMode = input<'inline' | 'overlay'>('inline');
  /** When false (inactive slideshow slide), show a static poster instead of a live player. */
  active = input(true);
  /** Wrap image-only media in a link to the article. */
  linkImage = input(true);
  eager = input(false);
  playButton = input<'sm' | 'md' | 'lg'>('md');
  playingChange = output<boolean>();

  playing = signal(false);

  videoUrl = computed(() => this.post().videoUrl?.trim() || null);
  posterUrl = computed(() => moduleMediaPosterUrl(this.post()));
  imageAlt = computed(() => this.post().heroImage?.alt ?? this.post().title);
  isInlineVideo = computed(
    () => !!this.videoUrl() && this.active() && this.playMode() === 'inline',
  );
  isOverlayVideo = computed(() => !!this.videoUrl() && this.playMode() === 'overlay');
  inlineVideoUrl = computed(() => this.videoUrl() ?? '');
  playAriaLabel = computed(() => `Redă ${this.post().title}`);

  onPlayingChange(playing: boolean): void {
    this.playing.set(playing);
    this.playingChange.emit(playing);
  }

  openOverlay(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const videoUrl = this.videoUrl();
    if (!videoUrl) return;
    this.overlay.open({
      videoUrl,
      title: this.post().title,
      posterUrl: this.posterUrl(),
    });
  }
}
