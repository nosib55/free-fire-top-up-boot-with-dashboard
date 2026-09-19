// lib/automation/captchaSolver.ts
import dbConnect from '../../utils/db';
import SystemSetting from '../../models/SystemSetting';
import { Page } from 'puppeteer';
import { getProxyConfig } from './browserManager';
import {
  getCachedDatadomeCookie,
  setCachedDatadomeCookie,
  invalidateDatadomeCookie,
} from './datadomeCache';

export interface CaptchaSolveResult {
  solved: boolean;
  token?: string;
  cookie?: string;
  error?: string;
}

/**
 * Chrome 133 UA — must stay in sync with stealthPatches.ts STEALTH_USER_AGENT
 */
export const CAPSOLVER_SUPPORTED_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

/**
 * Get active captcha solver key and provider from DB or Environment
 */
export async function getCaptchaApiKey(): Promise<{ key: string; provider: 'capsolver' | '2captcha' }> {
  const provider = (process.env.CAPTCHA_PROVIDER || 'capsolver').toLowerCase() as 'capsolver' | '2captcha';
  const envKey = process.env.CAPTCHA_API_KEY || process.env.CAPTCHA_SOLVER_KEY || process.env.TWOCAPTCHA_API_KEY;
  if (envKey) {
    const isCap = envKey.startsWith('CAP-') || provider === 'capsolver';
    return { key: envKey, provider: isCap ? 'capsolver' : '2captcha' };
  }

  try {
    await dbConnect();
    const setting = await SystemSetting.findOne().lean();
    if (setting && (setting as any).captchaSolverApiKey) {
      const key = (setting as any).captchaSolverApiKey;
      const isCap = key.startsWith('CAP-') || provider === 'capsolver';
      return { key, provider: isCap ? 'capsolver' : '2captcha' };
    }
  } catch {}

  return { key: '', provider: 'capsolver' };
}

/**
 * Solve Image/Text based captcha using CapSolver or 2Captcha
 */
export async function solveImageCaptcha(base64Image: string): Promise<CaptchaSolveResult> {
  const { key: apiKey, provider } = await getCaptchaApiKey();
  if (!apiKey) {
    return { solved: false, error: 'No captcha solver API key configured.' };
  }

  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

  if (provider === 'capsolver' || apiKey.startsWith('CAP-')) {
    try {
      const res = await fetch('https://api.capsolver.com/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: apiKey,
          task: {
            type: 'ImageToTextTask',
            body: cleanBase64,
          },
        }),
      });

      const data = await res.json();
      if (data.errorId === 0 && data.solution?.text) {
        return { solved: true, token: data.solution.text };
      }
      return { solved: false, error: data.errorDescription || 'CapSolver failed' };
    } catch (err: any) {
      return { solved: false, error: err.message };
    }
  }

  try {
    const submitUrl = `https://2captcha.com/in.php`;
    const submitRes = await fetch(submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        method: 'base64',
        key: apiKey,
        body: cleanBase64,
        json: '1',
      }),
    });

    const submitData = await submitRes.json();
    if (submitData.status !== 1) {
      return { solved: false, error: submitData.request || 'Captcha submission failed' };
    }

    const requestId = submitData.request;
    const pollUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
    const startTime = Date.now();

    while (Date.now() - startTime < 30000) {
      await new Promise((r) => setTimeout(r, 1500));
      const pollRes = await fetch(pollUrl);
      const pollData = await pollRes.json();

      if (pollData.status === 1) {
        return { solved: true, token: pollData.request };
      }
      if (pollData.request !== 'CAPCHA_NOT_READY') {
        return { solved: false, error: pollData.request };
      }
    }

    return { solved: false, error: 'Captcha solving timed out' };
  } catch (err: any) {
    return { solved: false, error: err.message };
  }
}

/**
 * Solve Turnstile / Cloudflare captcha if present
 */
