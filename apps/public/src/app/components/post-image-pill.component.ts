import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Pill } from '@civicpress/shared';

@Component({
  selector: 'cp-post-image-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (pill) {
      <span
        class="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold shadow-sm pointer-events-none"
        [class.absolute]="floating"
        [class.top-2]="floating && size !== 'sm' && size !== 'lg'"
        [class.right-2]="floating && size !== 'sm' && size !== 'lg'"
        [class.z-10]="floating"
        [class.top-1]="floating && size === 'sm'"
        [class.right-1]="floating && size === 'sm'"
        [class.text-[9px]]="size === 'sm'"
        [class.px-1.5]="size === 'sm'"
        [class.py-px]="size === 'sm'"
        [class.top-3]="floating && size === 'lg'"
        [class.right-3]="floating && size === 'lg'"
        [class.text-sm]="size === 'lg'"
        [class.px-3]="size === 'lg'"
        [class.py-1]="size === 'lg'"
        [style.backgroundColor]="pill.color"
        [style.color]="pill.textColor || '#ffffff'"
      >
        {{ pill.text }}
      </span>
    }
  `,
})
export class PostImagePillComponent {
  @Input() pill: Pill | null | undefined = null;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() floating = true;
}
