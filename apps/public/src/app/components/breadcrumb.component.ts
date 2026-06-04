import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

@Component({
  selector: 'cp-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="text-xs text-gray-500 mb-4" aria-label="Breadcrumb">
      <ol class="flex items-center gap-1 flex-wrap">
        <li>
          <a routerLink="/" class="hover:text-primary transition-colors">Acasă</a>
        </li>
        @for (item of items; track item.label; let last = $last) {
          <li class="flex items-center gap-1">
            <span>/</span>
            @if (item.href && !last) {
              <a [routerLink]="item.href" class="hover:text-primary transition-colors">{{
                item.label
              }}</a>
            } @else {
              <span [class.text-secondary]="last" [class.font-medium]="last">{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
