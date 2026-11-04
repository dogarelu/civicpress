import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type {
  AdminPostSummary,
  PostCreate,
  PostPreviewRequest,
  PostPreviewToken,
  PostTransition,
  PostUpdate,
  AuditEntry,
  AuthorPostStats,
  Me,
  AdminLayouts,
  LayoutPageId,
  PageLayoutConfig,
  PinPostAtFront,
  AdminCategory,
  CategoryCreate,
  CategoryUpdate,
  AdminSettings,
  SettingsUpdate,
  TickerBarConfig,
  UserSummary,
  UserDetail,
  UserCreate,
  UserUpdate,
  NotificationPrefsUpdate,
  MeUpdate,
  AdminPill,
  Pill,
  PillCreate,
  PillUpdate,
  AnalyticsOverview,
  AnalyticsPageStat,
  AnalyticsPageDetail,
  UtmPreset,
  UtmPresetCreate,
  UtmPresetUpdate,
} from '@civicpress/shared';

const API = '/v1';

export interface TrashPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  deletedAt: string;
  purgeAt: string;
  daysRemaining: number;
  authorName: string | null;
  primaryCategory: { id: string; name: string; slug: string; color: string | null } | null;
}

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

  getArticleReferences(ids: string[]) {
    const params = new HttpParams().set('ids', ids.join(','));
    return this.http.get<{
      posts: Array<{ id: string; title: string; href: string; imageUrl: string | null }>;
    }>(`${API}/admin/posts/references`, { params });
  }

  createPost(data: PostCreate) {
    return this.http.post<Record<string, unknown>>(`${API}/posts`, data);
  }

  createPostFromVideo(data: { title: string; videoUrl: string; categoryId: string }) {
    return this.http.post<{ id: string; title: string; slug: string; videoUrl?: string | null }>(
      `${API}/posts/from-video`,
      data,
    );
  }

  updatePost(id: string, data: PostUpdate) {
    return this.http.patch<Record<string, unknown>>(`${API}/posts/${id}`, data);
  }

  previewPost(data: PostPreviewRequest) {
    return this.http.post<PostPreviewToken>(`${API}/admin/posts/preview`, data);
  }

  transitionPost(id: string, action: PostTransition['action'], message?: string) {
    return this.http.post<{ id: string; status: string }>(`${API}/posts/${id}/transition`, {
      action,
      message,
    });
  }

  deletePost(id: string) {
    return this.http.delete<{ ok: boolean }>(`${API}/posts/${id}`);
  }

  getTrash(opts: { page?: number; perPage?: number; search?: string } = {}) {
    let params = new HttpParams();
    if (opts.page) params = params.set('page', opts.page);
    if (opts.perPage) params = params.set('perPage', opts.perPage);
    if (opts.search) params = params.set('search', opts.search);
    return this.http.get<{
      posts: TrashPost[];
      total: number;
      page: number;
      perPage: number;
      retentionDays: number;
    }>(`${API}/posts/trash`, { params });
  }

  restorePost(id: string) {
    return this.http.post<{ id: string; status: string }>(`${API}/posts/${id}/restore`, {});
  }

  permanentDeletePost(id: string) {
    return this.http.delete<{ ok: boolean }>(`${API}/posts/${id}/permanent`);
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

  getAuditLog(opts: { page?: number; entity?: string; mine?: boolean; actorId?: string } = {}) {
    let params = new HttpParams();
    if (opts.page) params = params.set('page', opts.page);
    if (opts.entity) params = params.set('entity', opts.entity);
    if (opts.mine) params = params.set('mine', '1');
    if (opts.actorId) params = params.set('actorId', opts.actorId);
    return this.http.get<{ logs: AuditEntry[]; total: number; page: number; perPage: number }>(
      `${API}/audit`,
      { params },
    );
  }

  getAuthorPostStats() {
    return this.http.get<AuthorPostStats>(`${API}/audit/author-stats`);
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  getUsers(page = 1, perPage = 20) {
    const params = new HttpParams().set('page', page).set('perPage', perPage);
    return this.http.get<{ users: UserSummary[]; total: number; page: number; perPage: number }>(
      `${API}/users`,
      { params },
    );
  }

  getUser(id: string) {
    return this.http.get<UserDetail>(`${API}/users/${id}`);
  }

  createUser(data: UserCreate) {
    return this.http.post<UserDetail & { password: string }>(`${API}/users`, data);
  }

  updateUser(id: string, data: UserUpdate) {
    return this.http.patch<UserSummary>(`${API}/users/${id}`, data);
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

  // ─── Pills ────────────────────────────────────────────────────────────────

  getPills() {
    return this.http.get<AdminPill[]>(`${API}/admin/pills`);
  }

  getPillsForPicker() {
    return this.http.get<Pill[]>(`${API}/admin/pills/picker`);
  }

  createPill(data: PillCreate) {
    return this.http.post<Pill>(`${API}/admin/pills`, data);
  }

  updatePill(id: string, data: PillUpdate) {
    return this.http.patch<Pill>(`${API}/admin/pills/${id}`, data);
  }

  deletePill(id: string) {
    return this.http.delete<{ ok: boolean; id: string }>(`${API}/admin/pills/${id}`);
  }

  detachPillFromPost(pillId: string, postId: string) {
    return this.http.delete<{ ok: boolean }>(`${API}/admin/pills/${pillId}/posts/${postId}`);
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

  // ─── Page layouts ─────────────────────────────────────────────────────────

  getLayouts() {
    return this.http.get<AdminLayouts>(`${API}/admin/layout`);
  }

  saveLayout(page: LayoutPageId, config: PageLayoutConfig) {
    return this.http.put<{ ok: boolean }>(`${API}/admin/layout/${page}`, config);
  }

  pinPostAtFront(data: PinPostAtFront) {
    return this.http.post<{ ok: boolean }>(`${API}/admin/layout/pin-front`, data);
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  getSettings() {
    return this.http.get<AdminSettings>(`${API}/admin/settings`);
  }

  updateSettings(data: SettingsUpdate) {
    return this.http.patch<AdminSettings>(`${API}/admin/settings`, data);
  }

  getTickerBars() {
    return this.http.get<{ bars: TickerBarConfig[] }>(`${API}/admin/ticker-bars`);
  }

  saveTickerBars(bars: TickerBarConfig[]) {
    return this.http.put<{ bars: TickerBarConfig[] }>(`${API}/admin/ticker-bars`, { bars });
  }

  // ─── Notification preferences ─────────────────────────────────────────────

  getMe() {
    return this.http.get<Me>(`${API}/me`);
  }

  updateMe(data: MeUpdate) {
    return this.http.patch<Me>(`${API}/me`, data);
  }

  updateNotificationPrefs(data: NotificationPrefsUpdate) {
    return this.updateMe(data);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  getAnalyticsOverview(from?: string, to?: string, postId?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (postId) params = params.set('postId', postId);
    return this.http.get<AnalyticsOverview>(`${API}/admin/analytics/overview`, { params });
  }

  getAnalyticsArticle(postId: string, from?: string, to?: string) {
    let params = new HttpParams().set('postId', postId);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<AnalyticsOverview>(`${API}/admin/analytics/article`, { params });
  }

  getAnalyticsPages(from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<AnalyticsPageStat[]>(`${API}/admin/analytics/pages`, { params });
  }

  getAnalyticsPageDetail(path: string, from?: string, to?: string) {
    let params = new HttpParams().set('path', path);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<AnalyticsPageDetail>(`${API}/admin/analytics/page`, { params });
  }

  // ─── UTM presets ──────────────────────────────────────────────────────────

  getUtmPresets() {
    return this.http.get<UtmPreset[]>(`${API}/admin/utm-presets`);
  }

  createUtmPreset(data: UtmPresetCreate) {
    return this.http.post<UtmPreset>(`${API}/admin/utm-presets`, data);
  }

  updateUtmPreset(id: string, data: UtmPresetUpdate) {
    return this.http.patch<UtmPreset>(`${API}/admin/utm-presets/${id}`, data);
  }

  deleteUtmPreset(id: string) {
    return this.http.delete<{ ok: boolean; id: string }>(`${API}/admin/utm-presets/${id}`);
  }
}
