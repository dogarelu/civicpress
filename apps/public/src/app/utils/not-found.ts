import type { ServerResponse } from '@analogjs/router/tokens';
import type { SeoService } from '../services/seo.service';

export function markNotFound(response: ServerResponse | null, seo: SeoService): void {
  if (response && !response.headersSent) {
    response.statusCode = 404;
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('Cache-Control', 'no-store');
  }
  seo.applyNotFound();
}
