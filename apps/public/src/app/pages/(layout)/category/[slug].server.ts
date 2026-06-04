import { createError, getQuery } from 'h3';
import type { H3Event } from 'h3';
import type { CategoryDetail, LayoutPublic } from '@civicpress/shared';

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
  const { page = '1', perPage = '15' } = getQuery(event);
  try {
    const [category, layout] = await Promise.all([
      fetch<CategoryDetail>(`${BACKEND}/v1/categories/${slug}?page=${page}&perPage=${perPage}`),
      fetch<LayoutPublic>(`${BACKEND}/v1/layout/public`),
    ]);
    return { category, layout };
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Categoria nu a fost găsită' });
  }
};
