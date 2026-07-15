import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PublicSettings } from '@civicpress/shared';

@Component({
  selector: 'cp-site-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="bg-[#2f2f2f] text-white mt-8">
      <div class="container page-container mx-auto px-3 md:px-4 py-5 md:py-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <a routerLink="/contact" class="text-white/70 hover:text-white transition-colors">
              Contact
            </a>
            <a routerLink="/tc" class="text-white/70 hover:text-white transition-colors">
              Termeni și condiții
            </a>
            <a routerLink="/pp" class="text-white/70 hover:text-white transition-colors">
              Protecția datelor
            </a>
            <a routerLink="/cookies" class="text-white/70 hover:text-white transition-colors">
              Politica Cookie
            </a>
          </nav>
          <p class="text-sm text-white/70 shrink-0 sm:text-right">
            &copy; {{ year }} {{ settings?.siteName ?? 'Civicpress' }}. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {
  @Input() settings: PublicSettings | null = null;
  year = new Date().getFullYear();
}
