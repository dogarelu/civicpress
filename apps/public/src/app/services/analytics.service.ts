import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import type { AnalyticsBeacon, AnalyticsPageType } from '@civicpress/shared';

const API_BASE = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000';

const SESSION_KEY = 'cp_analytics_session';
const VISITOR_KEY = 'cp_analytics_visitor';
const VISITOR_COOKIE = 'cp_vid';
const VISITOR_MAX_AGE_SEC = 365 * 24 * 60 * 60;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min inactivity → new session
const IDLE_CAP_MS = 5 * 60 * 1000; // stop accruing after 5 min idle
const HEARTBEAT_MS = 15_000;

interface StoredSession {
  id: string;
  lastActivityAt: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private router = inject(Router);

  private started = false;
  private sessionId = '';
  private visitorId = '';
  private pageViewId = '';
  private path = '';
  private pageType: AnalyticsPageType = 'other';
  private title = '';
  private utm: string | null = null;

  private activeMs = 0;
  private segmentStartedAt: number | null = null;
  private lastActivityAt = 0;
  private idle = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private readonly onVisibility = () => this.handleVisibility();
  private readonly onActivity = () => this.markActivity();
  private readonly onPageHide = () => this.flush('end');

  /** Call once from the public layout (browser only). */
  start() {
    if (!isPlatformBrowser(this.platformId) || this.started) return;
    this.started = true;

    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
    this.utm = this.readUtmFromLocation();
    this.lastActivityAt = Date.now();

    this.document.addEventListener('visibilitychange', this.onVisibility);
    this.document.defaultView?.addEventListener('pagehide', this.onPageHide);
    for (const evt of ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const) {
      this.document.addEventListener(evt, this.onActivity, { passive: true });
    }

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.onNavigate(e.urlAfterRedirects));

    // Initial page
    this.onNavigate(this.router.url);

