import { Component, Input } from '@angular/core';
import { RecomandareHeroComponent } from '../recomandare-hero.component';
import { RecomandateSidebarComponent } from '../recomandare-sidebar.component';
import type { PostDateFormat, ResolvedModule } from '@civicpress/shared';

/**
 * Main-column module: one featured article (same design as hero-list /
 * „1 principal + 3 mici”) plus a side list that scrolls for the full
 * module height — not just the image frame.
 */
@Component({
  selector: 'cp-module-article-list',
  standalone: true,
  imports: [RecomandareHeroComponent, RecomandateSidebarComponent],
  template: `
    @if (items[0]; as featured) {
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:items-stretch">
        <div class="md:col-span-2 md:pr-4">
          <cp-recomandare-hero
            [post]="featured.post"
            [showDate]="featured.showDate ?? true"
            [showAuthor]="featured.showAuthor ?? true"
            [showCategory]="showCategory"
            [showSummary]="showSummary"
            [showBumbi]="showBumbi"
            [dateFormat]="dateFormat"
            [showReadingTime]="showReadingTime"
          />
        </div>
        @if (sideItems.length > 0) {
          <div
            class="relative md:col-span-1 md:min-h-0 pt-4 border-t border-gray-400 md:pt-0 md:border-t-0 md:border-l md:border-gray-400"
          >
            <div class="md:absolute md:inset-0 md:overflow-y-auto md:pl-4">
              <cp-recomandare-sidebar
                class="block"
                [items]="sideItems"
                [showCategory]="showCategory"
                [showSummary]="showSummary"
                [showBumbi]="showBumbi"
                [dateFormat]="dateFormat"
                [showReadingTime]="showReadingTime"
              />
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ModuleArticleListComponent {
  @Input() items: ResolvedModule['posts'] = [];
  @Input() showCategory = true;
  @Input() showSummary = true;
  @Input() showBumbi: boolean | null = null;
  @Input() dateFormat: PostDateFormat | null = null;
  @Input() showReadingTime = false;

  get sideItems(): ResolvedModule['posts'] {
    return this.items.slice(1, 11);
  }
}
