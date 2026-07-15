import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, of } from 'rxjs';
import type { Me } from '@civicpress/shared';

@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  private http = inject(HttpClient);
  private _me = signal<Me | null>(null);
  private _checked = signal(false);

  isAdmin = computed(() => this._me()?.role === 'ADMIN');

  async hydrate(): Promise<void> {
    if (this._checked()) return;
    this._checked.set(true);
    const me = await firstValueFrom(
      this.http.get<Me>('/v1/me', { withCredentials: true }).pipe(catchError(() => of(null))),
    );
    this._me.set(me);
  }
}
