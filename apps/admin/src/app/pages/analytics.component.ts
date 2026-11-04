import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';
import type { AdminPostSummary, AnalyticsOverview, AnalyticsPageStat } from '@civicpress/shared';
import {
  AnalyticsBarsComponent,
  AnalyticsDailyChartComponent,
  categoryRows,
  fmtNum,
  formatDuration,
  utmRows,
} from './analytics-widgets.component';

type RangePreset = '7d' | '30d' | '90d' | 'custom';
type ChartMetric = 'traffic' | 'duration';

const PAGE_TYPE_LABELS: Record<string, string> = {
  home: 'Acasă',
  article: 'Articol',
  video: 'Video',
  search: 'Căutare',
  contact: 'Contact',
  category: 'Categorie',
  other: 'Altele',
};

interface ArticleOption {
  postId: string;
  title: string;
  path: string;
  sessions: number;
  uniqueVisitors: number;
  pageViews: number;
}

@Component({
  selector: 'cp-analytics',
  standalone: true,
  imports: [FormsModule, AnalyticsDailyChartComponent, AnalyticsBarsComponent],
  template: `
    <div class="p-6 max-w-[1400px]">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Analiză trafic</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Vizitatori, unici, timp petrecut, categorii și surse UTM — pe tot site-ul și pe articol.
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-2">
          <select
            [(ngModel)]="rangePreset"
            (ngModelChange)="onPresetChange()"
            class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="7d">Ultimele 7 zile</option>
            <option value="30d">Ultimele 30 zile</option>
            <option value="90d">Ultimele 90 zile</option>
            <option value="custom">Interval personalizat</option>
          </select>
          @if (rangePreset === 'custom') {
            <label class="text-xs text-gray-500">
              De la
              <input
                type="date"
                [(ngModel)]="fromDate"
                class="ml-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <label class="text-xs text-gray-500">
              Până la
              <input
                type="date"
                [(ngModel)]="toDate"
                class="ml-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <button
              type="button"
              (click)="load()"
              class="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
              style="background-color: #8A0808"
            >
              Aplică
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <p class="text-center py-16 text-gray-400">Se încarcă...</p>
      } @else {
        @if (site(); as s) {
          <section class="mb-10">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Trafic pe site</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
              <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p class="text-xs text-gray-500 mb-1">Sesiuni</p>
                <p class="text-2xl font-bold text-gray-800">{{ fmtNum(s.totalSessions) }}</p>
                <p class="text-[11px] text-gray-400 mt-0.5">vizite (30 min)</p>
              </div>
              <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p class="text-xs text-gray-500 mb-1">Vizitatori unici</p>
                <p class="text-2xl font-bold text-gray-800">{{ fmtNum(s.uniqueVisitors) }}</p>
                <p class="text-[11px] text-gray-400 mt-0.5">
                  {{ fmtNum(s.newVisitors) }} noi · {{ fmtNum(s.returningVisitors) }} reveniți
                </p>
              </div>
              <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p class="text-xs text-gray-500 mb-1">Vizualizări</p>
                <p class="text-2xl font-bold text-gray-800">{{ fmtNum(s.totalPageViews) }}</p>
                <p class="text-[11px] text-gray-400 mt-0.5">pagini</p>
              </div>
              <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p class="text-xs text-gray-500 mb-1">Timp total</p>
                <p class="text-2xl font-bold text-gray-800">
                  {{ formatDuration(s.totalDurationMs) }}
                </p>
                <p class="text-[11px] text-gray-400 mt-0.5">activ</p>
              </div>
              <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p class="text-xs text-gray-500 mb-1">Timp / vizită</p>
                <p class="text-2xl font-bold text-gray-800">
                  {{ formatDuration(s.avgSessionDurationMs) }}
                </p>
              </div>
              <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p class="text-xs text-gray-500 mb-1">Timp / pagină</p>
                <p class="text-2xl font-bold text-gray-800">
                  {{ formatDuration(s.avgDurationMs) }}
                </p>
              </div>
              <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p class="text-xs text-gray-500 mb-1">Pagini / sesiune</p>
                <p class="text-2xl font-bold text-gray-800">{{ fmtDec(s.pagesPerSession) }}</p>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 class="font-semibold text-gray-800">Evoluție pe zile</h3>
                <div class="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
                  <button
                    type="button"
                    (click)="siteChart = 'traffic'"
                    class="px-3 py-1 text-xs font-medium rounded-md"
                    [class.bg-white]="siteChart === 'traffic'"
                    [class.shadow-sm]="siteChart === 'traffic'"
                    [class.text-gray-800]="siteChart === 'traffic'"
                    [class.text-gray-500]="siteChart !== 'traffic'"
                  >
                    Vizitatori
                  </button>
                  <button
                    type="button"
                    (click)="siteChart = 'duration'"
                    class="px-3 py-1 text-xs font-medium rounded-md"
                    [class.bg-white]="siteChart === 'duration'"
                    [class.shadow-sm]="siteChart === 'duration'"
                    [class.text-gray-800]="siteChart === 'duration'"
                    [class.text-gray-500]="siteChart !== 'duration'"
                  >
                    Timp
                  </button>
                </div>
              </div>
              @if (siteChart === 'traffic') {
                <div class="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                  <span class="inline-flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-sm" style="background:#8A0808"></span>
                    Vizitatori (sesiuni)
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-sm" style="background:#1d4ed8"></span>
                    Unici
                  </span>
                </div>
              }
              <cp-analytics-daily-chart
                [daily]="s.daily"
                [metric]="siteChart"
              ></cp-analytics-daily-chart>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100">
                  <h3 class="font-semibold text-gray-800">Împărțire pe categorii</h3>
                  <p class="text-xs text-gray-400 mt-0.5">
                    Vizualizări de articole/video + pagini de categorie
                  </p>
                </div>
                <cp-analytics-bars
                  [rows]="categoryRows(s.byCategory)"
                  unitLabel="viz."
                ></cp-analytics-bars>
              </div>
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100">
                  <h3 class="font-semibold text-gray-800">Sursă UTM</h3>
                  <p class="text-xs text-gray-400 mt-0.5">First-touch pe sesiune (?utm=)</p>
                </div>
                <cp-analytics-bars
                  [rows]="utmRows(s.byUtm)"
                  unitLabel="ses."
                  emptyText="Fără date UTM."
                ></cp-analytics-bars>
              </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div
                class="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div class="px-5 py-4 border-b border-gray-100">
                  <h3 class="font-semibold text-gray-800">Tip pagină</h3>
                </div>
                <cp-analytics-bars
                  [rows]="categoryRows(s.byPageType)"
                  unitLabel="viz."
                ></cp-analytics-bars>
              </div>
              <div
                class="xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div class="px-5 py-4 border-b border-gray-100">
                  <h3 class="font-semibold text-gray-800">Top pagini & articole</h3>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-gray-100 bg-gray-50 text-gray-600">
                        <th class="text-left px-4 py-3 font-medium">Pagină</th>
                        <th class="text-left px-4 py-3 font-medium hidden sm:table-cell">Tip</th>
                        <th class="text-right px-4 py-3 font-medium">Vizite</th>
                        <th class="text-right px-4 py-3 font-medium hidden md:table-cell">Unici</th>
                        <th class="text-right px-4 py-3 font-medium">Timp</th>
                      </tr>
                    </thead>
                    <tbody>
                      @if (s.topPages.length === 0) {
                        <tr>
                          <td colspan="5" class="text-center py-10 text-gray-400">
                            Nicio dată în intervalul selectat.
                          </td>
                        </tr>
                      }
                      @for (page of s.topPages; track page.path) {
                        <tr
                          class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                          [class.cursor-pointer]="!!page.postId"
                          (click)="page.postId && selectArticleFromPage(page)"
                        >
                          <td class="px-4 py-3">
                            <div class="font-medium text-gray-800 line-clamp-1">
                              {{ page.title || page.path }}
                            </div>
                            <div class="text-xs text-gray-400 font-mono">{{ page.path }}</div>
                          </td>
                          <td class="px-4 py-3 hidden sm:table-cell text-gray-500">
                            {{ pageTypeLabel(page.pageType) }}
                          </td>
                          <td class="px-4 py-3 text-right tabular-nums text-gray-700">
                            {{ fmtNum(page.sessions) }}
                          </td>
                          <td
                            class="px-4 py-3 text-right tabular-nums text-gray-500 hidden md:table-cell"
                          >
                            {{ fmtNum(page.uniqueVisitors) }}
                          </td>
                          <td class="px-4 py-3 text-right tabular-nums text-gray-700">
                            {{ formatDuration(page.totalDurationMs) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section id="article-section">
            <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h2 class="text-lg font-semibold text-gray-800">Statistică pe articol</h2>
                <p class="text-sm text-gray-500 mt-0.5">
                  Aceleași metrici, filtrate pe un articol (inclusiv varianta video).
                </p>
              </div>
              <div class="relative w-full sm:w-96" data-article-picker>
                <input
                  type="search"
                  [(ngModel)]="articleQuery"
                  (focus)="articleOpen.set(true)"
                  (ngModelChange)="onArticleQuery()"
                  placeholder="Caută sau alege un articol..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                @if (articleOpen()) {
                  <div
                    class="absolute z-20 mt-1 w-full max-h-72 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg"
                  >
                    @for (a of visibleArticles(); track a.postId) {
                      <button
                        type="button"
                        class="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        [class.bg-red-50]="selectedPostId() === a.postId"
                        (click)="selectArticle(a)"
                      >
                        <div class="text-sm font-medium text-gray-800 line-clamp-1">
                          {{ a.title }}
                        </div>
                        <div class="text-[11px] text-gray-400 font-mono">
                          {{ a.path }}
                          @if (a.sessions) {
                            · {{ fmtNum(a.sessions) }} vizite
                          }
                        </div>
                      </button>
                    }
                    @if (visibleArticles().length === 0) {
                      <p class="px-3 py-6 text-sm text-gray-400 text-center">
                        Niciun articol găsit.
                      </p>
                    }
                  </div>
                }
              </div>
            </div>

            @if (articleLoading()) {
              <p class="text-center py-12 text-gray-400">Se încarcă articolul...</p>
            } @else if (!article()) {
              <div
                class="bg-white rounded-xl border border-dashed border-gray-200 py-14 text-center text-sm text-gray-400"
              >
                Selectează un articol din listă sau din tabelul de mai sus.
              </div>
            } @else {
              @if (article(); as a) {
                <div class="flex items-center gap-2 mb-4">
                  <span
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-red-50 text-gray-800"
                  >
                    <span class="font-medium line-clamp-1">{{ a.title || a.path }}</span>
                    <button
                      type="button"
                      class="text-gray-400 hover:text-gray-700"
                      (click)="clearArticle()"
                    >
                      ×
                    </button>
                  </span>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
                  <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-xs text-gray-500 mb-1">Sesiuni</p>
                    <p class="text-2xl font-bold text-gray-800">{{ fmtNum(a.totalSessions) }}</p>
                  </div>
                  <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-xs text-gray-500 mb-1">Vizitatori unici</p>
                    <p class="text-2xl font-bold text-gray-800">{{ fmtNum(a.uniqueVisitors) }}</p>
                    <p class="text-[11px] text-gray-400 mt-0.5">
                      {{ fmtNum(a.newVisitors) }} noi · {{ fmtNum(a.returningVisitors) }} reveniți
                    </p>
                  </div>
                  <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-xs text-gray-500 mb-1">Vizualizări</p>
                    <p class="text-2xl font-bold text-gray-800">{{ fmtNum(a.totalPageViews) }}</p>
                  </div>
                  <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-xs text-gray-500 mb-1">Timp total</p>
                    <p class="text-2xl font-bold text-gray-800">
                      {{ formatDuration(a.totalDurationMs) }}
                    </p>
                  </div>
                  <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-xs text-gray-500 mb-1">Timp / vizită</p>
                    <p class="text-2xl font-bold text-gray-800">
                      {{ formatDuration(a.avgSessionDurationMs) }}
                    </p>
                  </div>
                  <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-xs text-gray-500 mb-1">Timp / pagină</p>
                    <p class="text-2xl font-bold text-gray-800">
                      {{ formatDuration(a.avgDurationMs) }}
                    </p>
                  </div>
                  <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-xs text-gray-500 mb-1">Pagini / sesiune</p>
                    <p class="text-2xl font-bold text-gray-800">{{ fmtDec(a.pagesPerSession) }}</p>
                  </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                  <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 class="font-semibold text-gray-800">Evoluție pe zile</h3>
                    <div class="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
                      <button
                        type="button"
                        (click)="articleChart = 'traffic'"
                        class="px-3 py-1 text-xs font-medium rounded-md"
                        [class.bg-white]="articleChart === 'traffic'"
                        [class.shadow-sm]="articleChart === 'traffic'"
                        [class.text-gray-800]="articleChart === 'traffic'"
                        [class.text-gray-500]="articleChart !== 'traffic'"
                      >
                        Vizitatori
                      </button>
                      <button
                        type="button"
                        (click)="articleChart = 'duration'"
                        class="px-3 py-1 text-xs font-medium rounded-md"
                        [class.bg-white]="articleChart === 'duration'"
                        [class.shadow-sm]="articleChart === 'duration'"
                        [class.text-gray-800]="articleChart === 'duration'"
                        [class.text-gray-500]="articleChart !== 'duration'"
                      >
                        Timp
                      </button>
                    </div>
                  </div>
                  <cp-analytics-daily-chart
                    [daily]="a.daily"
                    [metric]="articleChart"
                  ></cp-analytics-daily-chart>
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100">
                      <h3 class="font-semibold text-gray-800">Sursă UTM</h3>
                    </div>
                    <cp-analytics-bars
                      [rows]="utmRows(a.byUtm)"
                      unitLabel="ses."
                      emptyText="Fără date UTM."
                    ></cp-analytics-bars>
                  </div>
                  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100">
                      <h3 class="font-semibold text-gray-800">Categorie</h3>
                    </div>
                    <cp-analytics-bars
                      [rows]="categoryRows(a.byCategory)"
                      unitLabel="viz."
                    ></cp-analytics-bars>
                  </div>
                </div>
              }
            }
          </section>
        }
      }
    </div>
  `,
})
export class AnalyticsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  loading = signal(false);
  articleLoading = signal(false);
  site = signal<AnalyticsOverview | null>(null);
  article = signal<AnalyticsOverview | null>(null);
  pages = signal<AnalyticsPageStat[]>([]);
  selectedPostId = signal<string | null>(null);
  articleOpen = signal(false);
  searchHits = signal<AdminPostSummary[]>([]);

  rangePreset: RangePreset = '7d';
  fromDate = '';
  toDate = '';
  siteChart: ChartMetric = 'traffic';
  articleChart: ChartMetric = 'traffic';
  articleQuery = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly fmtNum = fmtNum;
  readonly formatDuration = formatDuration;
  readonly categoryRows = categoryRows;
  readonly utmRows = utmRows;

  trafficArticles = computed<ArticleOption[]>(() => {
    const map = new Map<string, ArticleOption>();
    for (const page of this.pages()) {
      if (!page.postId || (page.pageType !== 'article' && page.pageType !== 'video')) continue;
      const existing = map.get(page.postId);
      if (!existing) {
        map.set(page.postId, {
          postId: page.postId,
          title: page.title || page.path,
          path: page.path,
          sessions: page.sessions,
          uniqueVisitors: page.uniqueVisitors,
          pageViews: page.pageViews,
        });
      } else {
        existing.sessions += page.sessions;
        existing.uniqueVisitors += page.uniqueVisitors;
        existing.pageViews += page.pageViews;
      }
    }
    return [...map.values()].sort((a, b) => b.sessions - a.sessions);
  });

  visibleArticles = computed<ArticleOption[]>(() => {
    const q = this.articleQuery.trim().toLowerCase();
    const fromTraffic = this.trafficArticles().filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.path.toLowerCase().includes(q),
    );
    const seen = new Set(fromTraffic.map((a) => a.postId));
    const extras: ArticleOption[] = [];
    for (const post of this.searchHits()) {
      if (seen.has(post.id)) continue;
      extras.push({
        postId: post.id,
        title: post.title,
        path: `/${post.slug}`,
        sessions: 0,
        uniqueVisitors: 0,
        pageViews: 0,
      });
    }
    return [...fromTraffic, ...extras].slice(0, 20);
  });

  ngOnInit() {
    this.onPresetChange();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const el = ev.target as HTMLElement | null;
    if (el?.closest('[data-article-picker]')) return;
    this.articleOpen.set(false);
  }

  onPresetChange() {
    const today = new Date();
    this.toDate = this.toInputDate(today);
    if (this.rangePreset === '7d') {
      this.fromDate = this.toInputDate(new Date(today.getTime() - 7 * 86400000));
      this.load();
    } else if (this.rangePreset === '30d') {
      this.fromDate = this.toInputDate(new Date(today.getTime() - 30 * 86400000));
      this.load();
    } else if (this.rangePreset === '90d') {
      this.fromDate = this.toInputDate(new Date(today.getTime() - 90 * 86400000));
      this.load();
    }
  }

  load() {
    this.loading.set(true);
    forkJoin({
      overview: this.api.getAnalyticsOverview(this.fromDate, this.toDate),
      pages: this.api.getAnalyticsPages(this.fromDate, this.toDate),
    }).subscribe({
      next: ({ overview, pages }) => {
        this.site.set(overview);
        this.pages.set(pages);
        this.loading.set(false);
        const selected = this.selectedPostId();
        if (selected) this.loadArticle(selected);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Nu s-au putut încărca statisticile');
      },
    });
  }

  onArticleQuery() {
    this.articleOpen.set(true);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const q = this.articleQuery.trim();
    if (q.length < 2) {
      this.searchHits.set([]);
      return;
    }
    this.searchTimer = setTimeout(() => {
      this.api.getPosts({ search: q, perPage: 8, status: 'PUBLISHED' }).subscribe({
        next: (res) => this.searchHits.set(res.posts ?? []),
        error: () => this.searchHits.set([]),
      });
    }, 250);
  }

  selectArticle(option: ArticleOption) {
    this.articleQuery = option.title;
    this.articleOpen.set(false);
    this.selectedPostId.set(option.postId);
    this.loadArticle(option.postId);
  }

  selectArticleFromPage(page: AnalyticsPageStat) {
    if (!page.postId) return;
    this.selectArticle({
      postId: page.postId,
      title: page.title || page.path,
      path: page.path,
      sessions: page.sessions,
      uniqueVisitors: page.uniqueVisitors,
      pageViews: page.pageViews,
    });
    document.getElementById('article-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  clearArticle() {
    this.selectedPostId.set(null);
    this.article.set(null);
    this.articleQuery = '';
    this.searchHits.set([]);
  }

  loadArticle(postId: string) {
    this.articleLoading.set(true);
    this.api.getAnalyticsArticle(postId, this.fromDate, this.toDate).subscribe({
      next: (report) => {
        this.article.set(report);
        this.articleLoading.set(false);
      },
      error: () => {
        this.articleLoading.set(false);
        this.toast.error('Nu s-au putut încărca statisticile articolului');
      },
    });
  }

  pageTypeLabel(t: string) {
    return PAGE_TYPE_LABELS[t] ?? t;
  }

  fmtDec(n: number): string {
    return (n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
