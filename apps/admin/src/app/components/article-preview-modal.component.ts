import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

export type ArticlePreviewViewport = 'mobile' | 'tablet' | 'web';

const VIEWPORT_WIDTHS: Record<ArticlePreviewViewport, number> = {
  mobile: 375,
  tablet: 768,
  web: 1280,
};

@Component({
  selector: 'cp-article-preview-modal',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex flex-col bg-gray-900/70">
      <div class="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <h2 class="text-sm font-semibold text-gray-800">Previzualizare articol</h2>
        <div class="flex rounded-lg border border-gray-200 overflow-hidden">
          @for (option of viewportOptions; track option.id) {
            <button
              type="button"
              (click)="viewport.set(option.id)"
              class="px-3 py-1.5 text-xs font-medium transition-colors"
              [class.bg-red-800]="viewport() === option.id"
              [class.text-white]="viewport() === option.id"
              [class.text-gray-600]="viewport() !== option.id"
              [class.hover:bg-gray-50]="viewport() !== option.id"
            >
              {{ option.label }}
            </button>
          }
        </div>
        <span class="text-xs text-gray-400">{{ frameWidth() }}px</span>
        <button
          type="button"
          (click)="refresh.emit()"
          [disabled]="loading()"
          class="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Reîncarcă
        </button>
        @if (iframeSrc()) {
          <a
            [href]="iframeSrc()!"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Deschide în tab nou
          </a>
        }
        <button
          type="button"
          (click)="close.emit()"
          class="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
          aria-label="Închide"
        >
          ×
        </button>
      </div>

      <div #stage class="relative flex-1 overflow-hidden bg-gray-800">
        @if (loading()) {
          <div class="absolute inset-0 flex items-center justify-center text-sm text-gray-300">
            Se generează previzualizarea…
          </div>
        } @else if (safeSrc()) {
          <div class="h-full w-full flex justify-center items-start overflow-auto p-4">
            <div
              class="bg-white shadow-xl shrink-0"
              [style.width.px]="frameWidth() * scale()"
              [style.height.px]="frameHeight() * scale()"
            >
              <iframe
                title="Previzualizare articol"
                [src]="safeSrc()"
                class="border-0 bg-white"
                [style.width.px]="frameWidth()"
                [style.height.px]="frameHeight()"
                [style.transform]="'scale(' + scale() + ')'"
                style="transform-origin: top left"
              ></iframe>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ArticlePreviewModalComponent implements AfterViewInit, OnDestroy {
  private sanitizer = inject(DomSanitizer);

  loading = input(false);
  iframeSrc = input<string | null>(null);
  close = output<void>();
  refresh = output<void>();

  readonly viewportOptions: Array<{ id: ArticlePreviewViewport; label: string }> = [
    { id: 'mobile', label: 'Mobil' },
    { id: 'tablet', label: 'Tabletă' },
    { id: 'web', label: 'Web' },
  ];

  viewport = signal<ArticlePreviewViewport>('web');
  frameWidth = computed(() => VIEWPORT_WIDTHS[this.viewport()]);
  frameHeight = signal(800);
  scale = signal(1);

  @ViewChild('stage') stage?: ElementRef<HTMLElement>;
  private resizeObserver?: ResizeObserver;

  safeSrc = computed(() => {
    const src = this.iframeSrc();
    return src ? this.sanitizer.bypassSecurityTrustResourceUrl(src) : null;
  });

  constructor() {
    effect(() => {
      this.viewport();
      this.iframeSrc();
      queueMicrotask(() => this.updateFrameMetrics());
    });
  }

  ngAfterViewInit() {
    const el = this.stage?.nativeElement;
    if (!el || typeof ResizeObserver === 'undefined') {
      this.updateFrameMetrics();
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.updateFrameMetrics());
    this.resizeObserver.observe(el);
    this.updateFrameMetrics();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close.emit();
  }

  private updateFrameMetrics() {
    const el = this.stage?.nativeElement;
    const padding = 32;
    const availW = Math.max(320, (el?.clientWidth ?? 1280) - padding);
    const availH = Math.max(400, (el?.clientHeight ?? 800) - padding);
    const width = this.frameWidth();
    const nextScale = Math.min(1, availW / width);
    this.scale.set(nextScale);
    this.frameHeight.set(Math.max(400, Math.round(availH / nextScale)));
  }
}
