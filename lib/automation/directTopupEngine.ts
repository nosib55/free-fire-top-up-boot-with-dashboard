// lib/automation/directTopupEngine.ts
// Ultra-Fast Direct TLS API Engine for Free Fire Top-Up (UniPin Voucher)
// Bypasses browser launch by using got-scraping with Chrome JA3/JA4 TLS fingerprinting.
// Target latency: 1.0s - 2.0s without requiring proxies or heavy Chromium instances.

let _gotScraping: any = null;
async function getScrapingClient() {
  if (!_gotScraping) {
    try {
      const mod: any = await import('got-scraping');
      _gotScraping = mod.gotScraping || mod.default || mod;
    } catch {
      _gotScraping = null;
    }
  }
  return _gotScraping;
}
import { STEALTH_USER_AGENT, STEALTH_CH_UA_HEADERS } from './stealthPatches';
import { getCachedDatadomeCookie, setCachedDatadomeCookie, invalidateDatadomeCookie } from './datadomeCache';
import { detectUnipinDenomination } from './unipinPatterns';
import { AutomationResult, UniPinVoucherParams } from './unipinVoucher';

export interface DirectTopupOptions extends UniPinVoucherParams {
  proxyUrl?: string;
  skipBrowserFallback?: boolean;
}

export interface DirectEngineOutcome extends AutomationResult {
  executionMode?: 'DIRECT_TLS_API' | 'BROWSER_FALLBACK';
  latencyMs?: number;
}

/**
 * Execute 2-Second Top-Up directly via HTTP/2 TLS Fingerprinting (Chrome JA3/JA4)
 * No Puppeteer or Chrome browser is launched unless a manual DataDome challenge must be solved.
 */
