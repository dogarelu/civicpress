import { Component, Input } from '@angular/core';

/** Sidebar block: one uploaded image with optional section title and photo title. */
@Component({
  selector: 'cp-sidebar-featured-photo',
  standalone: true,
  template: `
    @if (imageUrl) {
      <aside class="bg-white border border-border rounded-sm shadow-sm overflow-hidden">
        @if (title.trim().length > 0) {
          <header class="px-3 py-2 text-center cp-row-header-bar border-b border-border">
            <span
              class="uppercase tracking-wider"
              style="font-size: var(--row-header-font-size, 12px); font-weight: var(--row-header-font-weight, 700); color: var(--row-header-color, #1f2937);"
              >{{ title }}</span
            >
          </header>
        }
        <div class="p-3">
          <img
            [src]="imageUrl"
            [alt]="caption.trim() || title.trim() || 'Imagine'"
            class="w-full h-auto object-contain"
            loading="lazy"
          />
          @if (caption.trim().length > 0) {
            <h4
              class="mt-2 leading-tight text-secondary"
              style="font-size: var(--sidebar-title-font-size, var(--news-title-font-size, 15px)); font-weight: var(--sidebar-title-font-weight, var(--news-title-font-weight, 700)); color: var(--sidebar-title-color, var(--news-title-color, currentColor));"
            >
              {{ caption }}
            </h4>
          }
        </div>
      </aside>
    }
  `,
})
export class SidebarFeaturedPhotoComponent {
  @Input() title = '';
  @Input() caption = '';
  @Input() imageUrl: string | null = null;
}
