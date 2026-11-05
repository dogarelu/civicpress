import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import type { PostBumb } from '@civicpress/shared';
import { cleanExcerptText, safeHttpUrl } from '@civicpress/shared';

export type PostSubtitleVariant = 'default' | 'hero';

/**
 * Renders article subtitle: bumbi list when present, else legacy plain excerpt.
 * Bumbi use `--news-bumbi-*` / `--hero-bumbi-*` (fallback: summary vars).
 * Legacy excerpt uses `--news-summary-*` / `--hero-summary-*`.
 */
@Component({
  selector: 'cp-post-subtitle',
  standalone: true,
  imports: [RouterModule],
  template: `
    @if (visible) {
      @if (bumbiVisible) {
        <ul [class]="mergedListClass" [attr.style]="bumbiStyle()">
          @for (item of bulbi; track item.id) {
            <li>
              @if (item.linkedPost; as linked) {
                <a
                  [routerLink]="['/', linked.slug]"
                  class="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  (click)="$event.stopPropagation()"
                >
                  {{ item.label }}
                </a>
              } @else if (externalHref(item); as href) {
                <a
                  [href]="href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  (click)="$event.stopPropagation()"
                >
                  {{ item.label }}
                </a>
              } @else {
                {{ item.label }}
              }
            </li>
          }
        </ul>
      } @else if (cleanExcerpt) {
        <p [class]="mergedTextClass" [attr.style]="summaryStyle()">
          {{ cleanExcerpt }}
        </p>
      }
    }
  `,
})
export class PostSubtitleComponent {
  @Input() show = true;
  /** When unset, follows `show` so existing modules keep current behaviour. */
  @Input() showBumbi: boolean | null = null;
  @Input() bulbi: PostBumb[] = [];
  @Input() excerpt: string | null | undefined = null;
  /** Extra classes for the bumbi `<ul>` (merged with base list styles). */
  @Input() listClass = 'text-gray-600 mt-2';
  /** Extra classes for legacy excerpt `<p>`. */
  @Input() textClass = 'text-gray-600 mt-2';
  /** Use hero summary/bumbi CSS vars for large/featured cards. */
  @Input() variant: PostSubtitleVariant = 'default';

  get bumbiVisible(): boolean {
    return (this.showBumbi ?? this.show) && this.bulbi.length > 0;
  }

  get excerptVisible(): boolean {
    return this.show && !!this.cleanExcerpt && !this.bumbiVisible;
  }

  get visible(): boolean {
    return this.bumbiVisible || this.excerptVisible;
  }

  get cleanExcerpt(): string {
    return cleanExcerptText(this.excerpt);
  }

  externalHref(item: PostBumb): string | null {
    return safeHttpUrl(item.externalUrl);
  }

  /** Keep base list classes when callers pass extra `[class]` extras. */
  get mergedListClass(): string {
    return `cp-bumbi-list list-disc pl-5 space-y-0 leading-snug ${this.listClass}`.trim();
  }

  get mergedTextClass(): string {
    return `news-summary-clamp ${this.textClass}`.trim();
  }

  bumbiStyle(): string {
    if (this.variant === 'hero') {
      return (
        'font-size: var(--hero-bumbi-font-size, var(--hero-summary-font-size, var(--news-bumbi-font-size, var(--news-summary-font-size, 14px)))); ' +
        'font-weight: var(--hero-bumbi-font-weight, var(--hero-summary-font-weight, var(--news-bumbi-font-weight, var(--news-summary-font-weight, 400)))); ' +
        'color: var(--hero-bumbi-color, var(--hero-summary-color, var(--news-bumbi-color, var(--news-summary-color, currentColor)))); ' +
        'line-height: var(--hero-bumbi-line-height, var(--news-bumbi-line-height, 1.2));'
      );
    }
    return (
      'font-size: var(--news-bumbi-font-size, var(--news-summary-font-size, 14px)); ' +
      'font-weight: var(--news-bumbi-font-weight, var(--news-summary-font-weight, 400)); ' +
      'color: var(--news-bumbi-color, var(--news-summary-color, currentColor)); ' +
      'line-height: var(--news-bumbi-line-height, 1.2);'
    );
  }

  summaryStyle(): string {
    if (this.variant === 'hero') {
      return (
        'font-size: var(--hero-summary-font-size, var(--news-summary-font-size, 14px)); ' +
        'font-weight: var(--hero-summary-font-weight, var(--news-summary-font-weight, 400)); ' +
        'color: var(--hero-summary-color, var(--news-summary-color, currentColor));'
      );
    }
    return (
      'font-size: var(--news-summary-font-size, 14px); ' +
      'font-weight: var(--news-summary-font-weight, 400); ' +
      'color: var(--news-summary-color, currentColor);'
    );
  }
}