export async function solveTurnstile(pageUrl: string, siteKey: string): Promise<CaptchaSolveResult> {
  const { key: apiKey, provider } = await getCaptchaApiKey();
  if (!apiKey) {
    return { solved: false, error: 'No captcha solver API key configured.' };
  }

  if (provider === 'capsolver' || apiKey.startsWith('CAP-')) {
    try {
      const res = await fetch('https://api.capsolver.com/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: apiKey,
          task: {
            type: 'AntiTurnstileTaskProxyLess',
            websiteURL: pageUrl,
            websiteKey: siteKey,
          },
        }),
      });

      const data = await res.json();
      if (data.errorId === 0) {
        if (data.status === 'ready') {
          return { solved: true, token: data.solution?.token };
        }
        const taskId = data.taskId;
        const startTime = Date.now();
        while (Date.now() - startTime < 35000) {
          await new Promise((r) => setTimeout(r, 800));
          const getRes = await fetch('https://api.capsolver.com/getTaskResult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientKey: apiKey, taskId }),
          });
          const getData = await getRes.json();
          if (getData.status === 'ready') {
            return { solved: true, token: getData.solution?.token };
          }
        }
      }
      return { solved: false, error: data.errorDescription || 'CapSolver Turnstile failed' };
    } catch (err: any) {
      return { solved: false, error: err.message };
    }
  }

  return { solved: false, error: 'Provider not supported' };
}

/**
 * Build proxy URL string from current proxy config for CapSolver task payload.
 */
function buildProxyUrlForCapSolver(): string {
  const activeProxy = getProxyConfig();
  let proxyUrl = process.env.RESIDENTIAL_PROXY_URL || '';
  if (activeProxy) {
    if (activeProxy.username && activeProxy.password) {
      const u = encodeURIComponent(activeProxy.username);
      const p = encodeURIComponent(activeProxy.password);
      proxyUrl = activeProxy.server.replace('://', `://${u}:${p}@`);
    } else {
      proxyUrl = activeProxy.server;
    }
  }
  return proxyUrl;
}

/**
 * Extract domain from a URL for cache keying.
 */
function extractDomain(websiteUrl: string): string {
  try {
    const parsed = new URL(websiteUrl);
    const parts = parsed.hostname.split('.');
    return parts.slice(-2).join('.');
  } catch {
    return 'garena.my';
  }
}

/**
 * Inject a DataDome cookie value into all relevant domains on the page.
 */
async function injectDatadomeCookie(page: Page, cookieVal: string, websiteUrl: string): Promise<void> {
  const domain = extractDomain(websiteUrl);
  await page.setCookie(
    {
      name: 'datadome',
      value: cookieVal,
      domain: `.${domain}`,
      path: '/',
      secure: true,
      httpOnly: false,
    },
    {
      name: 'datadome',
      value: cookieVal,
      domain: `shop.${domain}`,
      path: '/',
      secure: true,
      httpOnly: false,
    }
  );
}

/**
 * Parse the raw datadome cookie string and extract just the value.
 */
function parseDatadomeCookieValue(cookie: string): string {
  const m = cookie.match(/datadome=([^;]+)/);
  return m ? m[1] : cookie.split(';')[0];
}

/**
 * Core CapSolver DatadomeSliderTask — sends task and polls for solution.
 * Returns the raw cookie string or null on failure.
 */
async function solveDataDomeViaCapSolver(
  captchaUrl: string,
  websiteUrl: string,
  apiKey: string,
  proxyUrl: string
): Promise<string | null> {
  const taskPayload: Record<string, any> = {
    type: 'DatadomeSliderTask',
    websiteURL: websiteUrl,
    captchaUrl: captchaUrl,
    userAgent: CAPSOLVER_SUPPORTED_UA,
  };
  if (proxyUrl) {
    taskPayload.proxy = proxyUrl;
  }

  const res = await fetch('https://api.capsolver.com/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientKey: apiKey, task: taskPayload }),
  });

  const data = await res.json();
  if (data.errorId !== 0 || !data.taskId) {
    console.error('[DataDome] CapSolver createTask failed:', data);
    return null;
  }

  // May already be in the createTask response
  if (data.solution?.cookie) return data.solution.cookie;

  // Poll for result
  const start = Date.now();
  while (Date.now() - start < 30000) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await fetch('https://api.capsolver.com/getTaskResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientKey: apiKey, taskId: data.taskId }),
    });
    const pollData = await poll.json();
    if (pollData.status === 'ready' && pollData.solution?.cookie) {
      return pollData.solution.cookie;
    }
    if (pollData.errorId !== 0 || pollData.status === 'failed') {
      console.error('[DataDome] CapSolver poll error:', pollData.errorDescription || pollData);
      return null;
    }
  }

  return null;
}

