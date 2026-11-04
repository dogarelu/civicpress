import { getQuery } from 'h3';
import type { H3Event } from 'h3';
import type { PostDetail } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

function readToken(event: H3Event): string {
  const query = getQuery(event);
  const raw = query['token'];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();

  const url = event.node?.req?.url;
  if (!url) return '';
  try {
    return new URL(url, 'http://localhost').searchParams.get('token')?.trim() ?? '';
  } catch {
    return '';
  }
}

export const load = async ({ fetch, event }: { fetch: typeof $fetch; event: H3Event }) => {
  const token = readToken(event);
  if (!token) {
    return { post: null as PostDetail | null, error: 'missing' as const };
  }

  try {
    const post = await fetch<PostDetail>(`${BACKEND}/v1/preview/article/${token}`, {
      timeout: 4000,
    });
    return { post, error: null };
  } catch {
    return { post: null as PostDetail | null, error: null };
  }
};
