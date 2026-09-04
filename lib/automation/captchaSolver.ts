// lib/automation/captchaSolver.ts
import dbConnect from '../../utils/db';
import SystemSetting from '../../models/SystemSetting';

export interface CaptchaSolveResult {
  solved: boolean;
  token?: string;
  error?: string;
}

/**
 * Get active captcha solver key from DB or Environment
 */
export async function getCaptchaApiKey(): Promise<string> {
  if (process.env.CAPTCHA_SOLVER_KEY || process.env.TWOCAPTCHA_API_KEY) {
    return (process.env.CAPTCHA_SOLVER_KEY || process.env.TWOCAPTCHA_API_KEY) as string;
  }

  try {
    await dbConnect();
    const setting = await SystemSetting.findOne().lean();
    if (setting && (setting as any).captchaSolverApiKey) {
      return (setting as any).captchaSolverApiKey;
    }
  } catch {}

  return '';
}

/**
 * Solve Image/Text based captcha using 2Captcha service
 */
export async function solveImageCaptcha(base64Image: string): Promise<CaptchaSolveResult> {
  const apiKey = await getCaptchaApiKey();
  if (!apiKey) {
    return { solved: false, error: 'No captcha solver API key configured.' };
  }

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // 1. Submit in 2Captcha
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

    // 2. Poll for solution (max 30s)
    const pollUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
    const startTime = Date.now();

    while (Date.now() - startTime < 30000) {
      await new Promise((r) => setTimeout(r, 2000));
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
 * Solve Turnstile / Cloudflare captcha if present on Garena / Kiosgamer
 */
export async function solveTurnstile(pageUrl: string, siteKey: string): Promise<CaptchaSolveResult> {
  const apiKey = await getCaptchaApiKey();
  if (!apiKey) {
    return { solved: false, error: 'No captcha solver API key configured.' };
  }

  try {
    const submitUrl = `https://2captcha.com/in.php`;
    const submitRes = await fetch(submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        method: 'turnstile',
        key: apiKey,
        sitekey: siteKey,
        pageurl: pageUrl,
        json: '1',
      }),
    });

    const submitData = await submitRes.json();
    if (submitData.status !== 1) {
      return { solved: false, error: submitData.request };
    }

    const requestId = submitData.request;
    const pollUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
    const startTime = Date.now();

    while (Date.now() - startTime < 40000) {
      await new Promise((r) => setTimeout(r, 2500));
      const pollRes = await fetch(pollUrl);
      const pollData = await pollRes.json();

      if (pollData.status === 1) {
        return { solved: true, token: pollData.request };
      }
      if (pollData.request !== 'CAPCHA_NOT_READY') {
        return { solved: false, error: pollData.request };
      }
    }

    return { solved: false, error: 'Turnstile solving timed out' };
  } catch (err: any) {
    return { solved: false, error: err.message };
  }
}
