import type { z } from 'zod';

export interface ApiClientOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, defaultHeaders = {} } = options;

  async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...defaultHeaders,
        ...(init?.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ApiError(response.status, response.statusText, body);
    }

    const json = await response.json();
    return schema.parse(json);
  }

  return { request };
}

export type ApiClient = ReturnType<typeof createApiClient>;
