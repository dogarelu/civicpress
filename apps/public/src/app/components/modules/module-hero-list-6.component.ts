import { Component, Input } from '@angular/core';
import { RecomandareHeroComponent } from '../recomandare-hero.component';
import { RecomandateSidebarComponent } from '../recomandare-sidebar.component';
import type { ResolvedModule } from '@civicpress/shared';

/** Full-width module: one main article + two columns of three small ones. */
@Component({
  selector: 'cp-module-hero-list-6',
  standalone: true,
  imports: [RecomandareHeroComponent, RecomandateSidebarComponent],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 md:items-stretch">
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
          [items]="firstColumnItems"
          [fillHeight]="true"
          [showCategory]="showCategory"
          [showSummary]="showSummary"
        />
      </div>
      <div class="md:col-span-1 md:h-full">
        <cp-recomandare-sidebar
          class="block md:h-full"
          [items]="secondColumnItems"
          [fillHeight]="true"
          [showCategory]="showCategory"
          [showSummary]="showSummary"
        />
      </div>
    </div>
  `,
})
export class ModuleHeroList6Component {
  @Input() items: ResolvedModule['posts'] = [];
  /** Show the primary category label on the small items. */
  @Input() showCategory = true;
  /** Show excerpt text (hero + small items). */
  @Input() showSummary = true;

  get firstColumnItems(): ResolvedModule['posts'] {
    return this.items.slice(1, 4);
  }

  get secondColumnItems(): ResolvedModule['posts'] {
    return this.items.slice(4, 7);
  }
}
