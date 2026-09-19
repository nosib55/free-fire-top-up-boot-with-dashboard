// lib/automation/unipinVoucher.ts
import { detectUnipinDenomination } from './unipinPatterns';
import { getBrowser, setupPageProxy, rotateBrowser } from './browserManager';
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
    await page.setViewport({ width: 1280, height: 1000 });

    const targetDenom = diamondLabel.replace(/ Diamonds?$/i, '').trim();

    // Redirect window.open to avoid popup suppression
    await page.evaluateOnNewDocument(() => {
      const origOpen = window.open;
      window.open = function (url?: string | URL) {
        if (url) {
          window.location.href = typeof url === 'string' ? url : url.toString();
          return window;
        }
        return origOpen ? origOpen.apply(this, arguments as any) : null;
      };
    });

    // ── 1. Garena Shop — Set BD Cookie & Navigate ──
    await page.setCookie({ name: 'region', value: 'BD', domain: '.garena.my' });

    profiler.mark('Navigating to Garena Shop BD');
    await page.goto('https://shop.garena.my/app/100067/idlogin', {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });
    profiler.mark('Garena DOM loaded');

    const submitPlayerIdLogin = async () => {
      const inputSelector = 'input[placeholder*="player ID" i], input[type="text"], input[type="number"], input';
      await page.waitForSelector(inputSelector, { timeout: 12000 }).catch(() => {});

      const inputEl = await page.$(inputSelector);
      if (inputEl) {
        await inputEl.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await new Promise((r) => setTimeout(r, 100));
        await inputEl.type(uid, { delay: 40 });
      } else {
        await page.evaluate((targetUid) => {
          const inp = document.querySelector('input') as HTMLInputElement;
          if (inp) {
            inp.value = targetUid;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, uid).catch(() => {});
      }

      await new Promise((r) => setTimeout(r, 400));

      // Click the Login button
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        for (const b of btns) {
          const t = ((b as HTMLElement).innerText || b.textContent || '').trim();
          if (t === 'Login') {
            (b as HTMLElement).click();
            break;
          }
        }
      });
    };

    await submitPlayerIdLogin();
    profiler.mark('UID entered & Login button clicked');

    // Wait for authentication response or DataDome challenge
    let loginSuccess = false;
    const loginWaitStart = Date.now();
    let dataDomeSolvedCount = 0;

    while (Date.now() - loginWaitStart < 35000) {
      const pageText = await page.evaluate(() => document.body.innerText || '');
      
      // Check if logged in
      if (pageText.includes('Username:') || pageText.includes('Log out') || pageText.includes('Logout')) {
        loginSuccess = true;
        break;
      }

      // Check for UID validation errors
      if (
        pageText.includes('does not exist') ||
        pageText.includes('Player ID does not exist') ||
        pageText.includes('Invalid Player ID')
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

      if (pageText.includes('Only For BD Region') || pageText.includes('Only for BD')) {
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

      // Check if DataDome challenge appeared
      const frames = page.frames();
      const hasDataDome = frames.some((f) => {
        try {
          const u = f.url();
          return u.includes('captcha-delivery.com') || u.includes('geo.captcha');
        } catch {
          return false;
        }
      });

      if (hasDataDome && dataDomeSolvedCount < 1) {
        dataDomeSolvedCount++;
        profiler.mark('DataDome challenge detected on login');
        const solved = await handleDataDomeSlider(page);
        if (solved) {
          profiler.mark('DataDome challenge solved via CapSolver');
          await new Promise((r) => setTimeout(r, 1000));
          await page.goto('https://shop.garena.my/app/100067/idlogin', { waitUntil: 'domcontentloaded' });
          await submitPlayerIdLogin();
          await new Promise((r) => setTimeout(r, 3500));
        } else {
          console.error('[UniPin Worker] ❌ DataDome challenge could not be solved. Rotating proxy...');
          profiler.end(false, 'DATADOME_BLOCKED');
          try { await rotateBrowser(); } catch {}
          return {
            success: false,
            errorReason: 'WORKER_ERROR',
            message: 'Network security verification required. Please retry.',
            voucherType,
            playerName,
          };
        }
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    if (!loginSuccess) {
      // Re-check text in case it appeared
      const finalText = await page.evaluate(() => document.body.innerText || '');
      if (!finalText.includes('Username:') && !finalText.includes('Log out') && !finalText.includes('Logout')) {
        await saveDebugScreenshot(page, 'login_not_authenticated');
        console.error(`[UniPin Worker] ❌ Garena login failed to authenticate UID ${uid}. Rotating proxy...`);
        profiler.end(false, 'LOGIN_FAILED');
        try { await rotateBrowser(); } catch {}
        return {
          success: false,
          errorReason: 'WORKER_ERROR',
          message: 'Garena authentication timeout. Please retry.',
          voucherType,
          playerName,
        };
      }
    }

    profiler.mark('Login authentication response received');

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
    profiler.mark(`Selecting package (${diamondLabel})`);

    // Robust package locator and center click
    const selectPackage = async (denom: string): Promise<boolean> => {
      try {
        const box = await page.evaluate((d) => {
          const dl = d.toLowerCase();
          const allDivs = Array.from(document.querySelectorAll('li, div, button, a, span'));
          for (const el of allDivs) {
            const t = ((el as HTMLElement).innerText || el.textContent || '').trim().toLowerCase();
            const isTarget = dl.includes('weekly')
              ? (/weekly\s*membership/i.test(t) && !t.includes('monthly') && t.length < 50)
              : dl.includes('monthly')
              ? (/monthly\s*membership/i.test(t) && t.length < 50)
              : ((new RegExp(`\\b${dl}\\b.*diamond`, 'i').test(t) || t.startsWith(dl + ' diamond')) && t.length < 40);

            if (isTarget) {
              const targetEl = (el.closest('li, div[role="button"], button') || el) as HTMLElement;
              targetEl.scrollIntoView({ behavior: 'instant', block: 'center' });
              targetEl.click();
              const rect = targetEl.getBoundingClientRect();
              return {
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
                width: rect.width,
                height: rect.height,
              };
            }
          }
          return null;
        }, denom);

        if (box && box.width > 10 && box.height > 10) {
          console.log(`[UniPin Worker] Clicking package '${denom}' at (${Math.round(box.x)}, ${Math.round(box.y)})`);
          await page.mouse.move(box.x, box.y);
          await new Promise((r) => setTimeout(r, 120));
          await page.mouse.click(box.x, box.y);
          await new Promise((r) => setTimeout(r, 600));
          return true;
        }
      } catch (err: any) {
        console.warn(`[UniPin Worker] Warning during package click: ${err?.message}`);
      }
      return false;
    };

    const packageClicked = await selectPackage(targetDenom);
    if (!packageClicked) {
      // Fallback: try clicking directly on element
      await page.evaluate((denom) => {
        const dl = denom.toLowerCase();
        const all = Array.from(document.querySelectorAll('*'));
        for (const el of all) {
          const t = (el.textContent || '').trim().toLowerCase();
          if (
            (dl.includes('weekly') && t.includes('weekly membership')) ||
            (dl.includes('monthly') && t.includes('monthly membership')) ||
            t === `${dl} diamond` ||
            t === `${dl} diamonds`
          ) {
            (el as HTMLElement).click();
            break;
          }
        }
      }, targetDenom);
    }

    profiler.mark(`Selected package (${targetDenom})`);
    await new Promise((r) => setTimeout(r, 800));

    // ── 4. Click Proceed to Payment under Payment card ──
    const clickProceed = async (): Promise<boolean> => {
      try {
        await page.evaluate(() => {
          const formsAndLinks = Array.from(document.querySelectorAll('form, a'));
          for (const el of formsAndLinks) {
            el.removeAttribute('target');
          }
        }).catch(() => {});

        const coords = await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('button, a, div[role="button"], input[type="button"], input[type="submit"]'));
          for (const b of all) {
            const txt = ((b as HTMLElement).innerText || b.textContent || (b as HTMLInputElement).value || '').trim();
            if (txt.includes('Proceed to Payment') || txt.includes('Proceed') || txt.includes('পেমেন্ট')) {
              (b as HTMLElement).scrollIntoView({ behavior: 'instant', block: 'center' });
              const rect = b.getBoundingClientRect();
              if (rect.width > 5 && rect.height > 5) {
                return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
              }
            }
          }
          return null;
        });

        if (coords) {
          console.log(`[UniPin Worker] Clicking Proceed to Payment at (${Math.round(coords.x)}, ${Math.round(coords.y)})`);
          await page.mouse.move(coords.x, coords.y);
          await new Promise((r) => setTimeout(r, 100));
          await page.mouse.click(coords.x, coords.y);
        }

        // DOM click fallback
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, div[role="button"], input[type="button"], input[type="submit"]'));
          for (const b of btns) {
            const txt = ((b as HTMLElement).innerText || b.textContent || (b as HTMLInputElement).value || '').trim();
            if (txt.includes('Proceed to Payment') || txt.includes('Proceed') || txt.includes('পেমেন্ট')) {
              (b as HTMLElement).click();
              return true;
            }
          }
          return false;
        }).catch(() => {});

        return true;
      } catch {
        return false;
      }
    };

    // Prepare popup listener BEFORE clicking Proceed
    let uniboxPage: Page = page;
    let gatewayReached = false;

    const popupPromise = new Promise<Page | null>((resolve) => {
      page.once('popup', (p) => resolve(p as unknown as Page));
      context.once('targetcreated', async (t) => {
        if (t.type() === 'page') {
          try {
            const p = await t.page();
            if (p) resolve(p as unknown as Page);
          } catch {}
        }
      });
    });

    await clickProceed();
    profiler.mark('Clicked Proceed to Payment');

    // Dynamic wait for UniPin / UniBox tab or redirection
    const startTabWait = Date.now();
    while (Date.now() - startTabWait < 20000) {
      if (page.url().includes('unipin.com') || page.url().includes('unibox')) {
        uniboxPage = page;
        gatewayReached = true;
        break;
      }

      const ctxPages = await context.pages();
      for (const p of ctxPages) {
        try {
          const u = p.url();
          if (u.includes('unipin.com') || u.includes('unibox')) {
            uniboxPage = p;
            gatewayReached = true;
            break;
          }
        } catch {}
      }
      if (gatewayReached) break;

      const maybePopup = await Promise.race([
        popupPromise,
        new Promise<null>((r) => setTimeout(() => r(null), 500)),
      ]);
      if (maybePopup) {
        uniboxPage = maybePopup;
        gatewayReached = true;
        break;
      }

      // If after 4s still not opened, re-verify package selection and click proceed again
      if (Date.now() - startTabWait > 4000 && !gatewayReached) {
        await selectPackage(targetDenom);
        await new Promise((r) => setTimeout(r, 400));
        await clickProceed();
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    if (!gatewayReached) {
      await saveDebugScreenshot(page, 'gateway_not_reached');
      console.error('[UniPin Worker] ❌ UniPin / UniBox gateway was not reached.');
      profiler.end(false, 'GATEWAY_TIMEOUT');
      return {
        success: false,
        message: 'UniPin gateway could not be loaded from Garena Shop.',
        errorReason: 'WORKER_ERROR',
        voucherType,
        playerName,
      };
    }

    await setupPageProxy(uniboxPage);
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

    const amountBox = await uniboxPage.evaluate((denom) => {
      const dl = denom.toLowerCase().replace(/\s+/g, ' ').trim();
      const allEls = Array.from(document.querySelectorAll('a, button, div, span, p, li'));
      for (const el of allEls) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const isMatch = dl.includes('weekly')
          ? (txt.includes('weekly') && !txt.includes('monthly'))
          : dl.includes('monthly')
          ? (txt.includes('monthly') && !txt.includes('weekly'))
          : (txt.includes(`${dl} diamond`) || txt === dl || txt.startsWith(dl));

        if (isMatch) {
          const clickable = (el.closest('a, button, div[role="button"]') || el) as HTMLElement;
          clickable.scrollIntoView({ behavior: 'instant', block: 'center' });
          clickable.click();
          const rect = clickable.getBoundingClientRect();
          if (rect.width > 5 && rect.height > 5) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    }, targetDenom);

    if (amountBox) {
      await uniboxPage.mouse.click(amountBox.x, amountBox.y).catch(() => {});
    }

    profiler.mark(`Selected UniBox denomination (${targetDenom})`);
    await new Promise((r) => setTimeout(r, 2000));

    // ── 6. Select Voucher Sub-channel inside UniBox (UniPin Voucher) ──
    // Step A: Expand Physical Vouchers accordion
    try {
      await uniboxPage.waitForFunction(
        () => (document.body.innerText || '').includes('Physical Vouchers'),
        { timeout: 8000 }
      );
    } catch {}

    const pvBox = await uniboxPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('div, button, a, p, span'));
      for (const el of all) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (txt === 'Physical Vouchers' || txt.includes('Physical Vouchers')) {
          const clickable = (el.closest('div, button, a') || el) as HTMLElement;
          clickable.scrollIntoView({ behavior: 'instant', block: 'center' });
          clickable.click();
          const rect = clickable.getBoundingClientRect();
          if (rect.width > 5 && rect.height > 5) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });

    if (pvBox) {
      await uniboxPage.mouse.click(pvBox.x, pvBox.y).catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 1200));

    // Step B: Click UniPin Voucher tile under Physical Vouchers
    const targetChannelName = 'UniPin Voucher';
    const uvBox = await uniboxPage.evaluate(() => {
      const all = Array.from(
        document.querySelectorAll(
          '.payment-channel-name, .payment-channel-button, button, a, div[role="button"], li, div'
        )
      );
      for (const el of all) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (txt === 'UniPin Voucher' || txt.includes('UniPin Voucher')) {
          const clickable = (el.closest('.payment-channel-button, button, a, li') || el) as HTMLElement;
          clickable.scrollIntoView({ behavior: 'instant', block: 'center' });
          clickable.click();
          const rect = clickable.getBoundingClientRect();
          if (rect.width > 5 && rect.height > 5) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });

    if (uvBox) {
      await uniboxPage.mouse.click(uvBox.x, uvBox.y).catch(() => {});
    }

    profiler.mark(`Selected voucher channel (${targetChannelName})`);

    // ── 7. Dynamic Wait for Serial & PIN Form across Page and all Frames ──
    const FORM_SELECTOR =
      'input[name="serial"], input#serial, input[placeholder*="Serial"], input[placeholder*="UPBD"], input[placeholder*="BDMB"]';

    let targetFrame: any = uniboxPage;
    let formReady = false;
    const searchStartTime = Date.now();

    while (Date.now() - searchStartTime < 15000) {
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
    try { await rotateBrowser(); } catch {}
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
