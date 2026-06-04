import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type {
  AdminPostSummary,
  PostCreate,
  PostUpdate,
  AuditEntry,
  Me,
  HomepageConfig,
  AdminCategory,
  CategoryCreate,
  CategoryUpdate,
} from '@civicpress/shared';

const API = '/v1';

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  perPage: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ─── Posts ────────────────────────────────────────────────────────────────

  getPosts(opts: { page?: number; perPage?: number; status?: string; search?: string } = {}) {
    let params = new HttpParams();
    if (opts.page) params = params.set('page', opts.page);
    if (opts.perPage) params = params.set('perPage', opts.perPage);
    if (opts.status) params = params.set('status', opts.status);
    if (opts.search) params = params.set('search', opts.search);
    return this.http.get<{
      posts: AdminPostSummary[];
      total: number;
      page: number;
      perPage: number;
    }>(`${API}/posts`, { params });
  }

  getPost(id: string) {
    return this.http.get<Record<string, unknown>>(`${API}/admin/posts/${id}`);
  }

  createPost(data: PostCreate) {
    return this.http.post<Record<string, unknown>>(`${API}/posts`, data);
  }

  updatePost(id: string, data: PostUpdate) {
    return this.http.patch<Record<string, unknown>>(`${API}/posts/${id}`, data);
  }

  transitionPost(id: string, action: string, message?: string) {
    return this.http.post<{ id: string; status: string }>(`${API}/posts/${id}/transition`, {
      action,
      message,
    });
  }

  deletePost(id: string) {
    return this.http.delete<{ ok: boolean }>(`${API}/posts/${id}`);
  }

  getRevisions(postId: string) {
    return this.http.get<unknown[]>(`${API}/posts/${postId}/revisions`);
  }

  // ─── Media ────────────────────────────────────────────────────────────────

  uploadMedia(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ id: string; url: string; width: number | null; height: number | null }>(
      `${API}/media/upload`,
      form,
    );
  }

  getMediaList(page = 1) {
    return this.http.get<{
      media: Array<{ id: string; url: string; filename: string; mimeType: string }>;
      total: number;
    }>(`${API}/media?page=${page}`);
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  getAuditLog(opts: { page?: number; entity?: string; mine?: boolean } = {}) {
    let params = new HttpParams();
    if (opts.page) params = params.set('page', opts.page);
    if (opts.entity) params = params.set('entity', opts.entity);
    if (opts.mine) params = params.set('mine', '1');
    return this.http.get<{ logs: AuditEntry[]; total: number; page: number; perPage: number }>(
      `${API}/audit`,
      { params },
    );
  }

  // ─── Categories ───────────────────────────────────────────────────────────

  getCategories() {
    return this.http.get<AdminCategory[]>(`${API}/admin/categories`);
  }

  createCategory(data: CategoryCreate) {
    return this.http.post<AdminCategory>(`${API}/admin/categories`, data);
  }

  updateCategory(id: string, data: CategoryUpdate) {
    return this.http.patch<AdminCategory>(`${API}/admin/categories/${id}`, data);
  }

  deleteCategory(id: string) {
    return this.http.delete<{ ok: boolean; id: string }>(`${API}/admin/categories/${id}`);
  }

  reorderCategories(ids: string[]) {
    return this.http.put<{ ok: boolean }>(`${API}/admin/categories/order`, { ids });
  }

  // ─── Dashboard stats ──────────────────────────────────────────────────────

  getDashboardStats() {
    return this.http.get<{
      posts: AdminPostSummary[];
      total: number;
      page: number;
      perPage: number;
    }>(`${API}/posts?perPage=100`);
  }

  // ─── Homepage curation ────────────────────────────────────────────────────

  getHomepageConfig() {
    return this.http.get<HomepageConfig>(`${API}/admin/homepage`);
  }

  saveHomepageConfig(payload: {
    hero: string | null;
    grid: (string | null)[];
    list: (string | null)[];
  }) {
    return this.http.put<{ ok: boolean }>(`${API}/admin/homepage`, payload);
  }
}
