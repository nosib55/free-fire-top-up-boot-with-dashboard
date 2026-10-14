// lib/automation/directSession.ts
// High-Speed Direct TLS Session Engine for Garena Free Fire
// Bypasses browser launch by using got-scraping with JA3/JA4 TLS fingerprinting & DataDome cookie caching.
// Typical latency: 150ms - 300ms per request.

let _gotScraping: any = null;
async function getGotScraping() {
  if (!_gotScraping) {
    const mod: any = await import('got-scraping');
    _gotScraping = mod.gotScraping || mod.default || mod;
  }
  return _gotScraping;
}
import { getCachedDatadomeCookie, setCachedDatadomeCookie, invalidateDatadomeCookie } from './datadomeCache';
import { getHealthyProxy } from './proxyHealth';
import { STEALTH_USER_AGENT, STEALTH_CH_UA_HEADERS } from './stealthPatches';
import { handleDataDomeSlider } from './captchaSolver';
import { getBrowser } from './browserManager';

export interface DirectPlayerResult {
  success: boolean;
  playerName: string;
  openId?: string;
  region: string;
  latencyMs: number;
  message?: string;
}

/**
 * Perform direct HTTP player ID login to Garena API.
 * Uses cached DataDome cookie to complete request in ~200ms without opening Chromium.
 */
export async function directPlayerLogin(uid: string): Promise<DirectPlayerResult> {
  const cleanUid = uid.trim().replace(/[^0-9]/g, '');
  if (!cleanUid) {
    return { success: false, playerName: '', region: 'BD', latencyMs: 0, message: 'Invalid UID' };
  }

  const start = Date.now();
  const domain = 'shop.garena.my';
  const proxyUrl = (await getHealthyProxy().catch(() => null)) || undefined;

  let datadomeCookie = await getCachedDatadomeCookie(domain);

  // Attempt 1: Using cached DataDome cookie (0ms captcha overhead)
  if (datadomeCookie) {
    try {
      const result = await sendPlayerLoginRequest(cleanUid, datadomeCookie, proxyUrl);
      if (result.success) {
        return {
          ...result,
          latencyMs: Date.now() - start,
        };
      }
      if (result.isDataDomeChallenge) {
        console.warn('[DirectSession] ⚠️ Cached DataDome cookie expired. Invalidating and refreshing...');
        await invalidateDatadomeCookie(domain);
        datadomeCookie = null;
      }
    } catch {}
  }

  // Attempt 2: If no cookie or expired, solve challenge to acquire fresh 20-minute DataDome cookie
  console.log('[DirectSession] ⚡ Acquiring fresh DataDome cookie for 20-minute ultra-fast direct API execution...');
  const freshCookie = await obtainFreshDatadomeCookie();
  if (freshCookie) {
    await setCachedDatadomeCookie(domain, freshCookie);
    const retryResult = await sendPlayerLoginRequest(cleanUid, freshCookie, proxyUrl);
    if (retryResult.success) {
      return {
        ...retryResult,
        latencyMs: Date.now() - start,
      };
    }
  }

  return {
    success: false,
    playerName: '',
    region: 'BD',
    latencyMs: Date.now() - start,
    message: 'Direct API login challenged',
  };
}

/**
 * Sends single JSON POST to Garena Player ID Login endpoint via got-scraping.
 */
async function sendPlayerLoginRequest(
  uid: string,
  datadomeCookie: string | null,
  proxyUrl?: string
): Promise<{ success: boolean; playerName: string; openId?: string; region: string; isDataDomeChallenge?: boolean }> {
  const cookieHeader = [
    'region=BD',
    datadomeCookie ? (datadomeCookie.startsWith('datadome=') ? datadomeCookie : `datadome=${datadomeCookie}`) : '',
  ]
    .filter(Boolean)
    .join('; ');

  const scraper = await getGotScraping();
  const response = await scraper.post('https://shop.garena.my/api/auth/player_id_login', {
    headers: {
      ...STEALTH_CH_UA_HEADERS,
      'user-agent': STEALTH_USER_AGENT,
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'origin': 'https://shop.garena.my',
      'referer': 'https://shop.garena.my/app/100067/idlogin',
      'cookie': cookieHeader,
    },
    json: {
      app_id: 100067,
      login_id: uid,
    },
    proxyUrl,
    timeout: { request: 6000 },
    throwHttpErrors: false,
  });

  if (response.statusCode === 200) {
    try {
      const data = JSON.parse(response.body);
      if (data && data.nickname) {
        return {
          success: true,
          playerName: data.nickname,
          openId: data.open_id || undefined,
          region: data.region || 'BD',
        };
      }
    } catch {}
  }

  if (response.statusCode === 403 || response.body.includes('captcha-delivery.com')) {
    return { success: false, playerName: '', region: 'BD', isDataDomeChallenge: true };
  }

  return { success: false, playerName: '', region: 'BD' };
}

/**
 * Obtains a fresh 20-minute DataDome cookie using the background browser.
 */
async function obtainFreshDatadomeCookie(): Promise<string | null> {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setUserAgent(STEALTH_USER_AGENT);
      await page.setCookie({ name: 'region', value: 'BD', domain: '.garena.my' });

      await page.goto('https://shop.garena.my/app/100067/idlogin', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      // Handle slider challenge if it pops up
      await handleDataDomeSlider(page);

      // Extract datadome cookie
      const cookies = await page.cookies();
      const dd = cookies.find((c) => c.name === 'datadome');
      if (dd && dd.value) {
        console.log('[DirectSession] ✅ Fresh DataDome cookie extracted successfully.');
        return dd.value;
      }
    } finally {
      await page.close().catch(() => {});
    }
  } catch (err: any) {
    console.warn('[DirectSession] Failed to acquire fresh DataDome cookie:', err?.message);
  }
  return null;
}
