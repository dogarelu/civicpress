import { Component, inject, OnInit, Renderer2, PLATFORM_ID, computed } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { Meta } from '@angular/platform-browser';

import { HeaderLogoComponent } from '../components/header-logo.component';
import { SiteFooterComponent } from '../components/site-footer.component';
import { GdprBannerComponent } from '../components/gdpr-banner.component';
import { BackToTopComponent } from '../components/back-to-top.component';
import { SiteSettingsService } from '../services/site-settings.service';

import type { PublicSettings, MenuItem, ExchangeRatesResponse } from '@civicpress/shared';

type LayoutLoad = (
  args: PageServerLoad,
) => Promise<{ settings: PublicSettings; menu: MenuItem[]; exchangeRates: ExchangeRatesResponse }>;

@Component({
  selector: 'cp-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderLogoComponent,
    SiteFooterComponent,
    GdprBannerComponent,
    BackToTopComponent,
  ],
  template: `
    <div class="md:sticky md:top-0 md:z-50 md:shadow-md">
      <cp-header-logo
        [settings]="settings()"
        [menuItems]="menuItems()"
        [exchangeRates]="exchangeRates()?.rates ?? []"
      />
    </div>
    <main class="container page-container mx-auto px-3 md:px-4 my-3 md:my-6">
      <div class="bg-white rounded-sm shadow-sm p-4 md:p-6">
        <router-outlet />
      </div>
    </main>
    <cp-site-footer [settings]="settings()" />
    <cp-back-to-top />
    <cp-gdpr-banner />
  `,
})
export default class LayoutComponent implements OnInit {
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private meta = inject(Meta);
  private siteSettings = inject(SiteSettingsService);

  private load$ = injectLoad<LayoutLoad>();
  private load = toSignal(this.load$);

  settings = computed<PublicSettings | null>(() => this.load()?.settings ?? null);
  menuItems = computed<MenuItem[]>(() => this.load()?.menu ?? []);
  exchangeRates = computed<ExchangeRatesResponse | null>(() => this.load()?.exchangeRates ?? null);

  ngOnInit() {
    const s = this.settings();
    if (s) {
      this.siteSettings.setFromSettings(s);
      this.applyBranding(s);
    }

    // Re-apply when settings arrive after hydration
    this.load$.subscribe((data) => {
      if (data?.settings) {
        this.siteSettings.setFromSettings(data.settings);
        this.applyBranding(data.settings);
      }
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
    this.renderer.setStyle(html, '--news-title-font-size', `${settings.newsTitleFontSize}px`);
    this.renderer.setStyle(html, '--news-title-font-weight', `${settings.newsTitleFontWeight}`);
    this.renderer.setStyle(html, '--news-summary-font-size', `${settings.newsSummaryFontSize}px`);
    this.renderer.setStyle(html, '--news-summary-font-weight', `${settings.newsSummaryFontWeight}`);
    this.renderer.setStyle(html, '--news-summary-line-clamp', `${settings.defaultSummaryRows}`);
    this.renderer.setStyle(html, '--hero-title-font-size', `${settings.heroTitleFontSize}px`);
    this.renderer.setStyle(html, '--hero-title-font-weight', `${settings.heroTitleFontWeight}`);
    this.renderer.setStyle(html, '--sidebar-title-font-size', `${settings.sidebarTitleFontSize}px`);
    this.renderer.setStyle(
      html,
      '--sidebar-title-font-weight',
      `${settings.sidebarTitleFontWeight}`,
    );
    this.renderer.setStyle(html, '--article-title-font-size', `${settings.articleTitleFontSize}px`);
    this.renderer.setStyle(
      html,
      '--article-title-font-weight',
      `${settings.articleTitleFontWeight}`,
    );
    this.renderer.setStyle(
      html,
      '--article-content-font-size',
      `${settings.articleContentFontSize}px`,
    );
    this.renderer.setStyle(
      html,
      '--article-content-font-weight',
      `${settings.articleContentFontWeight}`,
    );

    // Inject Google Fonts link in head (works on server via platform-server dom)
    if (!this.document.querySelector('#google-fonts')) {
      const fonts = [settings.headingFont, settings.bodyFont]
        .filter((f, i, a) => a.indexOf(f) === i)
        .map((f) => f.replace(/ /g, '+'))
        .join('&family=');
      const link = this.renderer.createElement('link') as HTMLLinkElement;
      link.id = 'google-fonts';
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fonts}:wght@300;400;500;600;700;800&display=swap`;
      const head = this.document.querySelector('head');
      if (head) this.renderer.appendChild(head, link);
    }
  }
}
