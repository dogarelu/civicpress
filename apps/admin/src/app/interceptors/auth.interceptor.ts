import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, firstValueFrom, from, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../services/auth.store';

const API = '/v1';

let refreshInFlight: Promise<boolean> | null = null;

function shouldSkipRefresh(url: string): boolean {
  return (
    url.includes(`${API}/auth/login`) ||
    url.includes(`${API}/auth/refresh`) ||
    url.includes(`${API}/auth/logout`)
  );
}

function refreshSession(http: HttpClient, auth: AuthStore): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = firstValueFrom(
      http.post(`${API}/auth/refresh`, {}, { withCredentials: true }),
    )
      .then(() => true)
      .catch(() => {
        auth.clear();
        return false;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const backend = inject(HttpBackend);
  const authHttp = new HttpClient(backend);
  const auth = inject(AuthStore);

  const authedReq = req.clone({ withCredentials: true });

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      if (shouldSkipRefresh(req.url)) {
        return throwError(() => err);
      }

      return from(refreshSession(authHttp, auth)).pipe(
        switchMap((ok) => {
          if (!ok) return throwError(() => err);
          return next(authedReq);
        }),
      );
    }),
  );
};
