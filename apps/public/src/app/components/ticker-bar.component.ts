import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PublicTickerBar, TickerBarItem } from '@civicpress/shared';

@Component({
  selector: 'cp-ticker-bar',
  standalone: true,
  imports: [RouterModule],
  template: `
    @if (items.length) {
      <div
        class="ticker-bar"
        [attr.aria-label]="bar.title"
        (mouseenter)="pause()"
        (mouseleave)="resume()"
      >
        <span
          class="ticker-bar-label"
          [style.background-color]="bar.titleBgColor"
          [style.color]="bar.titleTextColor"
          >{{ bar.title }}</span
        >
        @if (isMarquee) {
          <div class="ticker-bar-viewport">
            <div
              #marqueeTrack
              class="ticker-bar-marquee"
              [class.ticker-bar-marquee--paused]="paused"
              [class.ticker-bar-marquee--from-left]="bar.scrollFrom === 'left'"
              [style.animation-duration.s]="marqueeDuration"
            >
              @for (loop of [0, 1]; track loop) {
                @for (item of items; track $index + '-' + loop) {
                  @if (item.href) {
                    <a
                      [routerLink]="item.href"
                      class="ticker-bar-marquee-item"
                      [style.color]="bar.textColor"
                    >
                      <span
                        class="ticker-bar-title"
                        [style.font-size.px]="bar.fontSize"
                        [style.font-weight]="bar.fontWeight"
                        >{{ item.text }}</span
                      >
                    </a>
                  } @else {
                    <span class="ticker-bar-marquee-item" [style.color]="bar.textColor">
                      <span
                        class="ticker-bar-title"
                        [style.font-size.px]="bar.fontSize"
                        [style.font-weight]="bar.fontWeight"
                        >{{ item.text }}</span
                      >
                    </span>
                  }
                }
              }
            </div>
          </div>
        } @else {
          <div class="ticker-bar-viewport">
            <div
              class="ticker-bar-track"
              [class.ticker-bar-track--instant]="skipAnim"
              [style.width.%]="slideItems.length * 100"
              [style.transform]="trackShift"
              (transitionend)="onTransitionEnd($event)"
            >
              @for (item of slideItems; track $index) {
                @if (item.href) {
                  <a
                    [routerLink]="item.href"
                    class="ticker-bar-item"
                    [style.justify-content]="align"
                    [attr.aria-hidden]="$index !== slideIndex"
                    [style.color]="bar.textColor"
                  >
                    <span
                      class="ticker-bar-title"
                      [style.font-size.px]="bar.fontSize"
                      [style.font-weight]="bar.fontWeight"
                      >{{ item.text }}</span
                    >
                  </a>
                } @else {
                  <span
                    class="ticker-bar-item"
                    [style.justify-content]="align"
                    [attr.aria-hidden]="$index !== slideIndex"
                    [style.color]="bar.textColor"
                  >
                    <span
                      class="ticker-bar-title"
                      [style.font-size.px]="bar.fontSize"
                      [style.font-weight]="bar.fontWeight"
                      >{{ item.text }}</span
                    >
                  </span>
                }
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        height: 100%;
      }

      .ticker-bar {
        display: flex;
        align-items: stretch;
        height: 100%;
        width: 100%;
        min-width: 0;
      }

      .ticker-bar-label {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        margin: 7px 0.75rem 7px 0;
        padding: 0 0.65rem;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        line-height: 1;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .ticker-bar-viewport {
        flex: 1;
        min-width: 0;
        overflow: hidden;
      }

      .ticker-bar-track {
        display: flex;
        height: 100%;
        transition: transform 0.5s ease;
      }

      .ticker-bar-track--instant {
        transition: none;
      }

      .ticker-bar-item {
        flex: 1 0 0;
        display: flex;
        align-items: center;
        min-width: 0;
        padding: 0 1rem;
        text-decoration: none;
      }

      a.ticker-bar-item:hover .ticker-bar-title,
      a.ticker-bar-marquee-item:hover .ticker-bar-title {
        text-decoration: underline;
      }

      .ticker-bar-title {
        display: block;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.3;
      }

      .ticker-bar-marquee {
        display: flex;
        align-items: center;
        width: max-content;
        height: 100%;
        animation-name: ticker-marquee-left;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }

      .ticker-bar-marquee--from-left {
        animation-name: ticker-marquee-right;
      }

      .ticker-bar-marquee--paused {
        animation-play-state: paused;
      }

      .ticker-bar-marquee-item {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        padding: 0 1.75rem 0 0;
        text-decoration: none;
      }

      .ticker-bar-marquee-item .ticker-bar-title {
        max-width: none;
      }

      @keyframes ticker-marquee-left {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(-50%);
        }
      }

      @keyframes ticker-marquee-right {
        from {
          transform: translateX(-50%);
        }
        to {
          transform: translateX(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .ticker-bar-track,
        .ticker-bar-marquee {
          animation: none;
          transition: none;
        }
      }
    `,
  ],
})
export class TickerBarComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);

  @Input({ required: true }) bar!: PublicTickerBar;
  @ViewChild('marqueeTrack') marqueeTrack?: ElementRef<HTMLElement>;

  get items(): TickerBarItem[] {
    return this.bar.items ?? [];
  }

  slideIndex = 0;
  skipAnim = false;
  paused = false;
  marqueeDuration = 20;

  private timer: ReturnType<typeof setInterval> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  get isMarquee(): boolean {
    return this.bar.motion === 'marquee';
  }

  get align(): string {
    if (this.bar.textAlign === 'center') return 'center';
    if (this.bar.textAlign === 'right') return 'flex-end';
    return 'flex-start';
  }

  get slideItems(): TickerBarItem[] {
    if (this.items.length <= 1) return this.items;
    if (this.bar.scrollFrom === 'left') {
      return [this.items[this.items.length - 1], ...this.items];
    }
    return [...this.items, this.items[0]];
  }

  get trackShift(): string {
    const n = this.slideItems.length;
    if (n === 0) return 'translateX(0)';
    return `translateX(-${(this.slideIndex / n) * 100}%)`;
  }

  ngOnInit(): void {
    this.resetSlide();
    this.start();
  }

  ngAfterViewInit(): void {
    this.setupMarquee();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['bar'] || changes['bar'].firstChange) return;
    this.resetSlide();
    this.start();
    queueMicrotask(() => this.setupMarquee());
  }

  ngOnDestroy(): void {
    this.stop();
    this.resizeObserver?.disconnect();
  }

  pause(): void {
    this.paused = true;
    this.stop();
  }

  resume(): void {
    this.paused = false;
    this.start();
  }

  onTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName !== 'transform' || this.isMarquee) return;
    if (this.bar.scrollFrom === 'left') {
      if (this.slideIndex > 0) return;
      this.skipAnim = true;
      this.slideIndex = this.items.length;
    } else {
      if (this.slideIndex < this.items.length) return;
      this.skipAnim = true;
      this.slideIndex = 0;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.skipAnim = false;
      });
    });
  }

  private resetSlide(): void {
    this.skipAnim = true;
    this.slideIndex = this.bar.scrollFrom === 'left' && this.items.length > 1 ? 1 : 0;
  }

  private start(): void {
    this.stop();
    if (this.isMarquee) {
      this.measureMarquee();
      return;
    }
    if (!isPlatformBrowser(this.platformId) || this.paused || this.items.length <= 1) return;
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        this.zone.run(() => this.next());
      }, this.bar.intervalMs || 5000);
    });
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private next(): void {
    if (this.items.length <= 1) return;
    this.skipAnim = false;
    this.slideIndex += this.bar.scrollFrom === 'left' ? -1 : 1;
  }

  private setupMarquee(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (!this.isMarquee || !isPlatformBrowser(this.platformId)) return;
    const el = this.marqueeTrack?.nativeElement;
    if (!el) return;
    this.measureMarquee();
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.measureMarquee());
    this.resizeObserver.observe(el);
  }

  private measureMarquee(): void {
    const el = this.marqueeTrack?.nativeElement;
    if (!el) return;
    const half = el.scrollWidth / 2;
    const speed = this.bar.marqueeSpeed || 60;
    this.marqueeDuration = Math.max(4, half / Math.max(speed, 1));
  }
}
