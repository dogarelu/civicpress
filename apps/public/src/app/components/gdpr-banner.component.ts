import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'cp-gdpr-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div
        class="fixed bottom-0 left-0 right-0 z-50 bg-secondary text-white px-4 py-4 shadow-lg"
        role="dialog"
        aria-labelledby="gdpr-title"
      >
        <div class="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-sm text-gray-300 text-center sm:text-left" id="gdpr-title">
            Acest site folosește cookies pentru a îmbunătăți experiența de navigare. Prin
            continuarea navigării acceptați utilizarea cookie-urilor.
          </p>
          <div class="flex gap-2 flex-shrink-0">
            <button
              (click)="accept()"
              class="px-4 py-2 bg-primary text-white text-sm rounded hover:opacity-90 transition-opacity font-medium"
            >
              Accept
            </button>
            <button
              (click)="decline()"
              class="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:opacity-90 transition-opacity"
            >
              Refuz
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class GdprBannerComponent implements OnInit {
  visible = false;
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.visible = !localStorage.getItem('cp_gdpr_consent');
    }
  }

  accept() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('cp_gdpr_consent', 'accepted');
    }
    this.visible = false;
  }

  decline() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('cp_gdpr_consent', 'declined');
    }
    this.visible = false;
  }
}
