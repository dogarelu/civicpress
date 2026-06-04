import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PublicSettings } from '@civicpress/shared';

@Component({
  selector: 'cp-header-logo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bg-white py-3 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div class="container mx-auto px-4 flex justify-center">
        <a routerLink="/" class="block">
          @if (settings?.logoUrl) {
            <img
              [src]="settings!.logoUrl!"
              [alt]="settings?.siteName ?? 'Civicpress'"
              class="h-16 w-auto object-contain"
              loading="eager"
            />
          } @else {
            <span class="text-3xl font-bold tracking-tight" style="color: var(--color-primary)">{{
              settings?.siteName ?? 'Civicpress'
            }}</span>
          }
        </a>
      </div>
    </div>
  `,
})
export class HeaderLogoComponent {
  @Input() settings: PublicSettings | null = null;
}