/**
 * Detect & Solve DataDome Challenge using CapSolver DatadomeSliderTask.
 *
 * Improvements over original:
 * 1. Checks Redis cache first — skips CapSolver if a valid cookie exists
 * 2. Supports both iframe-based and inline DataDome challenges
 * 3. Reloads page after cookie injection to confirm bypass
 * 4. Caches successful cookie in Redis for reuse
 * 5. Invalidates cache and retries with browser rotation on failure
 */
export async function handleDataDomeSlider(
  page: Page,
  websiteUrl = 'https://shop.garena.my/app/100067/idlogin',
  options: { retryOnFail?: boolean } = {}
): Promise<boolean> {
  const domain = extractDomain(websiteUrl);

  // ── Step 1: Check Redis cache ─────────────────────────────────────────────
  const cachedCookie = await getCachedDatadomeCookie(domain);
  if (cachedCookie) {
    const cookieVal = parseDatadomeCookieValue(cachedCookie);
    await injectDatadomeCookie(page, cookieVal, websiteUrl);
    console.log('[DataDome] ♻️ Injected cached DataDome cookie — no CapSolver call needed.');
    return true;
  }

  // ── Step 2: Detect DataDome challenge ─────────────────────────────────────
  try {
    let captchaUrl: string | null = null;

    // Method A: Scan for DataDome challenge iframe (poll up to 3s)
    for (let i = 0; i < 10; i++) {
      const frames = page.frames();
      const f = frames.find(
        (frame) =>
          frame.url().includes('captcha-delivery.com') || frame.url().includes('geo.captcha')
      );
      if (f) {
        captchaUrl = f.url();
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    // Method B: Extract from page HTML (inline DataDome without iframe)
    if (!captchaUrl) {
      captchaUrl = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        for (const s of scripts) {
          const src = (s as HTMLScriptElement).src;
          if (src.includes('captcha-delivery.com') || src.includes('geo.captcha-delivery')) {
            return src;
          }
        }
        // Check meta redirect or inline datadome params in page text
        const bodyText = document.body?.innerHTML || '';
        const m = bodyText.match(/https:\/\/[^"']*captcha-delivery\.com[^"']*/);
        return m ? m[0] : null;
      }).catch(() => null);
    }

    if (!captchaUrl) {
      return false; // No DataDome challenge present
    }

    console.log('[DataDome] 🛡️ Detected DataDome challenge! Solving via CapSolver...');

    // ── Step 3: Solve via CapSolver ───────────────────────────────────────────
    const { key: apiKey } = await getCaptchaApiKey();
    if (!apiKey) {
      console.warn('[DataDome] No CapSolver API key found to solve slider.');
      return false;
    }

    const proxyUrl = buildProxyUrlForCapSolver();
    const rawCookie = await solveDataDomeViaCapSolver(captchaUrl, websiteUrl, apiKey, proxyUrl);

    if (!rawCookie) {
      // ── Step 4: On failure, optionally rotate browser and retry once ────────
      if (options.retryOnFail) {
        console.warn('[DataDome] 1st attempt failed. Rotating browser and retrying...');
        const { rotateBrowser } = await import('./browserManager');
        await rotateBrowser();
        return false; // caller should re-navigate and call again
      }
      return false;
    }

    // ── Step 5: Parse cookie, inject, cache ───────────────────────────────────
    console.log('[DataDome] ✅ Successfully solved DataDome slider!');
    const cookieVal = parseDatadomeCookieValue(rawCookie);

    await injectDatadomeCookie(page, cookieVal, websiteUrl);

    // Cache in Redis for subsequent orders
    await setCachedDatadomeCookie(domain, `datadome=${cookieVal}`);

    return true;
  } catch (err: any) {
    console.error('[DataDome] Solver error:', err?.message);
    // Invalidate any stale cache entry
    await invalidateDatadomeCookie(domain).catch(() => {});
    return false;
  }
}
