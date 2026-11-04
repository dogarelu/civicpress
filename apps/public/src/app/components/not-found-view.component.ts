import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'cp-not-found-view',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="max-w-xl py-8">
      <p class="text-sm font-medium text-gray-500">404</p>
      <h1 class="mt-2 text-3xl font-heading font-bold text-secondary">{{ title() }}</h1>
      <p class="mt-3 text-gray-600">{{ message() }}</p>
      <a routerLink="/" class="mt-6 inline-block text-primary hover:underline">
        Înapoi la prima pagină
      </a>
    </div>
  `,
})
export class NotFoundViewComponent {
  title = input('Pagina nu a fost găsită');
  message = input('Pagina pe care o cauți nu există sau a fost mutată.');
}
