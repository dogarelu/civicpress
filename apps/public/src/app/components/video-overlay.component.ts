import { Component, DestroyRef, PLATFORM_ID, effect, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { VideoOverlayService } from '../services/video-overlay.service';
import { VideoPlayerComponent } from './video-player.component';

/** Fullscreen in-page player used when a module thumbnail is too small to play inline. */
@Component({
  selector: 'cp-video-overlay',
  standalone: true,
  imports: [VideoPlayerComponent],
  template: `
    @if (overlay.video(); as video) {
      <div
        class="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 sm:p-8"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Redă ' + video.title"
        (click)="overlay.close()"
      >
        <button
          type="button"
          class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 text-gray-900 text-xl leading-none hover:bg-white"
          (click)="overlay.close(); $event.stopPropagation()"
          aria-label="Închide video"
        >
          ×
        </button>
        <div
          class="w-full max-w-5xl aspect-video overflow-hidden rounded-sm shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <cp-video-player
            [videoUrl]="video.videoUrl"
            [title]="video.title"
            [posterUrl]="video.posterUrl"
            [rounded]="false"
            [autoStart]="true"
          />
        </div>
      </div>
    }
  `,
})
export class VideoOverlayComponent {
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  overlay = inject(VideoOverlayService);

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.document.body.style.overflow = this.overlay.video() ? 'hidden' : '';
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationStart => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.overlay.close());

    if (isPlatformBrowser(this.platformId)) {
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') this.overlay.close();
      };
      this.document.addEventListener('keydown', onKey);
      this.destroyRef.onDestroy(() => {
        this.document.removeEventListener('keydown', onKey);
        this.document.body.style.overflow = '';
      });
    }
  }
}
