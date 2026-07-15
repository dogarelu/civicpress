import { Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';

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
export default class TermsPageComponent {
  private loadData = toSignal(injectLoad<TermsLoad>());
  contentHtml = computed(
    () =>
      this.loadData()?.contentHtml ||
      '<p>Pagina de termeni și condiții nu este configurată încă. Revino mai târziu.</p>',
  );
}
