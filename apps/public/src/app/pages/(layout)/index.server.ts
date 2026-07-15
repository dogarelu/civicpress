import type { HomeResponse } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({
  fetch,
}: {
  fetch: typeof $fetch;
  params: Record<string, string>;
  event: unknown;
}) => {
  const home = await fetch<HomeResponse>(`${BACKEND}/v1/home`);
  return { home };
};
