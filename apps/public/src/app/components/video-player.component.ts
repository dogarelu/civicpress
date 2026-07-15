import {
  Component,
  ViewChild,
  ElementRef,
  computed,
  effect,
  input,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { resolveVideoPlaybackUrl } from '@civicpress/shared';

@Component({
  selector: 'cp-video-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #container
      class="relative w-full h-full bg-black overflow-hidden"
      [class.rounded]="rounded()"
    >
      @if (!playing()) {
        <button
          type="button"
          class="absolute inset-0 z-10 flex items-center justify-center group"
          (click)="startPlayback()"
          [attr.aria-label]="'Redă ' + title()"
        >
          @if (displayPosterUrl(); as poster) {
            <img
              [src]="poster"
              [alt]="title()"
              class="absolute inset-0 w-full h-full object-cover"
            />
            <div
              class="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition-colors"
            ></div>
          }
          <span
            class="relative z-10 w-14 h-14 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"
          >
            <svg class="w-7 h-7 ml-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      } @else if (playback().type === 'youtube') {
        <iframe
          [src]="safeEmbedUrl()"
          class="absolute inset-0 w-full h-full"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      } @else {
        <video
          #videoEl
          [src]="playback().src"
          class="absolute inset-0 w-full h-full object-contain bg-black"
          controls
          playsinline
          (click)="$event.stopPropagation()"
        ></video>
      }

      @if (showControls() && playing()) {
        <div class="absolute top-2 right-2 z-20 flex gap-1.5">
          <button
            type="button"
            (click)="toggleFullscreen($event)"
            class="px-2 py-1 rounded bg-black/55 text-white text-[11px] font-semibold uppercase tracking-wide hover:bg-black/75 transition-colors"
          >
            {{ isFullscreen() ? 'Ieși' : 'Fullscreen' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class VideoPlayerComponent {
  private sanitizer = inject(DomSanitizer);

  videoUrl = input.required<string>();
  title = input('');
  posterUrl = input<string | null>(null);
  rounded = input(true);
  showControls = input(true);
  autoplayOnStart = input(true);

  @ViewChild('container') containerRef?: ElementRef<HTMLElement>;
  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  playing = signal(false);
  isFullscreen = signal(false);

  playback = computed(() => resolveVideoPlaybackUrl(this.videoUrl()));
  displayPosterUrl = computed(() => {
    const explicitPoster = this.posterUrl();
    if (explicitPoster) return explicitPoster;
    if (this.playback().type !== 'youtube') return null;
    return this.youtubeThumbnailUrl(this.videoUrl());
  });

  /**
   * Memoized via computed: the sanitized URL must be referentially stable
   * across change detection cycles, otherwise Angular re-assigns the iframe
   * src on every cycle and the YouTube player reloads continuously.
   */
  safeEmbedUrl = computed<SafeResourceUrl>(() => {
    const src = this.playback().src;
    const url = this.autoplayOnStart() ? `${src}${src.includes('?') ? '&' : '?'}autoplay=1` : src;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  constructor() {
    // Back to the poster/play state when the parent swaps in a different video.
    effect(
      () => {
        this.videoUrl();
        this.playing.set(false);
      },
      { allowSignalWrites: true },
    );
  }

  startPlayback() {
    this.playing.set(true);
    queueMicrotask(() => {
      const video = this.videoEl?.nativeElement;
      if (video && this.autoplayOnStart()) {
        void video.play().catch(() => undefined);
      }
    });
  }

  async toggleFullscreen(event: Event) {
    event.stopPropagation();
    const el = this.containerRef?.nativeElement;
    if (!el) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      this.isFullscreen.set(false);
      return;
    }

    await el.requestFullscreen();
    this.isFullscreen.set(true);
  }

  private youtubeThumbnailUrl(url: string): string | null {
    const id = this.extractYoutubeVideoId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }

  private extractYoutubeVideoId(url: string): string | null {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');

      if (host === 'youtu.be') {
        return u.pathname.slice(1).split('/')[0] || null;
      }

      if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
        if (u.pathname.startsWith('/embed/')) {
          return u.pathname.split('/')[2] || null;
        }
        const v = u.searchParams.get('v');
        if (v) return v;
        const shortsMatch = u.pathname.match(/^\/shorts\/([^/?]+)/);
        if (shortsMatch) return shortsMatch[1];
      }
    } catch {
      return null;
    }
    return null;
  }
}
