// lib/automation/tlsClient.ts
// Browser-grade HTTP client using got-scraping.
// got-scraping impersonates Chrome's TLS fingerprint (JA3/JA4) and HTTP/2 settings,
// allowing direct API calls without launching a browser — DataDome cannot distinguish
// these requests from real Chrome traffic.

let _gotScraping: any = null;
async function getGotScraping() {
  if (!_gotScraping) {
    const mod: any = await import('got-scraping');
    _gotScraping = mod.gotScraping || mod.default || mod;
  }
  return _gotScraping;
}
import { STEALTH_USER_AGENT, STEALTH_CH_UA_HEADERS } from './stealthPatches';
import { getHealthyProxy } from './proxyHealth';

export interface TlsRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  json?: Record<string, any>;
  cookies?: Record<string, string>;
  proxyUrl?: string;
  timeoutMs?: number;
}

export interface TlsResponse {
  ok: boolean;
  status: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
  json<T = unknown>(): T;
}

/**
 * Builds a proxy URL string from environment variables.
 */
function getEnvProxyUrl(): string | undefined {
  const poolStr = process.env.PROXY_POOL || '';
  const fallback = process.env.RESIDENTIAL_PROXY_URL || '';
  const first = poolStr.split(',').map((s) => s.trim()).filter(Boolean)[0];
  return first || fallback || undefined;
}

/**
 * Formats cookies object into a Cookie header string.
 */
function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Makes an HTTP request with Chrome-grade TLS fingerprint impersonation.
 *
 * Features:
 * - TLS ClientHello matches Chrome 133 (JA3/JA4 fingerprint via got-scraping)
 * - Sends proper sec-ch-ua client hints matching Chrome 133
 * - Supports residential proxy routing
 * - DataDome datadome cookie can be injected via cookies option
 *
 * Usage:
 *   const res = await tlsFetch('https://shop.garena.my/api/...', {
 *     cookies: { datadome: 'xxx...' },
 *   });
 */
export async function tlsFetch(url: string, options: TlsRequestOptions = {}): Promise<TlsResponse> {
  const {
    method = 'GET',
    headers = {},
    body,
    json,
    cookies = {},
    proxyUrl,
    timeoutMs = 20000,
  } = options;

  const proxyUrlResolved = proxyUrl !== undefined ? proxyUrl : ((await getHealthyProxy().catch(() => null)) || undefined);

  // Build merged headers (stealth headers + caller overrides)
  const mergedHeaders: Record<string, string> = {
    ...STEALTH_CH_UA_HEADERS,
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-encoding': 'gzip, deflate, br',
    'cache-control': 'max-age=0',
    'upgrade-insecure-requests': '1',
    ...headers,
  };

  if (Object.keys(cookies).length > 0) {
    const existing = mergedHeaders['cookie'] || mergedHeaders['Cookie'] || '';
    const cookieStr = buildCookieHeader(cookies);
    mergedHeaders['cookie'] = existing ? `${existing}; ${cookieStr}` : cookieStr;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gotOptions: Record<string, any> = {
    method,
    headers: mergedHeaders,
    proxyUrl: proxyUrlResolved,   // got-scraping extension — not in base OptionsOfTextResponseBody
    timeout: { request: timeoutMs },
    throwHttpErrors: false,
    followRedirect: true,
    // got-scraping automatically rotates TLS fingerprints to match Chrome
  };

  if (json) {
    gotOptions['json'] = json;
  } else if (body) {
    gotOptions['body'] = body;
  }

  const scraper = await getGotScraping();
  const response = await scraper(url, gotOptions);

  const responseBody = response.body as string;

  return {
    ok: response.statusCode >= 200 && response.statusCode < 300,
    status: response.statusCode,
    body: responseBody,
    headers: response.headers as Record<string, string | string[] | undefined>,
    json<T = unknown>(): T {
      return JSON.parse(responseBody) as T;
    },
  };
}

/**
 * Convenience: GET request with DataDome cookie pre-injected.
 * Automatically loads cookie from the cache if not explicitly provided.
 */
export async function tlsGet(
  url: string,
  extraCookies: Record<string, string> = {},
  extraHeaders: Record<string, string> = {}
): Promise<TlsResponse> {
  return tlsFetch(url, {
    method: 'GET',
    cookies: extraCookies,
    headers: extraHeaders,
  });
}

/**
 * Convenience: POST request with JSON body and DataDome cookie.
 */
export async function tlsPost(
  url: string,
  jsonBody: Record<string, any>,
  extraCookies: Record<string, string> = {}
): Promise<TlsResponse> {
  return tlsFetch(url, {
    method: 'POST',
    json: jsonBody,
    cookies: extraCookies,
    headers: { 'content-type': 'application/json' },
  });
}
