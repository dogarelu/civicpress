import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { SeoService } from '../../services/seo.service';

type TermsLoad = (args: PageServerLoad) => Promise<{ contentHtml: string }>;

@Component({
  selector: 'cp-terms-page',
  standalone: true,
  template: `
    <main class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-secondary mb-6">Termeni și condiții</h1>
      <div class="prose prose-sm max-w-none" [innerHTML]="contentHtml()"></div>
    </main>
  `,
})
export default class TermsPageComponent implements OnInit {
  private seo = inject(SeoService);
  private loadData = toSignal(injectLoad<TermsLoad>());

  ngOnInit() {
    this.seo.applyStatic({
      path: '/tc',
      title: 'Termeni și condiții',
      description: 'Termenii și condițiile de utilizare ale site-ului Civicpress.',
    });
  }

  contentHtml = computed(
    () =>
      this.loadData()?.contentHtml ||
      '<p>Pagina de termeni și condiții nu este configurată încă. Revino mai târziu.</p>',
  );
}
