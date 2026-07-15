import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { LayoutDisplaySlot, PostSummary } from '@civicpress/shared';
import { cleanExcerptText } from '@civicpress/shared';
import { VideoPlayerComponent } from '../video-player.component';

interface SidebarVideoItemInput {
  id: string;
  title?: string | null;
  url: string;
}

@Component({
  selector: 'cp-sidebar-video',
  standalone: true,
  imports: [CommonModule, RouterModule, VideoPlayerComponent],
  template: `
    @if (items.length > 0) {
      <aside class="bg-white border border-border rounded-sm shadow-sm overflow-hidden">
        <header
          class="px-3 py-2 bg-gray-100 border-b border-border flex items-center justify-between"
        >
          <span class="text-gray-800 text-xs font-bold uppercase tracking-wider">Video</span>
          @if (items.length > 1) {
            <span class="text-[11px] text-gray-500"
              >{{ activeIndex + 1 }} / {{ items.length }}</span
            >
          }
        </header>

        <div class="p-3 space-y-3">
          @let item = items[activeIndex];
          @if (item) {
            <div class="aspect-video">
              <cp-video-player
                [videoUrl]="item.videoUrl"
                [title]="item.title"
                [posterUrl]="item.posterUrl"
              />
            </div>

            <div>
              <h4
                class="leading-tight sidebar-video-title-clamp text-secondary"
                style="font-size: var(--sidebar-title-font-size, 13px); font-weight: var(--sidebar-title-font-weight, 600); color: var(--sidebar-title-color, currentColor);"
              >
                @if (item.post) {
                  <a
                    [routerLink]="['/video', item.post.slug]"
                    class="hover:text-primary transition-colors"
                  >
                    {{ item.title }}
                  </a>
                } @else {
                  {{ item.title }}
                }
              </h4>
              @if (item.post?.excerpt) {
                <p
                  class="mt-1 news-summary-clamp text-gray-600"
                  style="font-size: var(--news-summary-font-size, 12px); font-weight: var(--news-summary-font-weight, 400); color: var(--news-summary-color, currentColor);"
                >
                  {{ cleanExcerpt(item.post) }}
                </p>
              }
              @if (item.post) {
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <a
                    [routerLink]="['/video', item.post.slug]"
                    class="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
                  >
                    Pagina video
                  </a>
                </div>
              }
            </div>
          }

          @if (items.length > 1) {
            <div class="flex items-center justify-between gap-2 pt-1 border-t border-border">
              <button
                type="button"
                (click)="prev()"
                class="px-2 py-1 text-xs border border-border rounded hover:bg-muted transition-colors"
              >
                ‹ Anterior
              </button>
              <button
                type="button"
                (click)="next()"
                class="px-2 py-1 text-xs border border-border rounded hover:bg-muted transition-colors"
              >
                Următor ›
              </button>
            </div>
          }
        </div>
      </aside>
    }
  `,
})
export class SidebarVideoComponent {
  @Input() posts: PostSummary[] = [];
  @Input() videoItems: SidebarVideoItemInput[] = [];
  @Input() displaySlots: LayoutDisplaySlot[] = [];
  @Input() hasMore = false;
  @Input() loading = false;
  @Output() loadMore = new EventEmitter<void>();

  activeIndex = 0;

  cleanExcerpt(post: PostSummary): string {
    return cleanExcerptText(post.excerpt);
  }

  get items(): Array<{
    videoUrl: string;
    title: string;
    posterUrl: string | null;
    post: PostSummary | null;
    showDate: boolean;
    showAuthor: boolean;
  }> {
    const manualItems = this.videoItems
      .filter((video) => !!video.url)
      .map((video, index) => ({
        videoUrl: video.url,
        title: video.title?.trim() || 'Video',
        posterUrl: null,
        post: null,
        showDate: this.displaySlots[index]?.showDate ?? true,
        showAuthor: this.displaySlots[index]?.showAuthor ?? true,
      }));
    const postItems = this.posts
      .filter((post) => !!post.videoUrl)
      .map((post, index) => ({
        videoUrl: post.videoUrl!,
        title: post.title,
        posterUrl: post.heroImage?.url ?? null,
        post,
        showDate: this.displaySlots[manualItems.length + index]?.showDate ?? true,
        showAuthor: this.displaySlots[manualItems.length + index]?.showAuthor ?? true,
      }));
    return [...manualItems, ...postItems];
  }

  prev() {
    if (this.items.length === 0) return;
    this.activeIndex = (this.activeIndex - 1 + this.items.length) % this.items.length;
  }

  next() {
    if (this.items.length === 0) return;
    this.activeIndex = (this.activeIndex + 1) % this.items.length;
  }
}
