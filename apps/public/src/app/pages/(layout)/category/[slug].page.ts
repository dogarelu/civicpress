import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';

import CatListComponent from '../../../layout/templates/cat-list.component';
import CatVideoComponent from '../../../layout/templates/cat-video.component';
import { injectResponse } from '@analogjs/router/tokens';

import { NotFoundViewComponent } from '../../../components/not-found-view.component';
import { SeoService } from '../../../services/seo.service';
import { markNotFound } from '../../../utils/not-found';
import type { CategoryDetail } from '@civicpress/shared';

type CatLoad = (args: PageServerLoad) => Promise<{ category: CategoryDetail | null }>;

@Component({
  selector: 'cp-category-page',
  standalone: true,
  imports: [CatListComponent, CatVideoComponent, NotFoundViewComponent],
  template: `
    @if (notFound()) {
      <cp-not-found-view
        title="Categoria nu a fost găsită"
        message="Categoria pe care o cauți nu există sau a fost mutată."
      />
    } @else if (category()?.slug === 'video') {
      <cp-cat-video [data]="category()" />
    } @else {
      <cp-cat-list [data]="category()" />
    }
  `,
})
export default class CategoryPageComponent implements OnInit {
  private seo = inject(SeoService);
  private response = injectResponse();
  private loadData = toSignal(injectLoad<CatLoad>());
  category = computed(() => this.loadData()?.category ?? null);
  notFound = computed(() => this.loadData() != null && this.loadData()!.category == null);

  constructor() {
    effect(() => this.syncSeo());
  }

  ngOnInit() {
    this.syncSeo();
  }

  private syncSeo() {
    const data = this.loadData();
    if (!data) return;
    if (data.category) this.seo.applyCategory(data.category);
    else markNotFound(this.response, this.seo);
  }
}
