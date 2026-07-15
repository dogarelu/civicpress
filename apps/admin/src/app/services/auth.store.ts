import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Me } from '@civicpress/shared';

const API = '/v1';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private _user = signal<Me | null>(null);
  private _loading = signal(false);

  user = this._user.asReadonly();
  loading = this._loading.asReadonly();
  isLoggedIn = computed(() => this._user() !== null);
  isEditor = computed(() => {
    const role = this._user()?.role;
    return role === 'EDITOR' || role === 'ADMIN';
  });
  isAdmin = computed(() => this._user()?.role === 'ADMIN');

  constructor(private http: HttpClient) {}

  async hydrate(): Promise<Me | null> {
    if (this._user()) return this._user();
    this._loading.set(true);
    try {
      const me = await firstValueFrom(this.http.get<Me>(`${API}/me`));
      this._user.set(me);
      return me;
    } catch {
      this._user.set(null);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  async login(email: string, password: string): Promise<Me> {
    const me = await firstValueFrom(this.http.post<Me>(`${API}/auth/login`, { email, password }));
    this._user.set(me);
    return me;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post(`${API}/auth/logout`, {})).catch(() => {});
    this._user.set(null);
  }

  clear() {
    this._user.set(null);
  }

  patchUser(partial: Partial<Me>) {
    const current = this._user();
    if (current) this._user.set({ ...current, ...partial });
  }
}
