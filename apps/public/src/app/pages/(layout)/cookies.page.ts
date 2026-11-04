import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { SeoService } from '../../services/seo.service';

type CookiePolicyLoad = (args: PageServerLoad) => Promise<{ contentHtml: string }>;

@Component({
  selector: 'cp-cookie-policy-page',
  standalone: true,
  template: `
    <main class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-secondary mb-6">Politica Cookie</h1>
      <div class="prose prose-sm max-w-none" [innerHTML]="contentHtml()"></div>
    </main>
  `,
})
export default class CookiePolicyPageComponent implements OnInit {
  private seo = inject(SeoService);
  private loadData = toSignal(injectLoad<CookiePolicyLoad>());

  ngOnInit() {
    this.seo.applyStatic({
      path: '/cookies',
      title: 'Politica Cookie',
      description: 'Politica de utilizare a cookie-urilor pe Civicpress.',
    });
  }

  contentHtml = computed(
    () =>
      this.loadData()?.contentHtml ||
      '<p>Pagina de politică cookie nu este configurată încă. Revino mai târziu.</p>',
  );
}
