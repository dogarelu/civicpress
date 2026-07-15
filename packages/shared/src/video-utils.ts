/** Detect whether a URL points to a YouTube video (watch, embed, or youtu.be). */
export function isYoutubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    return (
      host === 'youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'youtu.be' ||
      host === 'm.youtube.com'
    );
  } catch {
    return false;
  }
}

/** Detect self-hosted MP4 or other direct video file URLs. */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  if (isYoutubeUrl(url)) return false;
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return path.endsWith('.mp4') || path.endsWith('.webm') || path.includes('/v1/media/');
  } catch {
    return url.toLowerCase().endsWith('.mp4');
  }
}

/** Convert YouTube watch/short URLs to embed URLs for iframe playback. */
export function toYoutubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
      if (u.pathname.startsWith('/embed/')) return url;
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const shortsMatch = u.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    }
  } catch {
    // fall through
  }
  return url;
}

/** Resolve the best playback URL for a stored videoUrl value. */
export function resolveVideoPlaybackUrl(url: string): { type: 'youtube' | 'direct'; src: string } {
  if (isYoutubeUrl(url)) {
    return { type: 'youtube', src: toYoutubeEmbedUrl(url) };
  }
  return { type: 'direct', src: url };
}
