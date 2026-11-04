import { Component, Input } from '@angular/core';

@Component({
  selector: 'cp-post-reading-time',
  standalone: true,
  template: `
    <span class="inline-flex items-center gap-0.5" [attr.aria-label]="ariaLabel()">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        fill="currentColor"
        viewBox="0 0 16 16"
        class="flex-shrink-0 opacity-70"
        aria-hidden="true"
      >
        <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z" />
        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0" />
      </svg>
      <span>{{ label() }}</span>
    </span>
  `,
})
export class PostReadingTimeComponent {
  /** Total estimated reading time in seconds. */
  @Input({ required: true }) seconds!: number;

  private totalSeconds(): number {
    return Math.max(0, Math.round(this.seconds ?? 0));
  }

  private parts(): { minutes: number; seconds: number } {
    const total = this.totalSeconds();
    return { minutes: Math.floor(total / 60), seconds: total % 60 };
  }

  label(): string {
    const { minutes, seconds } = this.parts();
    if (minutes <= 0) return `${seconds} sec`;
    if (seconds <= 0) return `${minutes} min`;
    return `${minutes} min ${seconds} sec`;
  }

  ariaLabel(): string {
    const { minutes, seconds } = this.parts();
    const minPart = minutes <= 0 ? '' : minutes === 1 ? '1 minut' : `${minutes} minute`;
    const secPart = seconds <= 0 ? '' : seconds === 1 ? '1 secundă' : `${seconds} secunde`;
    const joined = [minPart, secPart].filter(Boolean).join(' și ');
    return joined ? `${joined} de citire` : '0 secunde de citire';
  }
}
