import { Component, computed, Type } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { NgComponentOutlet } from '@angular/common';

import HomeMagazineComponent from '../../layout/templates/home-magazine.component';
import { resolveTemplate } from '../../layout/registry';
import type { HomeResponse, LayoutPublic } from '@civicpress/shared';

type IndexLoad = (args: PageServerLoad) => Promise<{ home: HomeResponse; layout: LayoutPublic }>;

const DEFAULT_TEMPLATES: Record<string, Type<unknown>> = {
  'home-magazine': HomeMagazineComponent,
};

@Component({
  selector: 'cp-home-page',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    <main class="container mx-auto px-4 py-6">
      <ng-container
        [ngComponentOutlet]="templateComponent()"
        [ngComponentOutletInputs]="{ data: home(), options: templateOptions() }"
      />
    </main>
  `,
})
export default class HomePageComponent {
  private loadData = toSignal(injectLoad<IndexLoad>());
  home = computed(() => this.loadData()?.home ?? null);

  private resolvedTemplate = computed(() => {
    const id = this.loadData()?.layout?.homeTemplateId;
    return resolveTemplate('home', id);
  });

  templateOptions = computed(() => this.resolvedTemplate().defaultOptions);
  templateComponent = computed<Type<unknown>>(
    () => DEFAULT_TEMPLATES[this.resolvedTemplate().id] ?? HomeMagazineComponent,
  );
}
