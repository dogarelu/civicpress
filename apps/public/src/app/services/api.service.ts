import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  PublicSettings,
  MenuItem,
  HomeResponse,
  PostDetail,
  CategoryDetail,
  PostsFeedResponse,
} from '@civicpress/shared';

const API_BASE = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  getSettings(): Observable<PublicSettings> {
    return this.http.get<PublicSettings>(`${API_BASE}/v1/settings/public`);
  }

  getMenu(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${API_BASE}/v1/menu`);
  }

  getHome(): Observable<HomeResponse> {
    return this.http.get<HomeResponse>(`${API_BASE}/v1/home`);
  }

  getPost(slug: string): Observable<PostDetail> {
    return this.http.get<PostDetail>(`${API_BASE}/v1/posts/${encodeURIComponent(slug)}`);
  }

  getCategory(slug: string, page = 1, perPage = 15): Observable<CategoryDetail> {
    return this.http.get<CategoryDetail>(
      `${API_BASE}/v1/categories/${encodeURIComponent(slug)}?page=${page}&perPage=${perPage}`,
    );
  }

  getMorePosts(
    excludeIds: string[],
    categorySlug?: string,
    take = 10,
    hasVideo = false,
  ): Observable<PostsFeedResponse> {
    const params = new URLSearchParams({ exclude: excludeIds.join(','), take: String(take) });
    if (categorySlug) params.set('category', categorySlug);
    if (hasVideo) params.set('hasVideo', 'true');
    return this.http.get<PostsFeedResponse>(`${API_BASE}/v1/posts-feed?${params.toString()}`);
  }

  mediaUrl(id: string, variant = 'orig'): string {
    return `${API_BASE}/v1/media/${id}/${variant}`;
  }
}
