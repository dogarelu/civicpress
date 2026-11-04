import type { PublicSettings, MenuItem, PublicTickerBarsResponse } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({
  fetch,
}: {
  fetch: typeof $fetch;
  params: Record<string, string>;
  event: unknown;
}) => {
  const [settings, menu, mobileMenu, mobileRow, tickerBars] = await Promise.all([
    fetch<PublicSettings>(`${BACKEND}/v1/settings/public`),
    fetch<MenuItem[]>(`${BACKEND}/v1/menu`),
    fetch<MenuItem[]>(`${BACKEND}/v1/menu?variant=mobile`),
    fetch<MenuItem[]>(`${BACKEND}/v1/menu?variant=mobile-row`),
    fetch<PublicTickerBarsResponse>(`${BACKEND}/v1/ticker-bars`).catch(() => ({ bars: [] })),
  ]);
  return { settings, menu, mobileMenu, mobileRow, tickerBars };
};
