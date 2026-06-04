import { Component, computed, Type } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgComponentOutlet } from '@angular/common';

import CatListComponent from '../../../layout/templates/cat-list.component';
import { resolveTemplate } from '../../../layout/registry';
import type { CategoryDetail, LayoutPublic } from '@civicpress/shared';

type CatLoad = (
  args: PageServerLoad,
) => Promise<{ category: CategoryDetail; layout: LayoutPublic }>;

const DEFAULT_TEMPLATES: Record<string, Type<unknown>> = {
  'cat-list': CatListComponent,
};

@Component({
  selector: 'cp-category-page',
  standalone: true,
  imports: [RouterModule, NgComponentOutlet],
  template: `
    <main class="container mx-auto px-4 py-6">
      <ng-container
        [ngComponentOutlet]="templateComponent()"
        [ngComponentOutletInputs]="{ data: category(), options: templateOptions() }"
      />
    </main>
  `,
})
export default class CategoryPageComponent {
  private loadData = toSignal(injectLoad<CatLoad>());
  category = computed(() => this.loadData()?.category ?? null);

  private resolvedTemplate = computed(() => {
    const id = this.loadData()?.layout?.categoryTemplateId;
    return resolveTemplate('category', id);
  });

  templateOptions = computed(() => this.resolvedTemplate().defaultOptions);
  templateComponent = computed<Type<unknown>>(
    () => DEFAULT_TEMPLATES[this.resolvedTemplate().id] ?? CatListComponent,
  );
}
