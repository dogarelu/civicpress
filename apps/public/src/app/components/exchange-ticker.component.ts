import { Component, Input } from '@angular/core';
import type { ExchangeRate } from '@civicpress/shared';

@Component({
  selector: 'cp-exchange-ticker',
  standalone: true,
  imports: [],
  template: `
    @if (rates.length) {
      <div
        class="exchange-ticker text-white text-xs overflow-hidden"
        [class.exchange-ticker--embedded]="embedded"
        aria-label="Curs valutar BNR"
      >
        <div class="exchange-ticker-track">
          @for (item of loopItems; track $index) {
            <span class="exchange-ticker-item">
              <span class="font-semibold">{{ item.currency }}</span>
              @if (item.multiplier > 1) {
                <span class="opacity-90">{{ item.multiplier }} {{ item.currency }} =</span>
              } @else {
                <span class="opacity-90">1 {{ item.currency }} =</span>
              }
              <span class="tabular-nums font-bold">{{ formatRate(item.rate) }} RON</span>
            </span>
          }
        </div>
      </div>
    }
  `,
})
export class ExchangeTickerComponent {
  @Input() rates: ExchangeRate[] = [];
  @Input() embedded = false;

  /** Duplicate items for seamless infinite scroll. */
  get loopItems(): ExchangeRate[] {
    if (!this.rates.length) return [];
    return [...this.rates, ...this.rates];
  }

  formatRate(rate: number): string {
    return rate.toLocaleString('ro-RO', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
}
