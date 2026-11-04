import { Component, Input, signal } from '@angular/core';
import type {
  AnalyticsBreakdownRow,
  AnalyticsDailyPoint,
  AnalyticsUtmStat,
} from '@civicpress/shared';

const MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const CHART = { w: 720, h: 228, l: 40, r: 16, t: 18, b: 32 };

export function formatDuration(ms: number): string {
  const totalSec = Math.round((ms ?? 0) / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

export function fmtNum(n: number): string {
  return (n ?? 0).toLocaleString('ro-RO');
}

@Component({
  selector: 'cp-analytics-daily-chart',
  standalone: true,
  template: `
    @if (daily.length === 0) {
      <p class="text-sm text-gray-400 text-center py-10">Nicio dată.</p>
    } @else {
      <div class="relative">
        <svg
          [attr.viewBox]="'0 0 ' + w + ' ' + h"
          class="w-full h-56"
          (mouseleave)="hoverIdx.set(null)"
        >
          @for (g of gridLines(); track g.y) {
            <line
              [attr.x1]="l"
              [attr.x2]="w - r"
              [attr.y1]="g.y"
              [attr.y2]="g.y"
              stroke="#f3f4f6"
              stroke-width="1"
            />
            <text
              [attr.x]="l - 6"
              [attr.y]="g.y + 3"
              text-anchor="end"
              class="fill-gray-400"
              font-size="10"
            >
              {{ g.label }}
            </text>
          }
          @if (metric === 'traffic') {
            @for (p of daily; track p.date; let i = $index) {
              <rect
                [attr.x]="barX(i)"
                [attr.y]="valY(p.sessions)"
                [attr.width]="barWidth()"
                [attr.height]="valH(p.sessions)"
                rx="2"
                fill="#8A0808"
                [attr.opacity]="hoverIdx() === null || hoverIdx() === i ? 0.85 : 0.35"
              />
            }
            <polyline
              fill="none"
              stroke="#1d4ed8"
              stroke-width="2"
              stroke-linejoin="round"
              stroke-linecap="round"
              [attr.points]="uniqueLine()"
            />
          } @else {
            @for (p of daily; track p.date; let i = $index) {
              <rect
                [attr.x]="barX(i)"
                [attr.y]="valY(p.totalDurationMs)"
                [attr.width]="barWidth()"
                [attr.height]="valH(p.totalDurationMs)"
                rx="2"
                fill="#b45309"
                [attr.opacity]="hoverIdx() === null || hoverIdx() === i ? 0.85 : 0.35"
              />
            }
          }
          @for (p of daily; track p.date; let i = $index) {
            <rect
              [attr.x]="slotX(i)"
              [attr.y]="t"
              [attr.width]="slotWidth()"
              [attr.height]="h - t - b"
              fill="transparent"
              (mousemove)="hoverIdx.set(i)"
            />
          }
          @for (lbl of xLabels(); track lbl.date) {
            <text
              [attr.x]="lbl.x"
              [attr.y]="h - 10"
              text-anchor="middle"
              class="fill-gray-400"
              font-size="10"
            >
              {{ lbl.label }}
            </text>
          }
        </svg>
        @if (hoverIdx() !== null && daily[hoverIdx()!]; as hp) {
          <div
            class="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg"
          >
            <p class="font-medium mb-1">{{ longDate(hp.date) }}</p>
            <p>Vizitatori: {{ fmtNum(hp.sessions) }}</p>
            <p>Unici: {{ fmtNum(hp.uniqueVisitors) }}</p>
            <p>Vizualizări: {{ fmtNum(hp.pageViews) }}</p>
            <p>Timp: {{ formatDuration(hp.totalDurationMs) }}</p>
          </div>
        }
      </div>
    }
  `,
})
export class AnalyticsDailyChartComponent {
  @Input() daily: AnalyticsDailyPoint[] = [];
  @Input() metric: 'traffic' | 'duration' = 'traffic';

  hoverIdx = signal<number | null>(null);
  readonly w = CHART.w;
  readonly h = CHART.h;
  readonly l = CHART.l;
  readonly r = CHART.r;
  readonly t = CHART.t;
  readonly b = CHART.b;
  readonly fmtNum = fmtNum;
  readonly formatDuration = formatDuration;

  maxValue(): number {
    if (this.metric === 'duration') {
      return this.daily.reduce((m, d) => Math.max(m, d.totalDurationMs), 0);
    }
    return this.daily.reduce((m, d) => Math.max(m, d.sessions, d.uniqueVisitors), 0);
  }

  innerW() {
    return this.w - this.l - this.r;
  }

  innerH() {
    return this.h - this.t - this.b;
  }

  slotWidth() {
    return this.innerW() / Math.max(this.daily.length, 1);
  }

  slotX(i: number) {
    return this.l + i * this.slotWidth();
  }

  barWidth() {
    return Math.max(2, this.slotWidth() * 0.55);
  }

  barX(i: number) {
    return this.slotX(i) + (this.slotWidth() - this.barWidth()) / 2;
  }

  valH(value: number) {
    const max = this.maxValue();
    if (!max) return 0;
    return (value / max) * this.innerH();
  }

  valY(value: number) {
    return this.t + this.innerH() - this.valH(value);
  }

  uniqueLine(): string {
    const max = this.maxValue();
    return this.daily
      .map((p, i) => {
        const x = this.slotX(i) + this.slotWidth() / 2;
        return `${x},${this.valY(p.uniqueVisitors)}`;
      })
      .join(' ');
  }

  gridLines(): { y: number; label: string }[] {
    const max = this.maxValue();
    if (!max) return [];
    return [0, 0.5, 1].map((ratio) => ({
      y: this.t + this.innerH() * (1 - ratio),
      label:
        this.metric === 'duration' ? formatDuration(max * ratio) : fmtNum(Math.round(max * ratio)),
    }));
  }

  xLabels(): { date: string; x: number; label: string }[] {
    const n = this.daily.length;
    if (!n) return [];
    const step = n <= 10 ? 1 : Math.ceil(n / 7);
    return this.daily
      .map((p, i) => ({
        date: p.date,
        x: this.slotX(i) + this.slotWidth() / 2,
        label: this.shortDate(p.date),
        i,
      }))
      .filter((_, idx, arr) => idx % step === 0 || idx === arr.length - 1);
  }

  shortDate(ymd: string): string {
    const parts = ymd.split('-').map(Number);
    return `${parts[2]} ${MONTHS[(parts[1] ?? 1) - 1]}`;
  }

  longDate(ymd: string): string {
    const parts = ymd.split('-').map(Number);
    return `${parts[2]} ${MONTHS[(parts[1] ?? 1) - 1]} ${parts[0]}`;
  }
}

@Component({
  selector: 'cp-analytics-bars',
  standalone: true,
  template: `
    @if (rows.length === 0) {
      <p class="px-5 py-8 text-sm text-gray-400 text-center">{{ emptyText }}</p>
    } @else {
      <ul class="divide-y divide-gray-50">
        @for (row of rows; track row.key) {
          <li class="px-5 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ row.label }}</p>
                @if (row.detail) {
                  <p class="text-xs text-gray-400 mt-0.5 font-mono break-all">{{ row.detail }}</p>
                }
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-sm font-semibold tabular-nums text-gray-800">
                  {{ fmtNum(row.primary) }}
                  <span class="text-xs font-normal text-gray-400">{{ unitLabel }}</span>
                </p>
                <p class="text-xs text-gray-400 tabular-nums">
                  {{ fmtNum(row.uniqueVisitors) }} unici · {{ formatDuration(row.totalDurationMs) }}
                </p>
              </div>
            </div>
            <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                style="background-color: #8A0808"
                [style.width.%]="barShare(row.primary)"
              ></div>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class AnalyticsBarsComponent {
  @Input() rows: Array<{
    key: string;
    label: string;
    detail?: string | null;
    primary: number;
    uniqueVisitors: number;
    totalDurationMs: number;
  }> = [];
  @Input() unitLabel = 'viz.';
  @Input() emptyText = 'Nicio dată.';

  readonly fmtNum = fmtNum;
  readonly formatDuration = formatDuration;

  barShare(value: number): number {
    const max = this.rows.reduce((m, r) => Math.max(m, r.primary), 0);
    if (!max) return 0;
    return Math.round((value / max) * 100);
  }
}

export function categoryRows(rows: AnalyticsBreakdownRow[]) {
  return rows.map((r) => ({
    key: r.key,
    label: r.label,
    primary: r.pageViews,
    uniqueVisitors: r.uniqueVisitors,
    totalDurationMs: r.totalDurationMs,
  }));
}

export function utmRows(rows: AnalyticsUtmStat[]) {
  return rows.map((r) => ({
    key: r.key,
    label: r.label,
    detail: r.key !== 'no-utm' ? `utm=${r.utm}` : null,
    primary: r.sessions,
    uniqueVisitors: r.uniqueVisitors,
    totalDurationMs: r.totalDurationMs,
  }));
}
