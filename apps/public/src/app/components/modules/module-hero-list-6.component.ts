import { Component, Input } from '@angular/core';
import { RecomandareHeroComponent } from '../recomandare-hero.component';
import { RecomandateSidebarComponent } from '../recomandare-sidebar.component';
import type { PostDateFormat, ResolvedModule } from '@civicpress/shared';

/** Full-width module: one main article + two columns of 1–3 small ones. */
@Component({
  selector: 'cp-module-hero-list-6',
  standalone: true,
  imports: [RecomandareHeroComponent, RecomandateSidebarComponent],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-0 md:items-stretch">
      <div class="md:col-span-2 md:pr-4">
        <cp-recomandare-hero
          [post]="items[0]?.post ?? null"
          [showDate]="items[0]?.showDate ?? true"
          [showAuthor]="items[0]?.showAuthor ?? true"
          [showCategory]="showCategory"
          [showSummary]="showSummary"
          [showBumbi]="showBumbi"
          [dateFormat]="dateFormat"
          [showReadingTime]="showReadingTime"
        />
      </div>
      <div
        class="md:col-span-1 md:h-full pt-4 border-t border-gray-400 md:pt-0 md:border-t-0 md:px-4 md:border-l md:border-gray-400"
      >
        <cp-recomandare-sidebar
          class="block md:h-full"
          [items]="firstColumnItems"
          [fillHeight]="true"
          [showCategory]="showCategory"
          [showSummary]="showSummary"
          [showBumbi]="showBumbi"
          [dateFormat]="dateFormat"
          [showReadingTime]="showReadingTime"
        />
      </div>
      <div
        class="md:col-span-1 md:h-full pt-4 border-t border-gray-400 md:pt-0 md:border-t-0 md:pl-4 md:border-l md:border-gray-400"
      >
        <cp-recomandare-sidebar
          class="block md:h-full"
          [items]="secondColumnItems"
          [fillHeight]="true"
          [showCategory]="showCategory"
          [showSummary]="showSummary"
          [showBumbi]="showBumbi"
          [dateFormat]="dateFormat"
          [showReadingTime]="showReadingTime"
        />
      </div>
    </div>
  `,
})
export class ModuleHeroList6Component {
  @Input() items: ResolvedModule['posts'] = [];
  /** Small items per right-hand column (1–3). */
  @Input() sideCount = 3;
  /** Show the primary category label on the small items. */
  @Input() showCategory = true;
  /** Show excerpt text (hero + small items). */
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  private get perSide(): number {
    return Math.max(1, Math.min(3, this.sideCount || 3));
  }

  get firstColumnItems(): ResolvedModule['posts'] {
    const n = this.perSide;
    return this.items.slice(1, 1 + n);
  }

  get secondColumnItems(): ResolvedModule['posts'] {
    const n = this.perSide;
    return this.items.slice(1 + n, 1 + 2 * n);
  }
}
