import { Component, Input } from '@angular/core';
import { RecomandareHeroComponent } from '../recomandare-hero.component';
import { RecomandateSidebarComponent } from '../recomandare-sidebar.component';
import type { ResolvedModule } from '@civicpress/shared';

/** Module: one main article + three small ones beside it. */
@Component({
  selector: 'cp-module-hero-list',
  standalone: true,
  imports: [RecomandareHeroComponent, RecomandateSidebarComponent],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-stretch">
      <div class="md:col-span-2">
        <cp-recomandare-hero
          [post]="items[0]?.post ?? null"
          [showDate]="items[0]?.showDate ?? true"
          [showAuthor]="items[0]?.showAuthor ?? true"
          [showCategory]="showCategory"
          [showSummary]="showSummary"
        />
      </div>
      <div class="md:col-span-1 md:h-full">
        <cp-recomandare-sidebar
          class="block md:h-full"
          [items]="smallItems"
          [fillHeight]="true"
          [showCategory]="showCategory"
          [showSummary]="showSummary"
        />
      </div>
    </div>
  `,
})
export class ModuleHeroListComponent {
  @Input() items: ResolvedModule['posts'] = [];
  /** Show the primary category label on the small items. */
  @Input() showCategory = true;
  /** Show excerpt text (hero + small items). */
  @Input() showSummary = true;

  get smallItems(): ResolvedModule['posts'] {
    return this.items.slice(1, 4);
  }
}
