import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { injectResponse } from '@analogjs/router/tokens';

import { ArticlePageViewComponent } from '../../components/article-page-view.component';
import { NotFoundViewComponent } from '../../components/not-found-view.component';
import { SeoService } from '../../services/seo.service';
import { markNotFound } from '../../utils/not-found';
import type { PostDetail } from '@civicpress/shared';

type SlugLoad = (args: PageServerLoad) => Promise<{ post: PostDetail | null }>;

@Component({
  selector: 'cp-article-page',
  standalone: true,
  imports: [ArticlePageViewComponent, NotFoundViewComponent],
  template: `
    @if (post(); as p) {
      <cp-article-page-view [post]="p" />
    } @else if (notFound()) {
      <cp-not-found-view
        title="Articolul nu a fost găsit"
        message="Articolul pe care îl cauți nu există sau a fost mutat."
      />
    }
  `,
})
export default class ArticlePageComponent implements OnInit {
  private seo = inject(SeoService);
  private response = injectResponse();
  private load = toSignal(injectLoad<SlugLoad>());
  post = computed(() => this.load()?.post ?? null);
  notFound = computed(() => this.load() != null && this.load()!.post == null);

  constructor() {
    effect(() => this.syncSeo());
  }

  ngOnInit() {
    this.syncSeo();
  }

  private syncSeo() {
    const data = this.load();
    if (!data) return;
    if (data.post) this.seo.applyArticle(data.post);
    else markNotFound(this.response, this.seo);
  }
}
