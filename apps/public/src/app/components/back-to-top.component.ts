import { Component, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, throttleTime } from 'rxjs';

@Component({
  selector: 'cp-back-to-top',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <button
        type="button"
        (click)="scrollToTop()"
        class="fixed bottom-6 right-6 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        aria-label="Înapoi sus"
        title="Înapoi sus"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </button>
    }
  `,
})
export class BackToTopComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  visible = signal(false);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.updateVisibility(window.scrollY);

    fromEvent(window, 'scroll', { passive: true })
      .pipe(throttleTime(100), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateVisibility(window.scrollY));
  }

  scrollToTop() {
    if (!isPlatformBrowser(this.platformId)) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private updateVisibility(scrollY: number) {
    this.visible.set(scrollY > 400);
  }
}