export async function executeDirectTlsTopup(params: DirectTopupOptions): Promise<DirectEngineOutcome> {
  const startTime = Date.now();
  const { uid, voucherCode, serial: rawSerial, pin: rawPin } = params;

  // 1. Parse Serial and PIN
  const fullText = (voucherCode || `${rawSerial || ''} ${rawPin || ''}`).trim();
  let effectiveSerial = (rawSerial || '').trim();
  let effectivePin = (rawPin || '').trim();

  const sMatch = fullText.match(/((?:BDMB|UPBD)-[A-Z0-9]-S-\d{8})/i);
  if (sMatch) {
    effectiveSerial = sMatch[1].toUpperCase();
    const rest = fullText.replace(sMatch[0], '').trim();
    if (rest) {
      effectivePin = rest.replace(/[^0-9]/g, '');
    }
  } else if (rawSerial && rawSerial.match(/((?:BDMB|UPBD)-[A-Z0-9]-S-\d{8})/i)) {
    effectiveSerial = rawSerial.match(/((?:BDMB|UPBD)-[A-Z0-9]-S-\d{8})/i)![1].toUpperCase();
    effectivePin = (rawPin || '').replace(/[^0-9]/g, '');
  } else {
    effectivePin = effectivePin.replace(/[^0-9]/g, '');
  }

  const cleanCode = (effectiveSerial ? `${effectiveSerial} ${effectivePin}` : fullText).toUpperCase();
  const isBDMB = cleanCode.startsWith('BDMB');
  const isUPBD = cleanCode.startsWith('UPBD');
  const detectedPattern = detectUnipinDenomination(cleanCode) || detectUnipinDenomination(fullText) || detectUnipinDenomination(effectiveSerial);
  const diamondLabel = detectedPattern ? detectedPattern.diamondLabel : '240 Diamonds';
  const voucherType = isBDMB
    ? `UniPin BD Mobile (${diamondLabel})`
    : isUPBD
    ? `UniPin BD Voucher (${diamondLabel})`
    : `UniPin Voucher (${diamondLabel})`;

  // 2. Sandbox voucher check
  const isSandboxVoucher =
    cleanCode.includes('8921-9402') ||
    cleanCode.includes('89219402') ||
    cleanCode.includes('TEST_VOUCHER') ||
    cleanCode.includes('DEMO_') ||
    fullText.includes('DEMO');

  if (isSandboxVoucher) {
    const elapsed = Date.now() - startTime;
    return {
      success: true,
      message: `[DIRECT TLS] Simulated top-up of ${diamondLabel} for Player UID (${uid}) in ${elapsed}ms.`,
      voucherType: `${voucherType} [SANDBOX]`,
      playerName: `Sandbox Player (${uid})`,
      orderId: `TLS_SB_${Date.now()}`,
      executionMode: 'DIRECT_TLS_API',
      latencyMs: elapsed,
    };
  }

  // 3. Instant DB Pre-Check
  try {
    const { isVoucherConsumedOrInvalid } = await import('../services/voucherService');
    const voucherCheck = await isVoucherConsumedOrInvalid(fullText, effectiveSerial, effectivePin);
    if (voucherCheck.isBlocked) {
      return {
        success: false,
        message: 'UniPin Voucher redemption failed: Voucher is invalid, expired, or already used.',
        errorReason: 'INVALID_VOUCHER',
        voucherType,
        playerName: `Player (${uid})`,
        executionMode: 'DIRECT_TLS_API',
        latencyMs: Date.now() - startTime,
      };
    }
  } catch {}

  // 4. Direct TLS Step A: Authenticate UID on Garena API (~200ms)
  const domain = 'shop.garena.my';
  let datadomeCookie = await getCachedDatadomeCookie(domain);

  const cookieHeader = [
    'region=BD',
    'source=pc',
    datadomeCookie ? (datadomeCookie.startsWith('datadome=') ? datadomeCookie : `datadome=${datadomeCookie}`) : '',
  ].filter(Boolean).join('; ');

  let loginData: any = null;
  let sessionCookies: string[] = [];

  try {
    const scraper = await getScrapingClient();
    if (!scraper) throw new Error('TLS Scraper client unavailable');

    const loginRes = await scraper.post('https://shop.garena.my/api/auth/player_id_login', {
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
        login_id: uid.trim(),
      },
      proxyUrl: params.proxyUrl,
      timeout: { request: 5000 },
      throwHttpErrors: false,
    });

    if (loginRes.headers['set-cookie']) {
      const raw = loginRes.headers['set-cookie'];
      sessionCookies = Array.isArray(raw) ? raw : [raw];
    }

    if (loginRes.statusCode === 200) {
      try {
        loginData = JSON.parse(loginRes.body);
      } catch {}
    } else if (loginRes.statusCode === 403 || loginRes.body.includes('captcha-delivery.com')) {
      console.warn('[DirectTopupEngine] ⚠️ DataDome challenge triggered on TLS login.');
      await invalidateDatadomeCookie(domain);
    }
  } catch (err: any) {
    console.warn('[DirectTopupEngine] Direct login network notice:', err?.message);
  }

  // Check if UID is invalid or blocked
  if (!loginData || !loginData.nickname) {
    if (loginData?.error === 'error_player_id_not_exist' || loginData?.message?.includes('not exist')) {
      return {
        success: false,
        errorReason: 'INVALID_UID',
        message: `Invalid Player ID: Free Fire UID '${uid}' does not exist.`,
        voucherType,
        playerName: `Player (${uid})`,
        executionMode: 'DIRECT_TLS_API',
        latencyMs: Date.now() - startTime,
      };
    }

    // If direct login was challenged by DataDome, we return WORKER_ERROR to allow fallback
    return {
      success: false,
      errorReason: 'WORKER_ERROR',
      message: 'Direct TLS Session challenge encountered. Fallback to Browser required.',
      voucherType,
      playerName: `Player (${uid})`,
      executionMode: 'DIRECT_TLS_API',
      latencyMs: Date.now() - startTime,
    };
  }

  const playerName = loginData.nickname;

  // 5. Direct TLS Step B: UniPin Direct Voucher Redemption API
  // UniPin accepts direct redemption via its secure redemption endpoint:
  try {
    const scraper = await getScrapingClient();
    if (!scraper) throw new Error('TLS Scraper client unavailable');

    const unipinDirectRes = await scraper.post('https://checkout.unipin.com/api/v1/voucher/redeem', {
      headers: {
        ...STEALTH_CH_UA_HEADERS,
        'user-agent': STEALTH_USER_AGENT,
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'origin': 'https://checkout.unipin.com',
        'referer': 'https://checkout.unipin.com/',
        'cookie': 'locale=en; country=BD',
      },
      json: {
        serial: effectiveSerial,
        pin: effectivePin,
        uid: uid.trim(),
        app_id: '100067',
        voucher_type: isBDMB ? 'BDMB' : 'UPBD',
      },
      proxyUrl: params.proxyUrl,
      timeout: { request: 5000 },
      throwHttpErrors: false,
    });

    const elapsed = Date.now() - startTime;

    if (unipinDirectRes.statusCode === 200) {
      let respData: any = {};
      try { respData = JSON.parse(unipinDirectRes.body); } catch {}

      if (respData.status === 'SUCCESS' || respData.success === true || unipinDirectRes.body.includes('success')) {
        const orderId = respData.transaction_id || respData.order_id || `TLS_${Date.now()}`;
        return {
          success: true,
          message: `Top-up of ${diamondLabel} completed successfully for ${playerName} in ${elapsed}ms via Direct TLS Engine.`,
          playerName,
          voucherType,
          orderId,
          executionMode: 'DIRECT_TLS_API',
          latencyMs: elapsed,
        };
      } else if (respData.message?.includes('already used') || respData.status === 'USED') {
        return {
          success: false,
          errorReason: 'CONSUMED_VOUCHER',
          message: 'UniPin Voucher is already used / consumed.',
          playerName,
          voucherType,
          executionMode: 'DIRECT_TLS_API',
          latencyMs: elapsed,
        };
      }
    }
  } catch (err: any) {
    console.warn('[DirectTopupEngine] Direct voucher API call notice:', err?.message);
  }

  // 6. If direct unipin HTTP API returned challenge or non-standard format, return WORKER_ERROR to trigger browser worker
  return {
    success: false,
    errorReason: 'WORKER_ERROR',
    message: 'Direct voucher API handshake required browser execution.',
    playerName,
    voucherType,
    executionMode: 'DIRECT_TLS_API',
    latencyMs: Date.now() - startTime,
  };
}
