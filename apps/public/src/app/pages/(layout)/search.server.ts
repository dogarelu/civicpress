import { getQuery } from 'h3';
import type { H3Event } from 'h3';
import type { SearchResponse } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({ fetch, event }: { fetch: typeof $fetch; event: H3Event }) => {
  const { q = '', page = '1', perPage = '15' } = getQuery(event);
  const query = typeof q === 'string' ? q : Array.isArray(q) ? String(q[0] ?? '') : '';
  const pageStr = typeof page === 'string' ? page : '1';
  const perPageStr = typeof perPage === 'string' ? perPage : '15';

  const params = new URLSearchParams({
    q: query,
    page: pageStr,
    perPage: perPageStr,
  });

  try {
    const results = await fetch<SearchResponse>(`${BACKEND}/v1/search?${params.toString()}`);
    return { results };
  } catch {
    return {
      results: {
        query,
        posts: [],
        total: 0,
        page: parseInt(pageStr, 10) || 1,
        perPage: parseInt(perPageStr, 10) || 15,
      } satisfies SearchResponse,
    };
  }
};
