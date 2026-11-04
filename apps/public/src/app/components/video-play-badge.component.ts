import { Component, input } from '@angular/core';

/** Corner play badge: primary square, background-colored triangle. */
@Component({
  selector: 'cp-video-play-badge',
  standalone: true,
  host: {
    class: 'absolute bottom-0 right-0 z-10 pointer-events-none',
    'aria-hidden': 'true',
  },
  template: `
    <span
      class="flex items-center justify-center bg-primary text-background"
      [class.h-6]="size() === 'sm'"
      [class.w-6]="size() === 'sm'"
      [class.h-8]="size() === 'md'"
      [class.w-8]="size() === 'md'"
      [class.h-10]="size() === 'lg'"
      [class.w-10]="size() === 'lg'"
    >
      <svg
        class="ml-px"
        [class.h-3]="size() === 'sm'"
        [class.w-3]="size() === 'sm'"
        [class.h-4]="size() === 'md'"
        [class.w-4]="size() === 'md'"
        [class.h-5]="size() === 'lg'"
        [class.w-5]="size() === 'lg'"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  `,
})
export class VideoPlayBadgeComponent {
  size = input<'sm' | 'md' | 'lg'>('md');
}
