// lib/automation/unipinVoucher.ts
import { detectUnipinDenomination } from './unipinPatterns';
import { getRealPlayerName } from './playerLookup';
import { getBrowser } from './browserManager';
import { Page } from 'puppeteer';

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
  errorReason?: 'INVALID_UID' | 'INVALID_VOUCHER' | 'WORKER_ERROR';
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

export async function processUniPinVoucher({
  uid,
  voucherCode,
  serial: rawSerial,
  pin: rawPin,
}: UniPinVoucherParams): Promise<AutomationResult> {
  const fullText = (voucherCode || `${rawSerial || ''} ${rawPin || ''}`).trim();

  let effectiveSerial = rawSerial || '';
  let effectivePin = rawPin || '';

  const serialPinMatch = fullText.match(/^((?:BDMB|UPBD)-[A-Z0-9]-S-\d{8})\s*([0-9-]{16,20})$/i);
  if (serialPinMatch) {
    effectiveSerial = serialPinMatch[1].toUpperCase();
    effectivePin = serialPinMatch[2].replace(/[^0-9]/g, '');
  } else if (!effectivePin && fullText) {
    const parts = fullText.split(/[\s,]+/);
    if (parts.length >= 2) {
      effectiveSerial = parts[0].toUpperCase();
      effectivePin = parts[1].replace(/[^0-9]/g, '');
    } else {
      effectivePin = fullText.replace(/[^0-9]/g, '');
    }
  } else {
    effectivePin = effectivePin.replace(/[^0-9]/g, '');
  }

  const cleanCode = (effectiveSerial ? `${effectiveSerial} ${effectivePin}` : fullText).toUpperCase();
  const isBDMB = cleanCode.startsWith('BDMB');
  const isUPBD = cleanCode.startsWith('UPBD');

  const detectedPattern = detectUnipinDenomination(cleanCode) || detectUnipinDenomination(fullText);
  const diamondLabel = detectedPattern ? detectedPattern.diamondLabel : '240 Diamonds';
  const voucherType = isBDMB
    ? `UniPin BD Mobile (${diamondLabel})`
    : isUPBD
    ? `UniPin BD Voucher (${diamondLabel})`
    : `Generic UniPin Voucher (${diamondLabel})`;

  console.log(`[UniPin Worker] Processing ${voucherType} | UID: ${uid} | Serial: ${effectiveSerial || 'N/A'} | PIN: ${effectivePin ? effectivePin.substring(0, 4) + '****' : 'N/A'}`);

  // Skip pre-lookup for speed — real name extracted from Garena page during automation
  let playerName = `Free Fire Player (${uid})`;


  // Step 2: Sandbox
  const isSandboxVoucher = cleanCode.includes('8921-9402') || cleanCode === 'TEST_VOUCHER' || cleanCode.startsWith('DEMO_');
  if (isSandboxVoucher) {
    return {
      success: true,
      message: `[Sandbox] Top-up of ${diamondLabel} simulated for Player ${playerName} (UID: ${uid}).`,
      voucherType,
      playerName,
      orderId: `UP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    };
  }

  // Step 3: Live redemption
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // Block images/fonts for speed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    const targetDenom = diamondLabel.replace(/ Diamonds?$/i, '').trim();
    const targetChannelId = isUPBD ? '670' : '659';    // ── 1. Garena shop — clear session cookies first for fresh login ──
    console.log(`[UniPin Worker] Navigating to Garena shop...`);
    // Clear any existing Garena cookies to avoid session conflict
    const garenaCookies = await page.cookies('https://shop.garena.my').catch(() => []);
    if (garenaCookies.length > 0) {
      await page.deleteCookie(...garenaCookies).catch(() => {});
    }
    await page.goto('https://shop.garena.my/app/100067/idlogin', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    // ── 2. Enter UID ──
    console.log(`[UniPin Worker] Entering UID...`);
    await page.waitForSelector('input[placeholder*="player ID"], input.form-input', { timeout: 8000 });
    await page.type('input[placeholder*="player ID"], input.form-input', uid, { delay: 20 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) { if (b.innerText.includes('Login')) { b.click(); return; } }
    });

    // Wait for account + package list
    await page.waitForFunction(() => {
      const text = document.body.innerText || '';
      return text.includes('Player ID') || text.includes('Diamond') || text.includes('Top-up Amount') || text.includes('Username');
    }, { timeout: 10000 }).catch(() => {});

    // ── Extract player name from Garena page (multi-line innerText) ──
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
      console.log(`[UniPin Worker] ✅ Player name: ${playerName}`);
    }


    // ── 3. Select Diamond Package ──
    console.log(`[UniPin Worker] Selecting ${diamondLabel}...`);
    await page.evaluate((denom) => {
      const els = Array.from(document.querySelectorAll('div, span, button, li, p'));
      for (const el of els) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (txt === `${denom} Diamond` || txt === `${denom} Diamonds` || txt === denom ||
          (denom.includes('Membership') && txt.includes(denom))) {
          const clickable = el.closest('button, div[role="button"], [tabindex], li') || el;
          (clickable as HTMLElement).click();
          return;
        }
      }
    }, targetDenom);

    await new Promise(r => setTimeout(r, 500));

    // ── 4. Proceed to Payment ──
    console.log(`[UniPin Worker] Clicking Proceed to Payment...`);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      for (const b of btns) {
        const txt = ((b as HTMLElement).innerText || '').trim();
        if (txt.includes('Proceed to Payment') || txt.includes('Payment') || txt.includes('পেমেন্ট')) {
          (b as HTMLElement).click();
          return;
        }
      }
    });

    // Wait for navigation or new tab — check pages() after a short wait
    await new Promise(r => setTimeout(r, 3000));

    // Check if UniBox opened in a new tab
    let uniboxPage: Page = page;
    try {
      const allPages = await browser.pages() as unknown as Page[];
      const uniboxTab = allPages.find(p => {
        try {
          const url = (p as any).url ? (p as any).url() : '';
          return url.includes('unipin.com') || url.includes('unibox');
        } catch { return false; }
      });

      if (uniboxTab && uniboxTab !== page) {
        console.log(`[UniPin Worker] UniBox opened in new tab!`);
        uniboxPage = uniboxTab;
      } else {
        console.log(`[UniPin Worker] UniBox on same page. URL: ${page.url()}`);
      }
    } catch {
      // Fallback: stay on same page
    }


    // ── 5. Wait for UniBox denomination screen ──
    console.log(`[UniPin Worker] Waiting for UniBox denomination screen...`);
    await uniboxPage.waitForFunction(() => {
      const text = document.body.innerText || '';
      return text.includes('Select Amount') || text.includes('Diamond') || text.includes('UniPin');
    }, { timeout: 15000 }).catch(() => {});

    // ── 6. Click denomination — this navigates to channel select page ──
    console.log(`[UniPin Worker] Selecting denomination '${targetDenom}' on UniBox...`);
    const denomNavPromise = uniboxPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});

    await uniboxPage.evaluate((denom) => {
      const all = Array.from(document.querySelectorAll('div, button, a, span, p, li'));
      for (const el of all) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (txt === `${denom} Diamond` || txt === `${denom} Diamonds` ||
          txt.replace(/\s+/g, ' ') === `${denom} Diamond` || txt.replace(/\s+/g, ' ') === `${denom} Diamonds` ||
          (denom.includes('Membership') && txt.toLowerCase().includes(denom.toLowerCase()))) {
          const target = (el.closest('button, a, div[role="button"], li') || el) as HTMLElement;
          target.scrollIntoView({ behavior: 'auto', block: 'center' });
          target.click();
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        }
      }
      return false;
    }, targetDenom).catch(() => {});

    await denomNavPromise;
    console.log(`[UniPin Worker] After denom nav. URL: ${uniboxPage.url()}`);

    // ── 7. On channel select page — click Physical Voucher (first item under Physical Vouchers) ──
    // This page shows "Physical Vouchers" and "Wallet" sections (images blocked, so no text on items)
    console.log(`[UniPin Worker] Clicking Physical Voucher channel...`);
    const voucherNavPromise = uniboxPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

    await uniboxPage.evaluate((channelId) => {
      // Try ID-based selector first
      const byId = document.querySelector(`#pc_div_${channelId}, [onclick*="${channelId}"], [data-channel-id="${channelId}"]`);
      if (byId) {
        (byId as HTMLElement).click();
        byId.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return 'id';
      }

      // Try text-based match (bdmb, voucher, physical)
      const all = Array.from(document.querySelectorAll('div, button, a, li, span'));
      for (const item of all) {
        const t = ((item as HTMLElement).innerText || item.textContent || '').toLowerCase();
        if (t.includes('bdmb') || t.includes('upbd') || t.includes('unipin voucher') || t.includes('unipin physical')) {
          const clickable = (item.closest('button, a, div[role="button"], li') || item) as HTMLElement;
          clickable.click();
          clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return 'text';
        }
      }

      // Fallback: click first item under "Physical Vouchers" section
      const physicalHeader = Array.from(document.querySelectorAll('div, span, h2, h3, p')).find(el => {
        const t = ((el as HTMLElement).innerText || el.textContent || '').toLowerCase();
        return t.includes('physical voucher') || t.includes('physical');
      });
      if (physicalHeader) {
        const section = physicalHeader.closest('div') || physicalHeader.parentElement;
        if (section) {
          const firstClickable = section.querySelector('a, button, div[class*="item"], div[class*="card"], div[class*="option"]') as HTMLElement;
          if (firstClickable) {
            firstClickable.click();
            firstClickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return 'physical-section';
          }
        }
      }

      // Last resort: click the very first anchor/button on the page
      const firstLink = document.querySelector('a[href*="unibox"], a[href*="voucher"]') as HTMLElement;
      if (firstLink) { firstLink.click(); return 'first-link'; }

      return 'none';
    }, targetChannelId).catch(() => {});

    await voucherNavPromise;
    console.log(`[UniPin Worker] After voucher channel nav. URL: ${uniboxPage.url()}`);

    // ── 8. MANDATORY: wait for serial/pin form ──
    console.log(`[UniPin Worker] Waiting for serial/PIN input form...`);
    const FORM_SELECTOR = 'input[placeholder*="BDMB"], input[placeholder*="Serial"], input[placeholder*="serial"], input[name="serial"], input[id*="serial"]';

    let formFound = false;
    try {
      await uniboxPage.waitForSelector(FORM_SELECTOR, { timeout: 12000 });
      formFound = true;
      console.log(`[UniPin Worker] ✅ Serial/PIN form found!`);
    } catch {
      await saveDebugScreenshot(uniboxPage, 'form_not_found');
      console.error('[UniPin Worker] ❌ Serial/PIN form NOT found. CAPTCHA or flow changed.');
      return {
        success: false,
        message: 'UniPin voucher form could not load. Possible CAPTCHA or gateway change.',
        errorReason: 'WORKER_ERROR',

        voucherType,
        playerName,
      };
    }

    // ── 9. Fill Serial ──
    console.log(`[UniPin Worker] Filling Serial: ${effectiveSerial}...`);
    const serialInput = await uniboxPage.$(FORM_SELECTOR);
    if (serialInput && effectiveSerial) {
      await serialInput.click({ count: 3 }).catch(() => {});
      await serialInput.type(effectiveSerial, { delay: 15 });
    }

    // ── 10. Fill PIN ──
    const cleanPinDigits = effectivePin.replace(/[^0-9]/g, '');
    const pinParts = [
      cleanPinDigits.substring(0, 4),
      cleanPinDigits.substring(4, 8),
      cleanPinDigits.substring(8, 12),
      cleanPinDigits.substring(12, 16),
    ];

    const pin1 = await uniboxPage.$('input#pin_1, input[name="pin_1"], input#pin1');
    const pin2 = await uniboxPage.$('input#pin_2, input[name="pin_2"], input#pin2');
    const pin3 = await uniboxPage.$('input#pin_3, input[name="pin_3"], input#pin3');
    const pin4 = await uniboxPage.$('input#pin_4, input[name="pin_4"], input#pin4');
    const singlePin = await uniboxPage.$('input#pin, input[name="pin"], input[placeholder*="PIN"], input[placeholder*="pin"]');

    if (pin1 && pin2 && pin3 && pin4) {
      if (pinParts[0]) await pin1.type(pinParts[0], { delay: 15 });
      if (pinParts[1]) await pin2.type(pinParts[1], { delay: 15 });
      if (pinParts[2]) await pin3.type(pinParts[2], { delay: 15 });
      if (pinParts[3]) await pin4.type(pinParts[3], { delay: 15 });
    } else if (singlePin) {
      await singlePin.type(cleanPinDigits, { delay: 15 });
    }

    await saveDebugScreenshot(uniboxPage, 'before_confirm');
    await new Promise(r => setTimeout(r, 400));

    // ── 11. Click CONFIRM ──
    console.log(`[UniPin Worker] Clicking CONFIRM...`);
    const confirmBtn = await uniboxPage.$('button[type="submit"], input[type="submit"], button.btn-primary, #btn-submit, #submit_button');
    if (confirmBtn) {
      await confirmBtn.click();
    } else {
      await uniboxPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        for (const b of btns) {
          const t = ((b as HTMLElement).innerText || (b as HTMLInputElement).value || '').toLowerCase();
          if (t.includes('confirm') || t.includes('submit') || t.includes('redeem') || t.includes('নিশ্চিত')) {
            (b as HTMLElement).click();
            return;
          }
        }
      });
    }

    // ── 12. Wait for result ──
    await uniboxPage.waitForFunction(() => {
      const text = document.body.innerText || '';
      const url = window.location.href;
      return (
        text.includes('Successful') || text.includes('Thank you') || text.includes('Invoice') ||
        text.includes('সফল') || text.includes('Consumed') || text.includes('Invalid') ||
        text.includes('ব্যবহৃত') || text.includes('ব্যর্থ') || text.includes('Failed') ||
        text.includes('Security Check') || url.includes('success') || url.includes('error') || url.includes('receipt')
      );
    }, { timeout: 10000 }).catch(() => {});

    const finalUrl = uniboxPage.url();
    const finalText = await uniboxPage.evaluate(() => document.body.innerText || '');
    await saveDebugScreenshot(uniboxPage, 'after_confirm');

    // ── 13. Evaluate result ──
    const isFailed =
      finalUrl.includes('/error') || finalUrl.includes('Consumed') ||
      finalText.includes('Consumed Voucher') || finalText.includes('Invalid serial or pin') ||
      finalText.includes('Voucher already used') || finalText.includes('Invalid code') ||
      finalText.includes('Code expired') || finalText.includes('Transaction Failed') ||
      finalText.includes('Payment Failed') || finalText.includes('Security Check') ||
      finalText.includes('Cloudflare') || finalText.includes('Verify you are human') ||
      finalText.includes('ভাউচারটি ইতিমধ্যে ব্যবহৃত হয়েছে') ||
      finalText.includes('ভুল পিন') || finalText.includes('ব্যর্থ হয়েছে');

    const isConfirmedSuccess =
      !isFailed && (
        finalText.includes('Transaction Successful') || finalText.includes('Payment Successful') ||
        finalText.includes('Redemption Successful') || finalText.includes('Thank you') ||
        finalText.includes('Invoice') || finalText.includes('লেনদেন সফল') ||
        finalText.includes('পেমেন্ট সফল') || finalUrl.includes('success') ||
        finalUrl.includes('receipt') || finalUrl.includes('invoice')
      );

    if (isFailed || (!isConfirmedSuccess && (finalText.toLowerCase().includes('serial') || finalText.toUpperCase().includes('PIN')))) {
      let reasonMsg = 'UniPin Voucher redemption failed: Voucher is invalid, expired, or already used.';
      if (finalText.includes('Consumed Voucher') || finalUrl.includes('Consumed') ||
        finalText.includes('Voucher already used') || finalText.includes('ব্যবহৃত')) {
        reasonMsg = 'UniPin Voucher is ALREADY USED / CONSUMED (ইতিমধ্যেই ব্যবহৃত ভাউচার).';
      } else if (finalText.includes('Invalid serial') || finalText.includes('ভুল')) {
        reasonMsg = 'UniPin Voucher Serial or PIN is INVALID.';
      } else if (finalText.includes('Cloudflare') || finalText.includes('Security Check')) {
        reasonMsg = 'UniPin Gateway blocked by Cloudflare/CAPTCHA.';
      }
      console.error(`[UniPin Worker] ❌ ${reasonMsg}`);
      return { success: false, message: reasonMsg, errorReason: 'INVALID_VOUCHER', voucherType, playerName };
    }

    const orderId = `UP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`[UniPin Worker] ✅ Success! OrderID: ${orderId}`);
    return {
      success: true,
      message: `Top-up of ${diamondLabel} successfully redeemed for Player ${playerName} (UID: ${uid})!`,
      voucherType,
      playerName,
      orderId,
    };

  } catch (error: any) {
    console.error('[UniPin Worker] Automation error:', error?.message);
    return {
      success: false,
      message: `UniPin automation worker error: ${error?.message || 'Gateway connection issue'}.`,
      errorReason: 'WORKER_ERROR',
      voucherType,
      playerName,
    };
  } finally {
    try { await page.close(); } catch {}
  }
}
