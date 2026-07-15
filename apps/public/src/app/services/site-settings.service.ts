import { Injectable, signal } from '@angular/core';
import type { PublicSettings } from '@civicpress/shared';

@Injectable({ providedIn: 'root' })
export class SiteSettingsService {
  private _showArticleViews = signal(false);

  readonly showArticleViews = this._showArticleViews.asReadonly();

  setFromSettings(settings: PublicSettings | null): void {
    this._showArticleViews.set(settings?.showArticleViews ?? false);
  }

  canShowViews(post: { viewCount?: number }): boolean {
    return this._showArticleViews() && typeof post.viewCount === 'number';
  }

  formatViews(count: number): string {
    return new Intl.NumberFormat('ro-RO').format(count);
  }
}
