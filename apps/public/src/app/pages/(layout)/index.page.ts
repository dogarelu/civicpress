import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';

import { ModuleLayoutComponent } from '../../components/modules/module-layout.component';
import { SeoService } from '../../services/seo.service';
import { SiteSettingsService } from '../../services/site-settings.service';
import type { HomeResponse } from '@civicpress/shared';

type IndexLoad = (args: PageServerLoad) => Promise<{ home: HomeResponse }>;

@Component({
  selector: 'cp-home-page',
  standalone: true,
  imports: [ModuleLayoutComponent],
  template: `
    <cp-module-layout
      [modules]="modules()"
      [sidebar]="sidebar()"
      [mobileOrder]="mobileOrder()"
      [mobileModules]="mobileModules()"
    />
  `,
})
export default class HomePageComponent implements OnInit {
  private seo = inject(SeoService);
  private siteSettings = inject(SiteSettingsService);
  private loadData = toSignal(injectLoad<IndexLoad>());

  constructor() {
    effect(() => {
      this.siteSettings.siteName();
      this.seo.applyHome();
    });
  }

  ngOnInit() {
    this.seo.applyHome();
  }

  modules = computed(() => this.loadData()?.home?.modules ?? []);
  sidebar = computed(() => this.loadData()?.home?.sidebar ?? null);
  mobileOrder = computed(() => this.loadData()?.home?.mobileOrder ?? []);
  mobileModules = computed(() => this.loadData()?.home?.mobileModules ?? []);
}
