import { Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';

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
export default class CookiePolicyPageComponent {
  private loadData = toSignal(injectLoad<CookiePolicyLoad>());
  contentHtml = computed(
    () =>
      this.loadData()?.contentHtml ||
      '<p>Pagina de politică cookie nu este configurată încă. Revino mai târziu.</p>',
  );
}
