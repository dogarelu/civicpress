import { Component, inject, OnInit, Renderer2, PLATFORM_ID, computed } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { Meta } from '@angular/platform-browser';

import { TopBarComponent } from '../components/top-bar.component';
import { HeaderLogoComponent } from '../components/header-logo.component';
import { MainMenuComponent } from '../components/main-menu.component';
import { SiteFooterComponent } from '../components/site-footer.component';
import { GdprBannerComponent } from '../components/gdpr-banner.component';

import type { PublicSettings, MenuItem, LayoutPublic } from '@civicpress/shared';

type LayoutLoad = (
  args: PageServerLoad,
) => Promise<{ settings: PublicSettings; menu: MenuItem[]; layout: LayoutPublic }>;

@Component({
  selector: 'cp-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    TopBarComponent,
    HeaderLogoComponent,
    MainMenuComponent,
    SiteFooterComponent,
    GdprBannerComponent,
  ],
  template: `
    <cp-top-bar [settings]="settings()" />
    <cp-header-logo [settings]="settings()" />
    <cp-main-menu [menuItems]="menuItems()" />
    <main class="container mx-auto px-4 my-6">
      <div class="bg-white rounded-sm shadow-sm p-4 md:p-6">
        <router-outlet />
      </div>
    </main>
    <cp-site-footer [settings]="settings()" />
    <cp-gdpr-banner />
  `,
})
export default class LayoutComponent implements OnInit {
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private meta = inject(Meta);

  private load$ = injectLoad<LayoutLoad>();
  private load = toSignal(this.load$);

  settings = computed<PublicSettings | null>(() => this.load()?.settings ?? null);
  menuItems = computed<MenuItem[]>(() => this.load()?.menu ?? []);
  layout = computed<LayoutPublic | null>(() => this.load()?.layout ?? null);

  ngOnInit() {
    const s = this.settings();
    if (s) {
      this.applyBranding(s);
    }

    // Re-apply when settings arrive after hydration
    this.load$.subscribe((data) => {
      if (data?.settings) this.applyBranding(data.settings);
    });
  }

  private applyBranding(settings: PublicSettings) {
    const html = this.document.documentElement;
    this.renderer.setStyle(html, '--color-primary', settings.primaryColor);
    this.renderer.setStyle(html, '--color-secondary', settings.secondaryColor);
    this.renderer.setStyle(html, '--color-accent', settings.accentColor);
    this.renderer.setStyle(html, '--color-background', settings.backgroundColor);
    this.renderer.setStyle(html, '--color-text', settings.textColor);
    this.renderer.setStyle(html, '--font-heading', `'${settings.headingFont}', sans-serif`);
    this.renderer.setStyle(html, '--font-body', `'${settings.bodyFont}', sans-serif`);

    // Inject Google Fonts link in head (works on server via platform-server dom)
    if (!this.document.querySelector('#google-fonts')) {
      const fonts = [settings.headingFont, settings.bodyFont]
        .filter((f, i, a) => a.indexOf(f) === i)
        .map((f) => f.replace(/ /g, '+'))
        .join('&family=');
      const link = this.renderer.createElement('link') as HTMLLinkElement;
      link.id = 'google-fonts';
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fonts}:wght@300;400;500;600;700&display=swap`;
      const head = this.document.querySelector('head');
      if (head) this.renderer.appendChild(head, link);
    }
  }
}
