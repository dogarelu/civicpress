import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Pill, PillCorner, PillSize } from '@civicpress/shared';
import { SiteSettingsService } from '../services/site-settings.service';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

@Component({
  selector: 'cp-post-image-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (pill) {
      <span
        class="cp-image-pill"
        [class.cp-image-pill--floating]="floating"
        [attr.data-corner]="floating ? resolvedCorner : null"
        [attr.data-size]="size"
        [attr.data-rel-size]="relSize || 'default'"
        [style.backgroundColor]="bgColor"
        [style.color]="pill.textColor || '#ffffff'"
      >
        {{ pill.text }}
      </span>
    }
  `,
})
export class PostImagePillComponent {
  private siteSettings = inject(SiteSettingsService);

  @Input() pill: Pill | null | undefined = null;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  /** Per-article size, relative to the layout/global default. */
  @Input() relSize: PillSize | null | undefined = 'default';
  @Input() floating = true;
  /** Per-article override; wins over layout `corner` and global setting. */
  @Input() postCorner: PillCorner | null | undefined = null;
  /** Layout hardcode; used when `postCorner` is unset. */
  @Input() corner: PillCorner | null = null;

  get resolvedCorner(): PillCorner {
    return this.postCorner ?? this.corner ?? this.siteSettings.pillCorner();
  }

  get bgColor(): string {
    const color = this.pill?.color || '#000000';
    const alpha = Math.max(0, Math.min(1, 1 - this.siteSettings.pillTransparency() / 100));
    if (alpha >= 1) return color;
    return hexToRgba(color, alpha);
  }
}