    this.heartbeatTimer = setInterval(() => this.flush('heartbeat'), HEARTBEAT_MS);
  }

  stop() {
    if (!this.started) return;
    this.flush('end');
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.document.removeEventListener('visibilitychange', this.onVisibility);
    this.document.defaultView?.removeEventListener('pagehide', this.onPageHide);
    for (const evt of ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const) {
      this.document.removeEventListener(evt, this.onActivity);
    }
    this.started = false;
  }

  private onNavigate(url: string) {
    const nextPath = this.normalizePath(url);
    if (nextPath.startsWith('/preview')) return;

    if (this.pageViewId) {
      this.flush('end');
    }

    if (!this.visitorId) this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
    const path = nextPath;
    this.path = path;
    this.pageType = this.detectPageType(path);
    this.title = this.document.title || path;
    this.pageViewId = this.randomId();
    this.activeMs = 0;
    this.idle = false;
    this.lastActivityAt = Date.now();

    // Capture UTM only from the landing URL (first-touch handled server-side too)
    if (!this.utm) {
      this.utm = this.readUtmFromLocation();
    }

    this.segmentStartedAt = this.document.visibilityState === 'visible' ? Date.now() : null;

    this.send({
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      pageViewId: this.pageViewId,
      path: this.path,
      pageType: this.pageType,
      title: this.title,
      durationMs: 0,
      event: 'start',
      utm: this.utm,
    });
  }

  private handleVisibility() {
    if (this.document.visibilityState === 'hidden') {
      this.pauseSegment();
      this.flush('heartbeat');
    } else {
      this.idle = false;
      this.lastActivityAt = Date.now();
      this.resumeSegment();
    }
  }

  private markActivity() {
    const now = Date.now();
    // Refresh session TTL
    this.touchSession();

    if (this.idle) {
      this.idle = false;
      this.resumeSegment();
    } else if (this.segmentStartedAt !== null && now - this.lastActivityAt >= IDLE_CAP_MS) {
      // Was idle past cap without visibility flip — close segment without counting idle gap
      this.pauseSegment();
      this.resumeSegment();
    }
    this.lastActivityAt = now;
  }

  private pauseSegment() {
    if (this.segmentStartedAt === null) return;
    const now = Date.now();
    const elapsed = Math.min(now - this.segmentStartedAt, IDLE_CAP_MS);
    // If last activity was long ago, only count up to idle cap from segment start / last activity
    const sinceActivity = now - this.lastActivityAt;
    if (sinceActivity >= IDLE_CAP_MS) {
      const capped = Math.min(
        elapsed,
        Math.max(0, this.lastActivityAt + IDLE_CAP_MS - this.segmentStartedAt),
      );
      this.activeMs += Math.max(0, capped);
    } else {
      this.activeMs += Math.max(0, elapsed);
    }
    this.segmentStartedAt = null;
  }

  private resumeSegment() {
    if (this.document.visibilityState !== 'visible') return;
    if (this.idle) return;
    if (this.segmentStartedAt !== null) return;
    this.segmentStartedAt = Date.now();
  }

  private currentDuration(): number {
    let ms = this.activeMs;
    if (this.segmentStartedAt !== null) {
      const now = Date.now();
      if (now - this.lastActivityAt >= IDLE_CAP_MS) {
        this.idle = true;
        const capped = Math.max(0, this.lastActivityAt + IDLE_CAP_MS - this.segmentStartedAt);
        ms += capped;
        this.activeMs = ms;
        this.segmentStartedAt = null;
      } else {
        ms += now - this.segmentStartedAt;
      }
    }
    return Math.max(0, Math.round(ms));
  }

  private flush(event: 'heartbeat' | 'end') {
    if (!this.pageViewId || !this.path) return;
    if (event === 'end') this.pauseSegment();

    this.send({
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      pageViewId: this.pageViewId,
      path: this.path,
      pageType: this.pageType,
      title: this.document.title || this.title,
      durationMs: this.currentDuration(),
      event,
      utm: this.utm,
    });
  }

  private send(payload: AnalyticsBeacon) {
    const url = `${API_BASE}/v1/analytics/beacon`;
    const body = JSON.stringify(payload);
    try {
      if (payload.event === 'end' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: payload.event === 'end',
        credentials: 'omit',
      }).catch(() => {});
    } catch {
      // never break the site for analytics
    }
  }

  private getOrCreateVisitorId(): string {
    const existing = this.readVisitorId();
    if (existing) {
      this.persistVisitorId(existing);
      return existing;
    }
    const id = this.randomId();
    this.persistVisitorId(id);
    return id;
  }

  private readVisitorId(): string | null {
    try {
      const fromStore = localStorage.getItem(VISITOR_KEY);
      if (fromStore && fromStore.length >= 8) return fromStore;
    } catch {
      /* ignore */
    }
    const fromCookie = this.readCookie(VISITOR_COOKIE);
    if (fromCookie && fromCookie.length >= 8) return fromCookie;
    return null;
  }

  private persistVisitorId(id: string) {
    try {
      localStorage.setItem(VISITOR_KEY, id);
    } catch {
      /* ignore */
    }
    this.writeCookie(VISITOR_COOKIE, id, VISITOR_MAX_AGE_SEC);
  }

  private readCookie(name: string): string | null {
    try {
      const parts = this.document.cookie.split(';');
      for (const part of parts) {
        const [key, ...rest] = part.trim().split('=');
        if (key === name) return decodeURIComponent(rest.join('='));
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  private writeCookie(name: string, value: string, maxAgeSec: number) {
    try {
      const secure = this.document.defaultView?.location.protocol === 'https:' ? '; Secure' : '';
      this.document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
    } catch {
      /* ignore */
    }
  }

  private getOrCreateSessionId(): string {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredSession;
        if (stored.id && Date.now() - stored.lastActivityAt < SESSION_TTL_MS) {
          stored.lastActivityAt = Date.now();
          localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
          return stored.id;
        }
      }
    } catch {
      /* ignore */
    }
    const id = this.randomId();
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ id, lastActivityAt: Date.now() } satisfies StoredSession),
      );
    } catch {
      /* ignore */
    }
    // New session → allow capturing UTM again from current URL
    this.utm = this.readUtmFromLocation();
    return id;
  }

  private touchSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredSession;
      stored.lastActivityAt = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
  }

  private readUtmFromLocation(): string | null {
    try {
      const params = new URLSearchParams(this.document.defaultView?.location.search ?? '');
      const value = (params.get('utm') || '').trim();
      if (!value || value.length > 80) return null;
      if (!/^[a-zA-Z0-9._-]+$/.test(value)) return null;
      return value;
    } catch {
      return null;
    }
  }

  private normalizePath(url: string): string {
    try {
      const u = url.startsWith('http') ? new URL(url) : new URL(url, 'http://local');
      let p = u.pathname || '/';
      if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
      return p || '/';
    } catch {
      return '/';
    }
  }

  private detectPageType(path: string): AnalyticsPageType {
    if (path === '/' || path === '') return 'home';
    if (path === '/search') return 'search';
    if (path === '/contact') return 'contact';
    if (path.startsWith('/video/')) return 'video';
    if (path.startsWith('/category/')) return 'category';
    if (path === '/cookies' || path === '/pp' || path === '/tc') return 'other';
    // Article slug (single segment)
    if (/^\/[^/]+$/.test(path)) return 'article';
    return 'other';
  }

  private randomId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `pv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
