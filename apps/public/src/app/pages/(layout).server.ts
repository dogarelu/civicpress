import type { PublicSettings, MenuItem, ExchangeRatesResponse } from '@civicpress/shared';

const BACKEND = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export const load = async ({
  fetch,
}: {
  fetch: typeof $fetch;
  params: Record<string, string>;
  event: unknown;
}) => {
  const [settings, menu, exchangeRates] = await Promise.all([
    fetch<PublicSettings>(`${BACKEND}/v1/settings/public`),
    fetch<MenuItem[]>(`${BACKEND}/v1/menu`),
    fetch<ExchangeRatesResponse>(`${BACKEND}/v1/exchange-rates`).catch(() => ({
      publishedAt: new Date().toISOString().slice(0, 10),
      rates: [],
    })),
  ]);
  return { settings, menu, exchangeRates };
};
