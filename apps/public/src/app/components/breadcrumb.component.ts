import { Component, Input } from '@angular/core';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

@Component({
  selector: 'cp-breadcrumb',
  standalone: true,
  template: ``,
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
