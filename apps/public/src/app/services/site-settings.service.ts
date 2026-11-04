import { Injectable, signal } from '@angular/core';
import {
  DEFAULT_POST_DATE_FORMAT,
  isPostDateFormat,
  resolvePostDateFormat,
  type PillCorner,
  type PostDateFormat,
  type PublicSettings,
} from '@civicpress/shared';
import { formatPostDateForList } from '../utils/post-date-display';

@Injectable({ providedIn: 'root' })
export class SiteSettingsService {
  private _siteName = signal('Civicpress');
  private _tagline = signal<string | null>(null);
  private _logoUrl = signal<string | null>(null);
  private _showArticleViews = signal(false);
  private _postDateFormat = signal<PostDateFormat>(DEFAULT_POST_DATE_FORMAT);
  private _pillCorner = signal<PillCorner>('top-right');
  private _pillFontSize = signal(12);
  private _pillTransparency = signal(0);

  readonly siteName = this._siteName.asReadonly();
  readonly tagline = this._tagline.asReadonly();
  readonly logoUrl = this._logoUrl.asReadonly();
  readonly showArticleViews = this._showArticleViews.asReadonly();
  readonly postDateFormat = this._postDateFormat.asReadonly();
  readonly pillCorner = this._pillCorner.asReadonly();
  readonly pillFontSize = this._pillFontSize.asReadonly();
  readonly pillTransparency = this._pillTransparency.asReadonly();

  setFromSettings(settings: PublicSettings | null): void {
    this._siteName.set(settings?.siteName?.trim() || 'Civicpress');
    this._tagline.set(settings?.tagline ?? null);
    this._logoUrl.set(settings?.logoUrl ?? null);
    this._showArticleViews.set(settings?.showArticleViews ?? false);
    this._postDateFormat.set(
      isPostDateFormat(settings?.postDateFormat)
        ? settings.postDateFormat
        : DEFAULT_POST_DATE_FORMAT,
    );
    this._pillCorner.set(settings?.pillCorner ?? 'top-right');
    this._pillFontSize.set(settings?.pillFontSize ?? 12);
    this._pillTransparency.set(settings?.pillTransparency ?? 0);
  }

  resolveDateFormat(override?: PostDateFormat | null): PostDateFormat {
    return resolvePostDateFormat(override, this._postDateFormat());
  }

  formatPostDate(dateStr: string | null | undefined, override?: PostDateFormat | null): string {
    return formatPostDateForList(dateStr, this.resolveDateFormat(override));
  }

  canShowViews(post: { viewCount?: number }): boolean {
    return this._showArticleViews() && typeof post.viewCount === 'number';
  }

  formatViews(count: number): string {
    return new Intl.NumberFormat('ro-RO').format(count);
  }
}
