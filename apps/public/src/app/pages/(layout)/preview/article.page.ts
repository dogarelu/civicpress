import { Component, OnInit, PLATFORM_ID, computed, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, map, of, switchMap, type Observable } from 'rxjs';

import { ArticlePageViewComponent } from '../../../components/article-page-view.component';
import { ApiService } from '../../../services/api.service';
import { SeoService } from '../../../services/seo.service';
import type { PostDetail } from '@civicpress/shared';

type PreviewState = {
  post: PostDetail | null;
  error: 'missing' | 'expired' | null;
};

@Component({
  selector: 'cp-article-preview-page',
  standalone: true,
  imports: [ArticlePageViewComponent],
  template: `
    <div class="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Previzualizare — conținutul din editor, cu layout-ul curent al paginii de articol.
    </div>

    @if (post(); as p) {
      <cp-article-page-view [post]="p" />
    } @else if (error() === 'expired') {
      <p class="text-sm text-gray-600">
        Previzualizarea a expirat. Închide fereastra și deschide din nou din editor.
      </p>
    } @else if (error() === 'missing') {
      <p class="text-sm text-gray-600">
        Lipsește tokenul de previzualizare. Închide fereastra și deschide din nou din editor.
      </p>
    } @else {
      <p class="text-sm text-gray-600">Se încarcă previzualizarea…</p>
    }
  `,
})
export default class ArticlePreviewPageComponent implements OnInit {
  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);

  private token = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('token') ?? '')),
    { initialValue: this.route.snapshot.queryParamMap.get('token') ?? '' },
  );

  private preview = toSignal(
    toObservable(this.token).pipe(
      switchMap((token): Observable<PreviewState | null> => {
        if (!isPlatformBrowser(this.platformId)) {
          return of(null);
        }
        if (!token) {
          return of({ post: null, error: 'missing' });
        }
        return this.api.getArticlePreview(token).pipe(
          map((post): PreviewState => ({ post, error: null })),
          catchError(() => of<PreviewState>({ post: null, error: 'expired' })),
        );
      }),
    ),
  );

  post = computed(() => this.preview()?.post ?? null);
  error = computed(() => this.preview()?.error ?? null);

  ngOnInit() {
    this.seo.applyPreview();
  }
}
