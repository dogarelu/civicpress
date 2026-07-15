import { Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';

import { ModuleLayoutComponent } from '../../components/modules/module-layout.component';
import type { HomeResponse } from '@civicpress/shared';

type IndexLoad = (args: PageServerLoad) => Promise<{ home: HomeResponse }>;

@Component({
  selector: 'cp-home-page',
  standalone: true,
  imports: [ModuleLayoutComponent],
  template: `
    <cp-module-layout [modules]="modules()" [sidebar]="sidebar()" [mobileOrder]="mobileOrder()" />
  `,
})
export default class HomePageComponent {
  private loadData = toSignal(injectLoad<IndexLoad>());

  modules = computed(() => this.loadData()?.home?.modules ?? []);
  sidebar = computed(() => this.loadData()?.home?.sidebar ?? null);
  mobileOrder = computed(() => this.loadData()?.home?.mobileOrder ?? []);
}
