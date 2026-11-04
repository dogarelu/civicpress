import { getQuery } from 'h3';
import type { H3Event } from 'h3';
import type { CategoryDetail } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({
  fetch,
  params,
  event,
}: {
  fetch: typeof $fetch;
  params: Record<string, string>;
  event: H3Event;
}) => {
  const slug = params['slug'] ?? '';
  const { page = '1', perPage: perPageQuery } = getQuery(event);
  const perPage = slug === 'video' ? (perPageQuery ?? '16') : (perPageQuery ?? '15');
  try {
    const category = await fetch<CategoryDetail>(
      `${BACKEND}/v1/categories/${slug}?page=${page}&perPage=${perPage}`,
    );
    return { category };
  } catch {
    return { category: null };
  }
};
