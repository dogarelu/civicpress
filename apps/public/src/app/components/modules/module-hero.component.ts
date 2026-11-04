import { Component, Input } from '@angular/core';
import { RecomandareHeroComponent } from '../recomandare-hero.component';
import type { PostDateFormat, ResolvedModule } from '@civicpress/shared';

/** Module: one main article. */
@Component({
  selector: 'cp-module-hero',
  standalone: true,
  imports: [RecomandareHeroComponent],
  template: `
    <cp-recomandare-hero
      [post]="item?.post ?? null"
      [showDate]="item?.showDate ?? true"
      [showAuthor]="item?.showAuthor ?? true"
      [showCategory]="showCategory"
      [showSummary]="showSummary"
      [showBumbi]="showBumbi"
      [dateFormat]="dateFormat"
      [showReadingTime]="showReadingTime"
    />
  `,
})
export class ModuleHeroComponent {
  @Input() item: ResolvedModule['posts'][number] | null = null;
  /** Show the primary category label above the title. */
  @Input() showCategory = true;
  /** Show the excerpt text under the image. */
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;
}
