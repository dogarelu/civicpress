import { Injectable, Logger } from '@nestjs/common';
import type { ExchangeRate, ExchangeRatesResponse } from '@civicpress/shared';

const BNR_URL = 'https://curs.bnr.ro/nbrfxrates.xml';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — BNR publishes once daily

/** Top 10 currencies shown in the header ticker, in display order. */
const TOP_CURRENCIES: { code: string; name: string }[] = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'Dolar american' },
  { code: 'GBP', name: 'Lira sterlină' },
  { code: 'CHF', name: 'Franc elvețian' },
  { code: 'JPY', name: 'Yen japonez' },
  { code: 'CAD', name: 'Dolar canadian' },
  { code: 'AUD', name: 'Dolar australian' },
  { code: 'SEK', name: 'Coroană suedeză' },
  { code: 'NOK', name: 'Coroană norvegiană' },
  { code: 'DKK', name: 'Coroană daneză' },
];

type CacheEntry = { data: ExchangeRatesResponse; expiresAt: number };

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private cache: CacheEntry | null = null;

  async getRates(): Promise<ExchangeRatesResponse> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }

    try {
      const data = await this.fetchFromBnr();
      this.cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
      return data;
    } catch (err) {
      this.logger.warn(`Failed to fetch BNR rates: ${err}`);
      if (this.cache) return this.cache.data;
      return { publishedAt: new Date().toISOString().slice(0, 10), rates: [] };
    }
  }

  private async fetchFromBnr(): Promise<ExchangeRatesResponse> {
    const res = await fetch(BNR_URL, {
      headers: { Accept: 'application/xml, text/xml' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`BNR HTTP ${res.status}`);

    const xml = await res.text();
    return this.parseBnrXml(xml);
  }

  private parseBnrXml(xml: string): ExchangeRatesResponse {
    const dateMatch = xml.match(/<PublishingDate>([^<]+)<\/PublishingDate>/);
    const publishedAt = dateMatch?.[1]?.trim() ?? new Date().toISOString().slice(0, 10);

    const rateMap = new Map<string, { rate: number; multiplier: number }>();
    const rateRegex = /<Rate\s+currency="([^"]+)"(?:\s+multiplier="(\d+)")?\s*>([^<]+)<\/Rate>/g;
    let match: RegExpExecArray | null;
    while ((match = rateRegex.exec(xml)) !== null) {
      const currency = match[1];
      const multiplier = match[2] ? parseInt(match[2], 10) : 1;
      const rate = parseFloat(match[3]);
      if (!Number.isNaN(rate)) {
        rateMap.set(currency, { rate, multiplier });
      }
    }

    const rates: ExchangeRate[] = TOP_CURRENCIES.flatMap(({ code, name }) => {
      const entry = rateMap.get(code);
      if (!entry) return [];
      return [{ currency: code, name, rate: entry.rate, multiplier: entry.multiplier }];
    });

    return { publishedAt, rates };
  }
}
