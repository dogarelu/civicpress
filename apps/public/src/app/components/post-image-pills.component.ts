import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PillCorner, PostPillPlacement } from '@civicpress/shared';
import { PostImagePillComponent } from './post-image-pill.component';

@Component({
  selector: 'cp-post-image-pills',
  standalone: true,
  imports: [CommonModule, PostImagePillComponent],
  host: {
    '[attr.data-size]': 'size',
    class: 'cp-pill-frame',
  },
  template: `
    @for (item of pills ?? []; track item.pill.id) {
      <cp-post-image-pill
        [pill]="item.pill"
        [postCorner]="item.corner"
        [relSize]="item.size"
        [corner]="corner"
        [size]="size"
        [floating]="floating"
      />
    }
  `,
})
export class PostImagePillsComponent {
  @Input() pills: PostPillPlacement[] | null | undefined = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() floating = true;
  /** Layout hardcode; used when a placement has no corner (single-pill global default path). */
  @Input() corner: PillCorner | null = null;
}
