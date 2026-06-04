import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { MenuItem } from '@civicpress/shared';

@Component({
  selector: 'cp-main-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="bg-primary text-white shadow-md">
      <div class="container mx-auto px-4 flex items-center">
        <ul class="flex flex-wrap items-center gap-0 overflow-x-auto flex-1">
          <li>
            <a
              routerLink="/"
              routerLinkActive="bg-black/20"
              [routerLinkActiveOptions]="{ exact: true }"
              class="block px-4 py-3 text-sm font-bold uppercase tracking-wide hover:bg-black/20 transition-colors whitespace-nowrap border-b-[3px] border-transparent"
              >Acasă</a
            >
          </li>
          @for (item of menuItems; track item.id) {
            <li>
              <a
                [routerLink]="['/category', item.slug]"
                routerLinkActive="bg-black/20"
                class="block px-4 py-3 text-sm font-medium uppercase tracking-wide hover:bg-black/20 transition-colors whitespace-nowrap"
                [style.border-bottom]="'3px solid ' + (item.color ?? 'transparent')"
              >
                {{ item.name }}
              </a>
            </li>
          }
        </ul>
        <button
          type="button"
          aria-label="Caută"
          class="ml-2 flex-shrink-0 p-2.5 hover:bg-black/20 transition-colors rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path
              d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"
            />
          </svg>
        </button>
      </div>
    </nav>
  `,
})
export class MainMenuComponent {
  @Input() menuItems: MenuItem[] = [];
}
