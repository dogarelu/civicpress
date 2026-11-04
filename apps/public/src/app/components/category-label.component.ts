import { Component, computed, input } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Per-article category label used inside modules.
 * Pill vs plain styling comes from module typography CSS vars on an ancestor.
 */
@Component({
  selector: 'cp-category-label',
  standalone: true,
  imports: [RouterModule],
  host: { class: 'contents' },
  template: `
    @if (link()) {
      <a [routerLink]="['/category', slug()]" [class]="classes()">{{ name() }}</a>
    } @else {
      <span [class]="classes()">{{ name() }}</span>
    }
  `,
})
export class CategoryLabelComponent {
  readonly name = input.required<string>();
  readonly slug = input.required<string>();
  /** Use hero category CSS vars (dual/hero modules). */
  readonly variant = input<'default' | 'hero'>('default');
  /** Dark image overlay — white fallback when typography color is unset. */
  readonly onImage = input(false);
  /** When false, render a non-link span (e.g. slideshow overlay already wrapped in a link). */
  readonly link = input(true);
  readonly extraClass = input('');

  readonly classes = computed(() => {
    const parts = ['cp-category-label', 'uppercase', 'tracking-wide'];
    if (this.variant() === 'hero') parts.push('cp-category-label--hero');
    if (this.onImage()) parts.push('cp-category-label--on-image');
    const extra = this.extraClass().trim();
    if (extra) parts.push(extra);
    return parts.join(' ');
  });
}
