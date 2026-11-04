import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ViewportScroller, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

const STORAGE_KEY = 'cp_scroll_positions';
const RESTORE_DELAYS_MS = [0, 50, 150, 400];

/** Saves window scroll on leave and restores it on browser back/forward. */
@Injectable({ providedIn: 'root' })
export class ScrollRestoreService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private viewport = inject(ViewportScroller);

  private started = false;
  private lastUrl = '';
  private lastTrigger: NavigationStart['navigationTrigger'] = 'imperative';
  private restoreTimers: ReturnType<typeof setTimeout>[] = [];

  start(): void {
    if (!isPlatformBrowser(this.platformId) || this.started) return;
    this.started = true;
    this.lastUrl = this.normalize(this.router.url);

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.clearRestoreTimers();
        this.save(this.lastUrl);
        this.lastTrigger = event.navigationTrigger;
        return;
      }
      if (event instanceof NavigationEnd) {
        this.lastUrl = this.normalize(event.urlAfterRedirects);
        if (this.lastTrigger === 'popstate') {
          this.scheduleRestore(this.lastUrl);
        }
      }
    });
  }

  private normalize(url: string): string {
    return url.split('#')[0] || '/';
  }

  private save(url: string): void {
    if (!url) return;
    const store = this.readStore();
    store[url] = this.viewport.getScrollPosition();
    this.writeStore(store);
  }

  private scheduleRestore(url: string): void {
    const position = this.readStore()[url];
    if (!position) return;
    this.clearRestoreTimers();
    for (const delay of RESTORE_DELAYS_MS) {
      this.restoreTimers.push(setTimeout(() => this.viewport.scrollToPosition(position), delay));
    }
  }

  private clearRestoreTimers(): void {
    for (const timer of this.restoreTimers) clearTimeout(timer);
    this.restoreTimers = [];
  }

  private readStore(): Record<string, [number, number]> {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<
        string,
        [number, number]
      >;
    } catch {
      return {};
    }
  }

  private writeStore(store: Record<string, [number, number]>): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // private mode / quota
    }
  }
}
