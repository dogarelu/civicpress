function trimSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function configuredPublicSiteUrl(): string {
  return trimSlash((import.meta.env.VITE_PUBLIC_SITE_URL || '').trim());
}

function isStandaloneAdminPort(port: string): boolean {
  return port !== '' && port !== '80' && port !== '443';
}

/** Canonical public origin for share links (baked at build time when configured). */
export function resolvePublicSiteUrl(): string {
  const configured = configuredPublicSiteUrl();
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    if (port === '4300') return `${protocol}//${hostname}:4200`;
    return origin;
  }
  return 'http://localhost:4200';
}

/**
 * Origin for the live article preview iframe.
 * Must match the admin page origin: nginx sends X-Frame-Options: SAMEORIGIN,
 * so a hardcoded apex URL (civicpress.ro) is blocked when the editor is on www
 * or another host — Chrome shows “refused to connect” with the sad-document icon.
 * Local vite admin (port 4300) maps to the public app on 4200.
 */
export function resolvePreviewBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    if (isStandaloneAdminPort(port)) return `${protocol}//${hostname}:4200`;
    return origin;
  }
  return resolvePublicSiteUrl();
}

export function resolvePreviewArticleUrl(token: string): string {
  return `${resolvePreviewBaseUrl()}/preview/article?token=${encodeURIComponent(token)}`;
}
