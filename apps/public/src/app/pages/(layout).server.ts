import type { PublicSettings, MenuItem, LayoutPublic } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({
  fetch,
}: {
  fetch: typeof $fetch;
  params: Record<string, string>;
  event: unknown;
}) => {
  const [settings, menu, layout] = await Promise.all([
    fetch<PublicSettings>(`${BACKEND}/v1/settings/public`),
    fetch<MenuItem[]>(`${BACKEND}/v1/menu`),
    fetch<LayoutPublic>(`${BACKEND}/v1/layout/public`),
  ]);
  return { settings, menu, layout };
};
