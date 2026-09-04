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


  // Step 2: Sandbox & Demo Test Detection
  const isSandboxVoucher =
    cleanCode.includes('8921-9402') ||
    cleanCode.includes('89219402') ||
    cleanCode.includes('TEST_VOUCHER') ||
    cleanCode.includes('DEMO_') ||
    fullText.includes('8921-9402') ||
    fullText.includes('DEMO');
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

    const targetDenom = diamondLabel.replace(/ Diamonds?$/i, '').trim();

    // ── 1. Garena Shop — Navigate to modern SPA ──
    console.log(`[UniPin Worker] Navigating to Garena Topup Center SPA...`);
    const garenaCookies = await page.cookies('https://shop.garena.my').catch(() => []);
    if (garenaCookies.length > 0) {
      await page.deleteCookie(...garenaCookies).catch(() => {});
    }
    await page.goto('https://shop.garena.my/?app=100067', {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });

    // ── 2. Click Player ID and Enter UID ──
    console.log(`[UniPin Worker] Selecting Player ID login...`);
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, div, span, a'));
      for (const el of els) {
        if (((el as HTMLElement).innerText || el.textContent || '').trim() === 'Player ID') {
          (el as HTMLElement).click();
          return;
        }
      }
    });

    await page.waitForSelector('input[placeholder*="player ID"], input.form-input, input[type="text"]', {
      timeout: 10000,
    });
    const uidInput = await page.$('input[placeholder*="player ID"], input.form-input, input[type="text"]');
    if (uidInput) {
      await uidInput.type(uid, { delay: 15 });
    }

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const t = (b.innerText || '').trim();
        if (t === 'Login' || t === 'Confirm' || t === 'Submit') {
          b.click();
          return;
        }
      }
    });

    // Wait for account + package list or error prompt
    await page.waitForFunction(
      () => {
        const text = document.body.innerText || '';
        return (
          text.includes('Username:') ||
          text.includes('Player ID') ||
          text.includes('Diamond') ||
          text.includes('Top-up Amount') ||
          text.includes('does not exist') ||
          text.includes('Invalid') ||
          text.includes('Only For BD Region')
        );
      },
      { timeout: 8000 }
    ).catch(() => {});

    // Check for early UID errors
    const earlyPageText = await page.evaluate(() => document.body.innerText || '');
    if (earlyPageText.includes('does not exist') || earlyPageText.includes('Player ID does not exist') || earlyPageText.includes('Invalid Player ID')) {
      console.error(`[UniPin Worker] ❌ Player UID ${uid} does not exist on Garena.`);
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
      return {
        success: false,
        errorReason: 'ONLY_FOR_BD_REGION',
        message: 'Only For BD Region! Free Fire account is not registered in Bangladesh.',
        voucherType,
        playerName,
      };
    }

    // Extract real in-game player name
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
      console.log(`[UniPin Worker] ✅ Real Player Name: ${playerName}`);
    }

    // ── 3. Select Diamond Package ──
    console.log(`[UniPin Worker] Selecting ${diamondLabel} (${targetDenom})...`);
    await page.evaluate((denom) => {
      const els = Array.from(document.querySelectorAll('div, span, button, li, p'));
      for (const el of els) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (
          txt === `${denom} Diamond` ||
          txt === `${denom} Diamonds` ||
          txt === denom ||
          (denom.includes('Membership') && txt.includes(denom))
        ) {
          const clickable = el.closest('button, div[role="button"], [tabindex], li') || el;
          (clickable as HTMLElement).click();
          return;
        }
      }
    }, targetDenom);

    await new Promise((r) => setTimeout(r, 800));

    // ── 4. Proceed to Payment ──
    console.log(`[UniPin Worker] Clicking Proceed to Payment...`);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      for (const b of btns) {
        const txt = ((b as HTMLElement).innerText || '').trim();
        if (
          txt.includes('Proceed to Payment') ||
          txt.includes('Payment') ||
          txt.includes('Proceed') ||
          txt.includes('পেমেন্ট')
        ) {
          (b as HTMLElement).click();
          return;
        }
      }
    });

    // Wait for UniBox navigation or popup tab
    await new Promise((r) => setTimeout(r, 4000));

    let uniboxPage: Page = page;
    try {
      const allPages = (await browser.pages()) as unknown as Page[];
      const uniboxTab = allPages.find((p) => {
        try {
          const url = (p as any).url ? (p as any).url() : '';
          return url.includes('unipin.com') || url.includes('unibox');
        } catch {
          return false;
        }
      });

      if (uniboxTab && uniboxTab !== page) {
        console.log(`[UniPin Worker] UniBox opened in popup tab!`);
        uniboxPage = uniboxTab;
      } else {
        console.log(`[UniPin Worker] UniBox on current page. URL: ${page.url()}`);
      }
    } catch {}

    // ── 5. Wait for UniBox denomination screen & select amount ──
    console.log(`[UniPin Worker] Waiting for UniBox denomination screen...`);
    await uniboxPage.waitForFunction(
      () => {
        const text = document.body.innerText || '';
        return (
          text.includes('Select Amount') ||
          text.includes('Diamond') ||
          text.includes('UniPin') ||
          text.includes('Select Payment Channel')
        );
      },
      { timeout: 15000 }
    ).catch(() => {});

    // If on amount selection screen, click the denomination
    console.log(`[UniPin Worker] Selecting denomination '${targetDenom}' on UniBox...`);
    await uniboxPage.evaluate((denom) => {
      const all = Array.from(document.querySelectorAll('div, button, a, span, p, li'));
      for (const el of all) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (
          txt === `${denom} Diamond` ||
          txt === `${denom} Diamonds` ||
          txt.replace(/\s+/g, ' ') === `${denom} Diamond` ||
          txt === denom
        ) {
          const target = (el.closest('button, a, div[role="button"], li') || el) as HTMLElement;
          target.click();
          return true;
        }
      }
      return false;
    }, targetDenom).catch(() => {});

    await new Promise((r) => setTimeout(r, 3000));

    // ── 6. On Channel Select Page — Expand Physical Vouchers & Click Target Sub-channel ──
    console.log(
      `[UniPin Worker] Selecting ${isUPBD ? 'UP Gift Card (UPBD)' : 'UniPin Voucher (BDMB)'} channel...`
    );

    // Expand Physical Vouchers accordion if collapsed
    await uniboxPage.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      for (const el of all) {
        if ((el as HTMLElement).innerText && (el as HTMLElement).innerText.trim() === 'Physical Vouchers') {
          (el as HTMLElement).click();
          return;
        }
      }
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Click the specific voucher item: UP Gift Card (for UPBD) or UniPin Voucher (for BDMB)
    const targetChannelName = isUPBD ? 'UP Gift Card' : 'UniPin Voucher';
    await uniboxPage.evaluate((channelName) => {
      const all = Array.from(
        document.querySelectorAll(
          '.payment-channel-name, .payment-channel-button, button, a, div[role="button"], li'
        )
      );
      for (const el of all) {
        const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (txt === channelName || txt.includes(channelName)) {
          const clickable = (el.closest('.payment-channel-button, button, a') || el) as HTMLElement;
          clickable.click();
          return true;
        }
      }
      return false;
    }, targetChannelName);

    await new Promise((r) => setTimeout(r, 3000));

    // ── 7. Wait for Serial & PIN Form ──
    console.log(`[UniPin Worker] Waiting for Serial/PIN input form...`);
    const FORM_SELECTOR = 'input[name="serial"], input#serial, input[placeholder*="Serial"], input[placeholder*="UPBD"], input[placeholder*="BDMB"]';

    let formFound = false;
    try {
      await uniboxPage.waitForSelector(FORM_SELECTOR, { timeout: 12000 });
      formFound = true;
      console.log(`[UniPin Worker] ✅ Serial/PIN form found!`);
    } catch {
      await saveDebugScreenshot(uniboxPage, 'form_not_found');
      console.error('[UniPin Worker] ❌ Serial/PIN form NOT found.');
      return {
        success: false,
        message: 'UniPin voucher form could not load on gateway.',
        errorReason: 'WORKER_ERROR',
        voucherType,
        playerName,
      };
    }

    // ── 8. Fill Serial ──
    console.log(`[UniPin Worker] Filling Serial: ${effectiveSerial}...`);
    const serialInput = await uniboxPage.$(FORM_SELECTOR);
    if (serialInput && effectiveSerial) {
      await serialInput.click({ count: 3 }).catch(() => {});
      await serialInput.type(effectiveSerial, { delay: 15 });
    }

    // ── 9. Fill PIN (Split into 4x4 16 digits) ──
    const cleanPinDigits = effectivePin.replace(/[^0-9]/g, '');
    const pinParts = [
      cleanPinDigits.substring(0, 4),
      cleanPinDigits.substring(4, 8),
      cleanPinDigits.substring(8, 12),
      cleanPinDigits.substring(12, 16),
    ];

    console.log(
      `[UniPin Worker] Entering 16-digit PIN across 4 boxes: [${pinParts[0] || '****'}] [${pinParts[1] || '****'}] [${pinParts[2] || '****'}] [${pinParts[3] || '****'}]`
    );

    const pin1 = await uniboxPage.$('input#pin_1, input[name="pin_1"], input#pin1');
    const pin2 = await uniboxPage.$('input#pin_2, input[name="pin_2"], input#pin2');
    const pin3 = await uniboxPage.$('input#pin_3, input[name="pin_3"], input#pin3');
    const pin4 = await uniboxPage.$('input#pin_4, input[name="pin_4"], input#pin4');
    const singlePin = await uniboxPage.$('input#pin, input[name="pin"], input[placeholder*="PIN"]');

    if (pin1 && pin2 && pin3 && pin4) {
      if (pinParts[0]) { await pin1.click({ count: 3 }).catch(() => {}); await pin1.type(pinParts[0], { delay: 15 }); }
      if (pinParts[1]) { await pin2.click({ count: 3 }).catch(() => {}); await pin2.type(pinParts[1], { delay: 15 }); }
      if (pinParts[2]) { await pin3.click({ count: 3 }).catch(() => {}); await pin3.type(pinParts[2], { delay: 15 }); }
      if (pinParts[3]) { await pin4.click({ count: 3 }).catch(() => {}); await pin4.type(pinParts[3], { delay: 15 }); }
    } else if (singlePin) {
      await singlePin.click({ count: 3 }).catch(() => {});
      await singlePin.type(cleanPinDigits, { delay: 15 });
    }

    await saveDebugScreenshot(uniboxPage, 'before_confirm');
    await new Promise((r) => setTimeout(r, 400));

    // ── 10. Click SUBMIT / CONFIRM ──
    console.log(`[UniPin Worker] Clicking SUBMIT / CONFIRM...`);
    const confirmBtn = await uniboxPage.$(
      'input[type="submit"], button[type="submit"], button.btn-primary, #btn-submit, #submit_button'
    );
    if (confirmBtn) {
      await confirmBtn.click();
    } else {
      await uniboxPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('input[type="submit"], button'));
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
      return { success: false, message: reasonMsg, errorReason: reasonCode, voucherType, playerName };
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
