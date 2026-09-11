// lib/automation/unipinVoucher.ts
import { detectUnipinDenomination } from './unipinPatterns';
import { getBrowser, setupPageProxy } from './browserManager';
import { handleDataDomeSlider, CAPSOLVER_SUPPORTED_UA } from './captchaSolver';
import { StepProfiler } from './profiler';
import { topupQueue } from './queueManager';
import { BrowserContext, Page } from 'puppeteer';

export interface UniPinVoucherParams {
  uid: string;
  voucherCode: string;
  serial?: string;
  pin?: string;
}

export interface AutomationResult {
  success: boolean;
  message: string;
  voucherType?: string;
  playerName?: string;
  orderId?: string;
  errorReason?:
    | 'INVALID_UID'
    | 'INVALID_VOUCHER'
    | 'CONSUMED_VOUCHER'
    | 'ONLY_FOR_BD_REGION'
    | 'NOT_ENOUGH_SHELLS'
    | 'WORKER_ERROR'
    | 'INSUFFICIENT_LEVEL'
    | 'UNSUPPORTED_PACKAGE';
}

async function saveDebugScreenshot(page: Page, label: string) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const debugDir = path.join(process.cwd(), 'public', 'debug');
    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
    await page.screenshot({ path: path.join(debugDir, `${label}_${Date.now()}.png`), fullPage: true });
  } catch {}
}

export async function processUniPinVoucher(params: UniPinVoucherParams): Promise<AutomationResult> {
  // Concurrency queue to prevent server resource exhaustion
  return topupQueue.run(() => executeTopup(params));
}

