import type { PublicSettings } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({
  fetch,
}: {
  fetch: typeof $fetch;
  params: Record<string, string>;
  event: unknown;
}) => {
  const settings = await fetch<PublicSettings>(`${BACKEND}/v1/settings/public`);
  return { contentHtml: settings.termsPageHtml ?? '' };
};
