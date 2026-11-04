import { Component, OnInit, inject } from '@angular/core';
import { injectResponse } from '@analogjs/router/tokens';
import type { RouteMeta } from '@analogjs/router';

import { NotFoundViewComponent } from '../../components/not-found-view.component';
import { SeoService } from '../../services/seo.service';
import { markNotFound } from '../../utils/not-found';

export const routeMeta: RouteMeta = {
  title: 'Pagina nu a fost găsită | Civicpress',
  canActivate: [
    () => {
      const response = injectResponse();
      if (response && !response.headersSent) {
        response.statusCode = 404;
        response.setHeader('X-Robots-Tag', 'noindex, nofollow');
        response.setHeader('Cache-Control', 'no-store');
      }
      return true;
    },
  ],
};

@Component({
  selector: 'cp-page-not-found',
  standalone: true,
  imports: [NotFoundViewComponent],
  template: `<cp-not-found-view />`,
})
export default class PageNotFoundComponent implements OnInit {
  private seo = inject(SeoService);
  private response = injectResponse();

  ngOnInit() {
    markNotFound(this.response, this.seo);
  }
}
