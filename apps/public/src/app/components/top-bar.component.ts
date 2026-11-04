import { Component, Input, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { PublicSettings } from '@civicpress/shared';
import { AdminSessionService } from '../services/admin-session.service';

@Component({
  selector: 'cp-top-bar',
  standalone: true,
  imports: [],
  template: `
    <div class="bg-white border-b border-gray-200 text-xs py-1.5">
      <div class="container page-container mx-auto px-3 md:px-4 flex items-center justify-between">
        <span class="text-gray-600 flex items-center gap-2 min-w-0">
          <span class="hidden sm:inline truncate">{{ todayStr }}</span>
          @if (timeStr) {
            <span class="tabular-nums">{{ timeStr }}</span>
          }
        </span>
        <div class="flex items-center gap-3">
          @if (canEditPosts()) {
            <a
              href="/admin/"
              class="inline-flex items-center rounded border border-gray-300 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Admin"
            >
              Admin
            </a>
          }
          @if (settings?.facebookUrl) {
            <a
              [href]="settings!.facebookUrl!"
              target="_blank"
              rel="noopener"
              class="text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="Facebook"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"
                />
              </svg>
            </a>
          }
          @if (settings?.twitterUrl) {
            <a
              [href]="settings!.twitterUrl!"
              target="_blank"
              rel="noopener"
              class="text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="Twitter/X"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"
                />
              </svg>
            </a>
          }
          @if (settings?.youtubeUrl) {
            <a
              [href]="settings!.youtubeUrl!"
              target="_blank"
              rel="noopener"
              class="text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="YouTube"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.007 2.007 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31.4 31.4 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A99.788 99.788 0 0 1 7.858 2h.193zM6.4 5.209v4.818l4.157-2.408L6.4 5.209z"
                />
              </svg>
            </a>
          }
        </div>
      </div>
    </div>
  `,
})
export class TopBarComponent implements OnInit, OnDestroy {
  @Input() settings: PublicSettings | null = null;
  todayStr = '';
  timeStr = '';

  private platformId = inject(PLATFORM_ID);
  private adminSession = inject(AdminSessionService);
  private timer: ReturnType<typeof setInterval> | null = null;
  isAdmin = this.adminSession.isAdmin;
  canEditPosts = this.adminSession.canEditPosts;

  ngOnInit() {
    this.todayStr = new Intl.DateTimeFormat('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());

    if (isPlatformBrowser(this.platformId)) {
      this.adminSession.hydrate();
      const tick = () => {
        this.timeStr = new Intl.DateTimeFormat('ro-RO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date());
      };
      tick();
      this.timer = setInterval(tick, 1000);
    }
  }

  ngOnDestroy() {
    if (this.timer !== null) {
      clearInterval(this.timer);
    }
  }
}
