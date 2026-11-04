import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad, type PageServerLoad } from '@analogjs/router';
import { SeoService } from '../../services/seo.service';

type ContactLoad = (args: PageServerLoad) => Promise<{ contentHtml: string }>;

@Component({
  selector: 'cp-contact-page',
  standalone: true,
  template: `
    <main class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-secondary mb-6">Contact</h1>
      <div class="prose prose-sm max-w-none" [innerHTML]="contentHtml()"></div>
    </main>
  `,
})
export default class ContactPageComponent implements OnInit {
  private seo = inject(SeoService);
  private loadData = toSignal(injectLoad<ContactLoad>());

  ngOnInit() {
    this.seo.applyStatic({
      path: '/contact',
      title: 'Contact',
      description: 'Date de contact Civicpress — redactie și informații utile.',
    });
  }

  contentHtml = computed(
    () =>
      this.loadData()?.contentHtml ||
      '<p>Pagina de contact nu este configurată încă. Revino mai târziu.</p>',
  );
}
