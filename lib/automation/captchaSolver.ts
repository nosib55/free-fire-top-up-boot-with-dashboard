// lib/automation/captchaSolver.ts
import dbConnect from '../../utils/db';
import SystemSetting from '../../models/SystemSetting';
import { Page } from 'puppeteer';

export interface CaptchaSolveResult {
  solved: boolean;
  token?: string;
  cookie?: string;
  error?: string;
}

export const CAPSOLVER_SUPPORTED_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

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
 * Detect & Solve DataDome Challenge using CapSolver DatadomeSliderTask
 */
export async function handleDataDomeSlider(
  page: Page,
  websiteUrl = 'https://shop.garena.my/app/100067/idlogin'
): Promise<boolean> {
  try {
    let captchaUrl: string | null = null;

    // Scan for DataDome challenge frame (poll up to 3s)
    for (let i = 0; i < 10; i++) {
      const frames = page.frames();
      const f = frames.find(
        (frame) => frame.url().includes('captcha-delivery.com') || frame.url().includes('geo.captcha')
      );
      if (f) {
        captchaUrl = f.url();
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    if (!captchaUrl) {
      return false;
    }

    console.log('[DataDome] 🛡️ Detected DataDome challenge frame! Solving via CapSolver...');

    const { key: apiKey } = await getCaptchaApiKey();
    if (!apiKey) {
      console.warn('[DataDome] No CapSolver API key found to solve slider.');
      return false;
    }

    const proxyUrl = process.env.RESIDENTIAL_PROXY_URL;

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
      body: JSON.stringify({
        clientKey: apiKey,
        task: taskPayload,
      }),
    });

    const data = await res.json();
    if (data.errorId !== 0 || !data.taskId) {
      console.error('[DataDome] CapSolver createTask failed:', data);
      return false;
    }

    let cookie = data.solution?.cookie;
    if (!cookie) {
      const start = Date.now();
      while (Date.now() - start < 25000) {
        await new Promise((r) => setTimeout(r, 1000));
        const poll = await fetch('https://api.capsolver.com/getTaskResult', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientKey: apiKey, taskId: data.taskId }),
        });
        const pollData = await poll.json();
        if (pollData.status === 'ready' && pollData.solution?.cookie) {
          cookie = pollData.solution.cookie;
          break;
        }
      }
    }

    if (cookie) {
      console.log('[DataDome] ✅ Successfully solved DataDome slider!');
      const m = cookie.match(/datadome=([^;]+)/);
      if (m) {
        await page.setCookie({
          name: 'datadome',
          value: m[1],
          domain: '.garena.my',
          path: '/',
          secure: true,
        });
        return true;
      }
    }
  } catch (err: any) {
    console.error('[DataDome] Solver error:', err?.message);
  }
  return false;
}
