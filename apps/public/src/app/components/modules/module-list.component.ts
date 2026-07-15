import { Component, Input, Output, EventEmitter } from '@angular/core';
import { HomeListItemComponent } from '../home-list-item.component';
import type { ModuleTypography, ResolvedModule } from '@civicpress/shared';

/** Module: vertical list of articles. */
@Component({
  selector: 'cp-module-list',
  standalone: true,
  imports: [HomeListItemComponent],
  template: `
    <div class="divide-y divide-border">
      @for (item of items; track item.post.id) {
        <cp-home-list-item
          class="block"
          [post]="item.post"
          [showDate]="item.showDate"
          [showAuthor]="item.showAuthor"
          [showCategory]="showCategory"
          [showSummary]="showSummary"
          [typography]="typography"
          imageSize="wide"
        />
      }
    </div>
    @if (hasMore) {
      <div class="pt-4 text-center">
        <button
          type="button"
          (click)="loadMore.emit()"
          [disabled]="loading"
          class="px-4 py-2 text-sm border border-border rounded-sm text-secondary hover:bg-muted transition-colors disabled:opacity-50"
        >
          {{ loading ? 'Se încarcă…' : 'Mai multe' }}
        </button>
      </div>
    }
  `,
})
export class ModuleListComponent {
  @Input() items: ResolvedModule['posts'] = [];
  @Input() hasMore = false;
  @Input() loading = false;
  @Input() typography: ModuleTypography | null = null;
  @Input() showCategory = true;
  @Input() showSummary = true;
  @Output() loadMore = new EventEmitter<void>();
}
