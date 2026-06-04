import { createError } from 'h3';
import type { PostDetail } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({
  fetch,
  params,
}: {
  fetch: typeof $fetch;
  params: Record<string, string>;
  event: unknown;
}) => {
  const slug = params['slug'] ?? '';
  try {
    const post = await fetch<PostDetail>(`${BACKEND}/v1/posts/${slug}`);
    return { post };
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Articolul nu a fost găsit' });
  }
};
