import { Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';

type PrivacyLoad = (args: PageServerLoad) => Promise<{ contentHtml: string }>;

@Component({
  selector: 'cp-privacy-page',
  standalone: true,
  template: `
    <main class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-secondary mb-6">Protecția datelor – GDPR</h1>
      <div class="prose prose-sm max-w-none" [innerHTML]="contentHtml()"></div>
    </main>
  `,
})
export default class PrivacyPageComponent {
  private loadData = toSignal(injectLoad<PrivacyLoad>());
  contentHtml = computed(
    () =>
      this.loadData()?.contentHtml ||
      '<p>Pagina de protecție a datelor nu este configurată încă. Revino mai târziu.</p>',
  );
}
