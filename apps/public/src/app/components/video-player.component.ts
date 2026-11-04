import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { resolveVideoPlaybackUrl, youtubeThumbnailUrl } from '@civicpress/shared';
import { VideoPlayBadgeComponent } from './video-play-badge.component';

type FullscreenHost = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
};

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

@Component({
  selector: 'cp-video-player',
  standalone: true,
  imports: [CommonModule, VideoPlayBadgeComponent],
  host: {
    class: 'block w-full h-full',
    '[attr.data-playing]': 'playing()',
  },
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  template: `
    <div
      #container
      class="relative w-full h-full bg-black overflow-hidden"
      [class.rounded]="rounded() && !isFullscreen()"
    >
      @if (!playing()) {
        <button
          type="button"
          class="absolute inset-0 z-10 group"
          (click)="startPlayback()"
          [attr.aria-label]="playAriaLabel()"
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
          <cp-video-play-badge [size]="playButton()" />
        </button>
      } @else {
        @if (isYoutube()) {
          <iframe
            [src]="safeEmbedUrl()"
            class="absolute inset-0 w-full h-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowfullscreen
          ></iframe>
        } @else {
          <video
            #videoEl
            [src]="playback().src"
            class="absolute inset-0 w-full h-full object-contain bg-black"
            controls
            playsinline
            webkit-playsinline
            (click)="$event.stopPropagation()"
          ></video>
        }
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
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  videoUrl = input.required<string>();
  title = input('');
  posterUrl = input<string | null>(null);
  rounded = input(true);
  showControls = input(true);
  autoplayOnStart = input(true);
  /** When true, start playback as soon as `videoUrl` is shown/changed (e.g. playlist swap). */
  autoStart = input(false);
  playButton = input<'sm' | 'md' | 'lg'>('lg');
  playingChange = output<boolean>();

  @ViewChild('container') containerRef?: ElementRef<HTMLElement>;
  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  playing = signal(false);
  isFullscreen = signal(false);
  /** Last URL the reset/auto-start effect already handled. */
  private handledVideoUrl: string | null = null;

  playback = computed(() => resolveVideoPlaybackUrl(this.videoUrl()));
  isYoutube = computed(() => this.playback().type === 'youtube');
  playAriaLabel = computed(() => `Redă ${this.title()}`);
  displayPosterUrl = computed(() => {
    const explicitPoster = this.posterUrl();
    if (explicitPoster) return explicitPoster;
    if (this.playback().type !== 'youtube') return null;
    return youtubeThumbnailUrl(this.videoUrl());
  });

  /**
   * Memoized via computed: the sanitized URL must be referentially stable
   * across change detection cycles, otherwise Angular re-assigns the iframe
   * src on every cycle and the YouTube player reloads continuously.
   */
  safeEmbedUrl = computed<SafeResourceUrl>(() => {
    const src = this.withYoutubeInlineParams(this.playback().src, this.autoplayOnStart());
    return this.sanitizer.bypassSecurityTrustResourceUrl(src);
  });

  constructor() {
    // Only reset/auto-start when the bound video URL changes.
    // Parent CD rebinds the same URL every cycle; treating that as a
    // change immediately cleared `playing` and blocked the play button.
    effect(
      () => {
        const url = this.videoUrl();
        const autoStart = this.autoStart();
        if (url === this.handledVideoUrl) return;
        this.handledVideoUrl = url;
        if (autoStart) {
          this.beginPlayback();
        } else {
          this.setPlaying(false);
        }
      },
      { allowSignalWrites: true },
    );

    if (isPlatformBrowser(this.platformId)) {
      const onFullscreenChange = () => this.isFullscreen.set(this.hasFullscreenElement());
      this.document.addEventListener('fullscreenchange', onFullscreenChange);
      this.document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      this.destroyRef.onDestroy(() => {
        this.document.removeEventListener('fullscreenchange', onFullscreenChange);
        this.document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      });
    }
  }

  startPlayback() {
    this.beginPlayback();
  }

  private setPlaying(value: boolean) {
    if (this.playing() === value) return;
    this.playing.set(value);
    this.playingChange.emit(value);
  }

  private beginPlayback() {
    this.setPlaying(true);
    // ViewChild is only available after the next CD cycle creates <video>.
    setTimeout(() => {
      const video = this.videoEl?.nativeElement;
      if (video && this.autoplayOnStart()) {
        video.playsInline = true;
        void video.play().catch(() => undefined);
      }
    });
  }

  async toggleFullscreen(event: Event) {
    event.stopPropagation();
    if (this.hasFullscreenElement()) {
      await this.exitFullscreen();
      return;
    }
    await this.enterFullscreen();
  }

  private hasFullscreenElement(): boolean {
    const doc = this.document as FullscreenDocument;
    return !!(this.document.fullscreenElement || doc.webkitFullscreenElement);
  }

  private async enterFullscreen(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.hasFullscreenElement()) {
      this.isFullscreen.set(this.hasFullscreenElement());
      return;
    }

    const el = this.containerRef?.nativeElement as FullscreenHost | undefined;
    if (!el) return;

    const request =
      el.requestFullscreen?.bind(el) ??
      el.webkitRequestFullscreen?.bind(el) ??
      el.webkitRequestFullScreen?.bind(el);

    if (request) {
      try {
        await request();
        this.isFullscreen.set(true);
        return;
      } catch {
        // Fall through to the iOS video API when the element API is blocked.
      }
    }

    this.tryIosVideoFullscreen();
  }

  private async exitFullscreen(): Promise<void> {
    const doc = this.document as FullscreenDocument;
    const exit =
      this.document.exitFullscreen?.bind(this.document) ?? doc.webkitExitFullscreen?.bind(doc);
    if (!exit) return;
    try {
      await exit();
    } catch {
      // Ignore rejected exits (already left fullscreen).
    }
    this.isFullscreen.set(false);
  }

  private tryIosVideoFullscreen(): void {
    const video = this.videoEl?.nativeElement as FullscreenVideo | undefined;
    try {
      video?.webkitEnterFullscreen?.();
    } catch {
      // Safari can reject this outside a gesture; inline playback still works.
    }
  }

  private withYoutubeInlineParams(src: string, autoplay: boolean): string {
    try {
      const url = new URL(src);
      url.searchParams.set('playsinline', '1');
      if (autoplay) url.searchParams.set('autoplay', '1');
      return url.toString();
    } catch {
      return autoplay ? `${src}${src.includes('?') ? '&' : '?'}autoplay=1` : src;
    }
  }
}
