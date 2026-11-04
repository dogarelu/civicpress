function youtubeHost(hostname: string): string {
  return hostname.replace(/^www\./, '');
}

function isYoutubeHostname(hostname: string): boolean {
  const host = youtubeHost(hostname);
  return (
    host === 'youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'youtu.be' ||
    host === 'm.youtube.com'
  );
}

function pathSegmentAfter(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const segment = pathname.slice(prefix.length).split('/')[0];
  return segment || null;
}

/** Detect whether a URL points to a YouTube video (watch, embed, live, or youtu.be). */
export function isYoutubeUrl(url: string): boolean {
  try {
    return isYoutubeHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * True for YouTube Live URLs: /live/VIDEO_ID, /channel/UC…/live,
 * or embed/live_stream?channel=…
 */
export function isYoutubeLivestreamUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!isYoutubeHostname(u.hostname)) return false;
    const path = u.pathname.replace(/\/+$/, '') || '/';
    if (path.startsWith('/live/')) return true;
    if (path === '/embed/live_stream' || path.startsWith('/embed/live_stream/')) return true;
    if (path.endsWith('/live')) return true;
    return false;
  } catch {
    return false;
  }
}

/** Extract a YouTube video id from watch / embed / shorts / live / youtu.be URLs. */
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = youtubeHost(u.hostname);
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id || null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
      if (u.pathname.startsWith('/embed/')) {
        const id = u.pathname.slice('/embed/'.length).split('/')[0];
        if (!id || id === 'live_stream') return null;
        return id;
      }
      if (u.pathname.startsWith('/live/')) {
        return pathSegmentAfter(u.pathname, '/live/');
      }
      const v = u.searchParams.get('v');
      if (v) return v;
      const shortsMatch = u.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shortsMatch) return shortsMatch[1];
    }
  } catch {
    // fall through
  }
  return null;
}

/** Best-effort YouTube poster URL (hqdefault). Null when not a YouTube URL. */
export function youtubeThumbnailUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
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

/** Convert YouTube watch / short / live URLs to embed URLs for iframe playback. */
export function toYoutubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = youtubeHost(u.hostname);

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
      if (u.pathname.startsWith('/embed/live_stream')) {
        const channel = u.searchParams.get('channel');
        return channel
          ? `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channel)}`
          : url;
      }
      if (u.pathname.startsWith('/embed/')) return url;

      const liveId = pathSegmentAfter(u.pathname, '/live/');
      if (liveId) return `https://www.youtube.com/embed/${liveId}`;

      const channelLive = u.pathname.match(/^\/channel\/([^/]+)\/live\/?$/);
      if (channelLive) {
        return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelLive[1])}`;
      }

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

/** True when a module should render a media frame (hero image and/or video). */
export function hasModuleMedia(post: {
  heroImage?: { url?: string } | null;
  videoUrl?: string | null;
}): boolean {
  return !!post.heroImage || !!post.videoUrl?.trim();
}

/** Poster for module video UI: hero image first, then YouTube thumbnail. */
export function moduleMediaPosterUrl(post: {
  heroImage?: { url?: string } | null;
  videoUrl?: string | null;
}): string | null {
  if (post.heroImage?.url) return post.heroImage.url;
  if (post.videoUrl) return youtubeThumbnailUrl(post.videoUrl);
  return null;
}
