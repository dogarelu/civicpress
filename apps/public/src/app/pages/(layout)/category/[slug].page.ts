import { Component, computed } from '@angular/core';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';

import CatListComponent from '../../../layout/templates/cat-list.component';
import CatVideoComponent from '../../../layout/templates/cat-video.component';
import type { CategoryDetail } from '@civicpress/shared';

type CatLoad = (args: PageServerLoad) => Promise<{ category: CategoryDetail }>;

@Component({
  selector: 'cp-category-page',
  standalone: true,
  imports: [CatListComponent, CatVideoComponent],
  template: `
    @if (category()?.slug === 'video') {
      <cp-cat-video [data]="category()" />
    } @else {
      <cp-cat-list [data]="category()" />
    }
  `,
})
export default class CategoryPageComponent {
  private loadData = toSignal(injectLoad<CatLoad>());
  category = computed(() => this.loadData()?.category ?? null);
}
