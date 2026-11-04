import { Injectable, signal } from '@angular/core';

export type VideoOverlayPayload = {
  videoUrl: string;
  title: string;
  posterUrl: string | null;
};

@Injectable({ providedIn: 'root' })
export class VideoOverlayService {
  readonly video = signal<VideoOverlayPayload | null>(null);

  open(payload: VideoOverlayPayload): void {
    this.video.set(payload);
  }

  close(): void {
    this.video.set(null);
  }
}
