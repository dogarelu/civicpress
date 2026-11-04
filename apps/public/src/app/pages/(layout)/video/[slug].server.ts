import type { H3Event } from 'h3';
import type { PostDetail } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({
  fetch,
  params,
}: {
  fetch: typeof $fetch;
  params: Record<string, string>;
  event: H3Event;
}) => {
  const slug = params['slug'] ?? '';
  try {
    const post = await fetch<PostDetail>(`${BACKEND}/v1/posts/${slug}`);
    if (!post.videoUrl) {
      return { post: null };
    }
    return { post };
  } catch {
    return { post: null };
  }
};
