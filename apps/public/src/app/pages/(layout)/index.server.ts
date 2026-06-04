import type { HomeResponse, LayoutPublic } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({
  fetch,
}: {
  fetch: typeof $fetch;
  params: Record<string, string>;
  event: unknown;
}) => {
  const [home, layout] = await Promise.all([
    fetch<HomeResponse>(`${BACKEND}/v1/home`),
    fetch<LayoutPublic>(`${BACKEND}/v1/layout/public`),
  ]);
  return { home, layout };
};