async function executeTopup({
  uid,
  voucherCode,
  serial: rawSerial,
  pin: rawPin,
}: UniPinVoucherParams): Promise<AutomationResult> {
  const profiler = new StepProfiler(`UID: ${uid}`);

  const fullText = (voucherCode || `${rawSerial || ''} ${rawPin || ''}`).trim();
  let effectiveSerial = (rawSerial || '').trim();
  let effectivePin = (rawPin || '').trim();

  // Extract serial and pin from fullText or separate inputs
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
    : `Generic UniPin Voucher (${diamondLabel})`;

  let playerName = `Free Fire Player (${uid})`;

  // Sandbox / Demo Voucher check
  const isSandboxVoucher =
    cleanCode.includes('8921-9402') ||
    cleanCode.includes('89219402') ||
    cleanCode.includes('TEST_VOUCHER') ||
    cleanCode.includes('DEMO_') ||
    fullText.includes('8921-9402') ||
    fullText.includes('DEMO');

  if (isSandboxVoucher) {
    profiler.mark('Sandbox voucher detected');
    profiler.end(true, 'Simulated');
    return {
      success: true,
      message: `[TEST SANDBOX] Top-up of ${diamondLabel} simulated successfully for Player (${uid}).`,
      voucherType: `${voucherType} [SANDBOX]`,
      playerName: `Sandbox Player (${uid})`,
      orderId: `SB_${Date.now()}`,
    };
  }

  // Live Redemption Engine
  const browser = await getBrowser();
  profiler.mark('Browser acquired');

  const context: BrowserContext = await browser.createBrowserContext();
  const page: Page = await context.newPage();
  await setupPageProxy(page);

  try {
    await page.setUserAgent(CAPSOLVER_SUPPORTED_UA);
    await page.setViewport({ width: 1280, height: 900 });

    const targetDenom = diamondLabel.replace(/ Diamonds?$/i, '').trim();

    // ── 1. Garena Shop — Set BD Cookie & Navigate ──
    await page.setCookie({ name: 'region', value: 'BD', domain: '.garena.my' });

    profiler.mark('Navigating to Garena Shop BD');
    await page.goto('https://shop.garena.my/app/100067/idlogin', {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });
    profiler.mark('Garena DOM loaded');

    // ── 2. Type Player ID and Click Login ──
    await page.waitForSelector('input', { timeout: 12000 });
    const uidInput = await page.$('input');
    if (uidInput) {
      await uidInput.click({ count: 3 }).catch(() => {});
      await uidInput.type(uid, { delay: 35 });
    }

    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        if ((b.innerText || '').trim() === 'Login') {
          b.click();
          return;
        }
      }
    });

    profiler.mark('UID entered & Login button clicked');

    // Solve DataDome Slider if present on login
    const solved = await handleDataDomeSlider(page);
    if (solved) {
      profiler.mark('DataDome challenge solved via CapSolver');
      // Reload and login cleanly with verified cookie
      await page.goto('https://shop.garena.my/app/100067/idlogin', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForSelector('input', { timeout: 10000 });
      const inp = await page.$('input');
      if (inp) {
        await inp.click({ count: 3 }).catch(() => {});
        await inp.type(uid, { delay: 25 });
        await new Promise((r) => setTimeout(r, 300));
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          for (const b of btns) {
            if ((b.innerText || '').trim() === 'Login') b.click();
          }
        });
      }
    }

    // Wait for authentication response or packages to load
    await page.waitForFunction(
      () => {
        const text = document.body.innerText || '';
        return (
          text.includes('Username:') ||
          text.includes('Log out') ||
          text.includes('Logout') ||
          text.includes('Weekly Membership') ||
          text.includes('Diamond') ||
          text.includes('does not exist') ||
          text.includes('Invalid Player ID') ||
          text.includes('Only For BD Region')
        );
      },
      { timeout: 15000 }
    ).catch(() => {});

    profiler.mark('Login authentication response received');

    // Check for UID errors
    const earlyPageText = await page.evaluate(() => document.body.innerText || '');
    if (
      earlyPageText.includes('does not exist') ||
      earlyPageText.includes('Player ID does not exist') ||
      earlyPageText.includes('Invalid Player ID')
    ) {
      console.error(`[UniPin Worker] ❌ Player UID ${uid} does not exist on Garena.`);
      profiler.end(false, 'INVALID_UID');
      return {
        success: false,
        errorReason: 'INVALID_UID',
        message: `Invalid Player ID: Free Fire UID '${uid}' does not exist.`,
        voucherType,
        playerName,
      };
    }

    if (earlyPageText.includes('Only For BD Region') || earlyPageText.includes('Only for BD')) {
      console.error(`[UniPin Worker] ❌ Player UID ${uid} is outside BD Region.`);
      profiler.end(false, 'ONLY_FOR_BD_REGION');
      return {
        success: false,
        errorReason: 'ONLY_FOR_BD_REGION',
        message: 'Only For BD Region! Free Fire account is not registered in Bangladesh.',
        voucherType,
        playerName,
      };
    }

    // Extract in-game player name
    const resolvedPlayerName = await page.evaluate(() => {
      const fullText = document.body.innerText || '';
      const m = fullText.match(/Username[:\s]+([^\n\r]+)/i);
      if (m && m[1]) {
        const name = m[1].replace(/Player ID.*/i, '').trim();
        if (name && name.length > 0 && name.length < 50) return name;
      }
      return null;
    }).catch(() => null);

    if (resolvedPlayerName && resolvedPlayerName.length > 0) {
      playerName = resolvedPlayerName;
    }
    profiler.mark(`Player verified (${playerName})`);

    // ── 3. Select Diamond / Membership Package ──
    await page.evaluate((denom) => {
      const els = Array.from(document.querySelectorAll('div, span, button, li, p'));
      for (const el of els) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (
          txt === `${denom} Diamond` ||
          txt === `${denom} Diamonds` ||
          txt === denom ||
          (denom.toLowerCase().includes('weekly') && (txt === 'Weekly Membership' || txt.startsWith('Weekly Membership'))) ||
          (denom.toLowerCase().includes('monthly') && (txt === 'Monthly Membership' || txt.startsWith('Monthly Membership')))
        ) {
          let cur: HTMLElement | null = el as HTMLElement;
          while (cur && cur.tagName !== 'BODY') {
            if (cur.className && (cur.className.includes('border') || cur.className.includes('rounded') || cur.className.includes('justify-between') || cur.className.includes('gap-4'))) {
              cur.click();
              return;
            }
            cur = cur.parentElement;
          }
          (el as HTMLElement).click();
          return;
        }
      }
    }, targetDenom);

    profiler.mark(`Selected package (${targetDenom})`);
    await new Promise((r) => setTimeout(r, 600));

    // ── 4. Click Proceed to Payment under Payment card ──
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      for (const b of btns) {
        const txt = ((b as HTMLElement).innerText || '').trim();
        if (
          txt.includes('Proceed to Payment') ||
          txt.includes('Proceed') ||
          txt.includes('Payment') ||
          txt === 'Login' ||
          txt.includes('পেমেন্ট')
        ) {
          (b as HTMLElement).click();
          return;
        }
      }
    });

    profiler.mark('Clicked Proceed to Payment');

    // Dynamic wait for UniPin / UniBox tab or redirection
    let uniboxPage: Page = page;
    const startTabWait = Date.now();
    while (Date.now() - startTabWait < 12000) {
      const allPages = (await browser.pages()) as unknown as Page[];
      const uniboxTab = allPages.find((p) => {
        try {
          const url = (p as any).url ? (p as any).url() : '';
          return url.includes('unipin.com') || url.includes('unibox');
        } catch {
          return false;
        }
      });

      if (uniboxTab) {
        uniboxPage = uniboxTab;
        break;
      }
      if (page.url().includes('unipin.com') || page.url().includes('unibox')) {
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    profiler.mark('UniBox gateway loaded');
    await uniboxPage.bringToFront().catch(() => {});

    // Solve DataDome Slider on UniBox page if present
    const uniboxSolved = await handleDataDomeSlider(uniboxPage, uniboxPage.url());
    if (uniboxSolved) {
      profiler.mark('DataDome on UniBox solved via CapSolver');
      await new Promise((r) => setTimeout(r, 1500));
    }

    // ── 5. If UniBox displays "Select Amount" grid, click target denomination ──
    try {
      await uniboxPage.waitForFunction(
        () => {
          const text = document.body.innerText || '';
          return (
            text.includes('Select Amount') ||
            text.includes('Physical Vouchers') ||
            text.includes('UniPin Voucher') ||
            text.includes('UP Gift Card') ||
            text.includes('Serial') ||
            text.includes('Diamond')
          );
        },
        { timeout: 8000 }
      );
    } catch {}

    await uniboxPage.evaluate((denom) => {
      const allEls = Array.from(document.querySelectorAll('button, div, span, a, p, li'));
      for (const el of allEls) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (
          txt === `${denom} Diamond` ||
          txt === `${denom} Diamonds` ||
          txt === denom ||
          (denom.toLowerCase().includes('weekly') && (txt.toLowerCase().includes('weekly') || txt === 'Weekly Membership')) ||
          (denom.toLowerCase().includes('monthly') && (txt.toLowerCase().includes('monthly') || txt === 'Monthly Membership'))
        ) {
          const clickable = (el.closest('button, div, a, li') || el) as HTMLElement;
          clickable.click();
          return;
        }
      }
    }, targetDenom);

    profiler.mark(`Selected UniBox denomination (${targetDenom})`);
    await new Promise((r) => setTimeout(r, 1500));

    // ── 6. Select Voucher Sub-channel inside UniBox (UP Gift Card / UniPin Voucher) ──
    // Step A: Expand Physical Vouchers accordion
    await uniboxPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      for (const el of all) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (txt === 'Physical Vouchers' || txt.includes('Physical Vouchers')) {
          ((el.closest('div, button, a') || el) as HTMLElement).click();
          return;
        }
      }
    });

    await new Promise((r) => setTimeout(r, 800));

    // Step B: Click UP Gift Card or UniPin Voucher tile
    const targetChannelName = isUPBD ? 'UP Gift Card' : 'UniPin Voucher';
    await uniboxPage.evaluate((channelName) => {
      const all = Array.from(
        document.querySelectorAll(
          '.payment-channel-name, .payment-channel-button, button, a, div[role="button"], li, div'
        )
      );
      for (const el of all) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (txt === channelName || txt.includes(channelName) || txt.includes('UniPin Voucher')) {
          const clickable = (el.closest('.payment-channel-button, button, a, li') || el) as HTMLElement;
          clickable.click();
          return true;
        }
      }
      return false;
    }, targetChannelName);

    profiler.mark(`Selected voucher channel (${targetChannelName})`);

    // ── 7. Dynamic Wait for Serial & PIN Form across Page and all Frames ──
    const FORM_SELECTOR =
      'input[name="serial"], input#serial, input[placeholder*="Serial"], input[placeholder*="UPBD"], input[placeholder*="BDMB"]';

    let targetFrame: any = uniboxPage;
    let formReady = false;
    const searchStartTime = Date.now();

    while (Date.now() - searchStartTime < 12000) {
      // Re-click denomination if still on Select Amount
      await uniboxPage.evaluate((denom) => {
        const allEls = Array.from(document.querySelectorAll('button, div, span, a, p, li'));
        for (const el of allEls) {
          const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
          if (
            (denom.toLowerCase().includes('weekly') && txt === 'Weekly Membership') ||
            (denom.toLowerCase().includes('monthly') && txt === 'Monthly Membership') ||
            txt === `${denom} Diamond`
          ) {
            const clickable = (el.closest('button, div, a, li') || el) as HTMLElement;
            clickable.click();
            return;
          }
        }
      }, targetDenom);

      const frames = uniboxPage.frames();
      for (const f of frames) {
        try {
          const inp = await f.$(FORM_SELECTOR);
          if (inp) {
            targetFrame = f;
            formReady = true;
            break;
          }
        } catch {}
      }
      if (formReady) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!formReady) {
      await saveDebugScreenshot(uniboxPage, 'form_not_found');
      console.error('[UniPin Worker] ❌ Serial/PIN form NOT found.');
      profiler.end(false, 'FORM_NOT_FOUND');
      return {
        success: false,
        message: 'UniPin voucher form could not load on gateway.',
        errorReason: 'WORKER_ERROR',
        voucherType,
        playerName,
      };
    }

    profiler.mark('Voucher Serial & PIN form ready');

    // ── 7. Fill Serial ──
    const serialInput = await targetFrame.$(FORM_SELECTOR);
    if (serialInput && effectiveSerial) {
      await serialInput.click({ count: 3 }).catch(() => {});
      await serialInput.type(effectiveSerial, { delay: 5 });
    }

    // ── 8. Fill PIN ──
    const cleanPinDigits = effectivePin.replace(/[^0-9]/g, '');
    const pinParts = [
      cleanPinDigits.substring(0, 4),
      cleanPinDigits.substring(4, 8),
      cleanPinDigits.substring(8, 12),
      cleanPinDigits.substring(12, 16),
    ];

    const pin1 = await targetFrame.$('input#pin_1, input[name="pin_1"], input#pin1');
    const pin2 = await targetFrame.$('input#pin_2, input[name="pin_2"], input#pin2');
    const pin3 = await targetFrame.$('input#pin_3, input[name="pin_3"], input#pin3');
    const pin4 = await targetFrame.$('input#pin_4, input[name="pin_4"], input#pin4');
    const singlePin = await targetFrame.$('input#pin, input[name="pin"], input[placeholder*="PIN"]');

    if (pin1 && pin2 && pin3 && pin4) {
      if (pinParts[0]) { await pin1.click({ count: 3 }).catch(() => {}); await pin1.type(pinParts[0], { delay: 5 }); }
      if (pinParts[1]) { await pin2.click({ count: 3 }).catch(() => {}); await pin2.type(pinParts[1], { delay: 5 }); }
      if (pinParts[2]) { await pin3.click({ count: 3 }).catch(() => {}); await pin3.type(pinParts[2], { delay: 5 }); }
      if (pinParts[3]) { await pin4.click({ count: 3 }).catch(() => {}); await pin4.type(pinParts[3], { delay: 5 }); }
    } else if (singlePin) {
      await singlePin.click({ count: 3 }).catch(() => {});
      await singlePin.type(cleanPinDigits, { delay: 5 });
    }

    profiler.mark('Serial & PIN filled');

    // ── 9. Click Confirm / Submit ──
    await targetFrame.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'));
      for (const b of btns) {
        const txt = ((b as HTMLElement).innerText || (b as HTMLInputElement).value || '').trim();
        if (txt.includes('Confirm') || txt.includes('Submit') || txt.includes('Pay') || txt.includes('নিশ্চিত')) {
          (b as HTMLElement).click();
          return;
        }
      }
    });

    profiler.mark('Clicked Confirm Voucher');

    // ── 10. Final Outcome Verification ──
    await uniboxPage.waitForFunction(
      () => {
        const text = document.body.innerText || '';
        const url = window.location.href;
        return (
          text.includes('Success') ||
          text.includes('successful') ||
          text.includes('Transaction Successful') ||
          text.includes('সফল') ||
          text.includes('Consumed Voucher') ||
          text.includes('Voucher already used') ||
          text.includes('Invalid serial') ||
          text.includes('Invalid code') ||
          text.includes('ব্যবহৃত') ||
          url.includes('success') ||
          url.includes('fail')
        );
      },
      { timeout: 12000 }
    ).catch(() => {});

    const finalText = await uniboxPage.evaluate(() => document.body.innerText || '');
    const finalUrl = uniboxPage.url();

    const isSuccess =
      finalText.includes('Success') ||
      finalText.includes('successful') ||
      finalText.includes('Transaction Successful') ||
      finalText.includes('সফল') ||
      finalUrl.includes('success');

    if (!isSuccess) {
      let reasonMsg = 'UniPin Voucher redemption failed: Voucher is invalid, expired, or already used.';
      let reasonCode: 'CONSUMED_VOUCHER' | 'INVALID_VOUCHER' | 'WORKER_ERROR' = 'INVALID_VOUCHER';

      if (
        finalText.includes('Consumed Voucher') || finalUrl.includes('Consumed') ||
        finalText.includes('Voucher already used') || finalText.includes('ব্যবহৃত')
      ) {
        reasonMsg = 'UniPin Voucher is ALREADY USED / CONSUMED (ভাউচার কোডটি ইতিমধ্যে ব্যবহৃত হয়েছে).';
        reasonCode = 'CONSUMED_VOUCHER';
      } else if (finalText.includes('Invalid serial') || finalText.includes('ভুল') || finalText.includes('Invalid code')) {
        reasonMsg = 'UniPin Voucher Serial or PIN is INVALID (ভুল ভাউচার পিন).';
        reasonCode = 'INVALID_VOUCHER';
      } else if (finalText.includes('Cloudflare') || finalText.includes('Security Check')) {
        reasonMsg = 'UniPin Gateway blocked by Cloudflare/CAPTCHA.';
        reasonCode = 'WORKER_ERROR';
      }

      console.error(`[UniPin Worker] ❌ ${reasonMsg} (${reasonCode})`);
      profiler.end(false, reasonCode);
      return { success: false, message: reasonMsg, errorReason: reasonCode, voucherType, playerName };
    }

    const orderId = `UP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    profiler.end(true, `OrderID: ${orderId}`);

    return {
      success: true,
      message: `Top-up of ${diamondLabel} successfully redeemed for Player ${playerName} (UID: ${uid})!`,
      voucherType,
      playerName,
      orderId,
    };

  } catch (error: any) {
    console.error('[UniPin Worker] Automation error:', error?.message);
    profiler.end(false, error?.message);
    return {
      success: false,
      message: `UniPin automation worker error: ${error?.message || 'Gateway connection issue'}.`,
      errorReason: 'WORKER_ERROR',
      voucherType,
      playerName,
    };
  } finally {
    try { await page.close(); } catch {}
    try { await context.close(); } catch {}
  }
}
