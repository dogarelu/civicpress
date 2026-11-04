import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  RendererStyleFlags2,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { Meta } from '@angular/platform-browser';

import { HeaderLogoComponent } from '../components/header-logo.component';
import { SiteFooterComponent } from '../components/site-footer.component';
import { GdprBannerComponent } from '../components/gdpr-banner.component';
import { BackToTopComponent } from '../components/back-to-top.component';
import { VideoOverlayComponent } from '../components/video-overlay.component';
import { SiteSettingsService } from '../services/site-settings.service';
import { AnalyticsService } from '../services/analytics.service';
import { ScrollRestoreService } from '../services/scroll-restore.service';

import type { PublicSettings, MenuItem, PublicTickerBarsResponse } from '@civicpress/shared';

type LayoutLoad = (args: PageServerLoad) => Promise<{
  settings: PublicSettings;
  menu: MenuItem[];
  mobileMenu: MenuItem[];
  mobileRow: MenuItem[];
  tickerBars: PublicTickerBarsResponse;
}>;

@Component({
  selector: 'cp-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderLogoComponent,
    SiteFooterComponent,
    GdprBannerComponent,
    BackToTopComponent,
    VideoOverlayComponent,
  ],
  template: `
    <div #stickyHeader class="sticky top-0 z-50 bg-white shadow-sm md:shadow-md">
      <cp-header-logo
        [settings]="settings()"
        [menuItems]="menuItems()"
        [mobileMenuItems]="mobileMenuItems()"
        [mobileRowItems]="mobileRowItems()"
        [tickerBars]="tickerBars()"
      />
    </div>
    <main class="container page-container mx-auto md:px-4 md:my-6">
      <div class="bg-background md:rounded-sm md:shadow-sm p-4 md:p-6">
        <router-outlet />
      </div>
    </main>
    <cp-site-footer [settings]="settings()" />
    <cp-back-to-top />
    <cp-video-overlay />
    @if (!isPreview()) {
      <cp-gdpr-banner />
    }
  `,
})
export default class LayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private meta = inject(Meta);
  private router = inject(Router);
  private siteSettings = inject(SiteSettingsService);
  private analytics = inject(AnalyticsService);
  private scrollRestore = inject(ScrollRestoreService);

  isPreview = computed(() => this.router.url.startsWith('/preview'));

  @ViewChild('stickyHeader') stickyHeader?: ElementRef<HTMLElement>;
  private headerResizeObserver?: ResizeObserver;

  private load$ = injectLoad<LayoutLoad>();
  private load = toSignal(this.load$);

  settings = computed<PublicSettings | null>(() => this.load()?.settings ?? null);
  menuItems = computed<MenuItem[]>(() => this.load()?.menu ?? []);
  mobileMenuItems = computed<MenuItem[]>(() => this.load()?.mobileMenu ?? []);
  mobileRowItems = computed<MenuItem[]>(() => this.load()?.mobileRow ?? []);
  tickerBars = computed(() => this.load()?.tickerBars?.bars ?? []);

  constructor() {
    const s = this.settings();
    if (s) this.siteSettings.setFromSettings(s);
  }

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

    if (isPlatformBrowser(this.platformId)) {
      this.scrollRestore.start();
      if (!this.router.url.startsWith('/preview')) {
        this.analytics.start();
      }
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof ResizeObserver === 'undefined') return;
    const el = this.stickyHeader?.nativeElement;
    if (!el) return;
    this.headerResizeObserver = new ResizeObserver(() => this.syncStickyHeaderHeight());
    this.headerResizeObserver.observe(el);
    this.syncStickyHeaderHeight();
  }

  ngOnDestroy(): void {
    this.headerResizeObserver?.disconnect();
    this.analytics.stop();
  }

  private syncStickyHeaderHeight(): void {
    const el = this.stickyHeader?.nativeElement;
    if (!el) return;
    const height = Math.round(el.getBoundingClientRect().height);
    // DashCase required: CSS custom properties only apply via setProperty.
    this.renderer.setStyle(
      this.document.documentElement,
      '--cp-sticky-header-height',
      `${height}px`,
      RendererStyleFlags2.DashCase,
    );
  }

  private applyBranding(settings: PublicSettings) {
    const html = this.document.documentElement;
    const cssVar = RendererStyleFlags2.DashCase;
    this.renderer.setStyle(html, '--color-primary', settings.primaryColor, cssVar);
    this.renderer.setStyle(html, '--color-secondary', settings.secondaryColor, cssVar);
    this.renderer.setStyle(html, '--color-accent', settings.accentColor, cssVar);
    this.renderer.setStyle(
      html,
      '--ticker-bg',
      settings.tickerBgColor || settings.primaryColor,
      cssVar,
    );
    this.renderer.setStyle(html, '--ticker-text', settings.tickerTextColor || '#ffffff', cssVar);
    this.renderer.setStyle(
      html,
      '--ticker-weight',
      String(settings.tickerFontWeight || 600),
      cssVar,
    );
    this.renderer.setStyle(html, '--color-background', settings.backgroundColor, cssVar);
    this.renderer.setStyle(html, '--color-text', settings.textColor, cssVar);
    this.renderer.setStyle(html, '--font-heading', `'${settings.headingFont}', sans-serif`, cssVar);
    this.renderer.setStyle(html, '--font-body', `'${settings.bodyFont}', sans-serif`, cssVar);
    this.renderer.setStyle(
      html,
      '--news-summary-line-clamp',
      `${settings.defaultSummaryRows}`,
      cssVar,
    );
    this.renderer.setStyle(html, '--pill-font-size', `${settings.pillFontSize}px`, cssVar);
    this.renderer.setStyle(
      html,
      '--pill-bg-opacity',
      `${Math.max(0, Math.min(1, 1 - settings.pillTransparency / 100))}`,
      cssVar,
    );
    this.renderer.setAttribute(html, 'data-pill-corner', settings.pillCorner);
    this.applyFavicon();

    // Inject Google Fonts link in head (works on server via platform-server dom)
    if (!this.document.querySelector('#google-fonts')) {
      const weights = 'wght@300;400;500;600;700;800;900';
      const fonts = [settings.headingFont, settings.bodyFont]
        .filter((f, i, a) => a.indexOf(f) === i)
        .map((f) => `${f.replace(/ /g, '+')}:${weights}`)
        .join('&family=');
      const link = this.renderer.createElement('link') as HTMLLinkElement;
      link.id = 'google-fonts';
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fonts}&display=swap`;
      const head = this.document.querySelector('head');
      if (head) this.renderer.appendChild(head, link);
    }
  }

  private applyFavicon(): void {
    const head = this.document.head;
    if (!head) return;

    for (const el of Array.from(
      this.document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]'),
    )) {
      this.renderer.removeChild(el.parentNode, el);
    }

    const version = '20260910';
    const link = this.renderer.createElement('link') as HTMLLinkElement;
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = `/favicon.ico?v=${version}`;
    this.renderer.appendChild(head, link);

    if (!this.document.querySelector('link[rel="apple-touch-icon"]')) {
      const apple = this.renderer.createElement('link') as HTMLLinkElement;
      apple.rel = 'apple-touch-icon';
      apple.href = `/apple-touch-icon.png?v=${version}`;
      this.renderer.appendChild(head, apple);
    }
  }
}
