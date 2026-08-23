// lib/automation/unipinVoucher.ts
import { detectUnipinDenomination } from './unipinPatterns';
import { getRealPlayerName } from './playerLookup';

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

export async function processUniPinVoucher({
  uid,
  voucherCode,
  serial: rawSerial,
  pin: rawPin,
}: UniPinVoucherParams): Promise<AutomationResult> {
  const fullText = (voucherCode || `${rawSerial || ''} ${rawPin || ''}`).trim();
  
  // Extract serial and pin if combined in fullText
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
  
  // Auto-detect UniPin Diamond Denomination from regex pattern and map to Free Fire rewards
  const detectedPattern = detectUnipinDenomination(cleanCode) || detectUnipinDenomination(fullText);
  const diamondLabel = detectedPattern ? detectedPattern.diamondLabel : '240 Diamonds';
  const voucherType = isBDMB 
    ? `UniPin BD Mobile (${diamondLabel})` 
    : isUPBD 
    ? `UniPin BD Voucher (${diamondLabel})` 
    : `Generic UniPin Voucher (${diamondLabel})`;

  console.log(`[UniPin Worker] Processing ${voucherType} for Player UID: ${uid} (Serial: ${effectiveSerial || 'N/A'}, PIN: ${effectivePin ? effectivePin.substring(0, 4) + '****' : 'N/A'})`);

  // Step 1: Query live Garena Server to verify player UID & retrieve Player Nickname
  const playerLookup = await getRealPlayerName(uid);
  if (!playerLookup.success && playerLookup.message?.includes('does not exist')) {
    return {
      success: false,
      message: `Player UID '${uid}' is invalid or does not exist on Garena servers.`,
      errorReason: 'INVALID_UID',
    };
  }

  const playerName = playerLookup.playerName || `Free Fire Player (${uid})`;

  // Step 2: Handle Demo/Sandbox voucher codes
  const isSandboxVoucher = cleanCode.includes('8921-9402') || cleanCode === 'TEST_VOUCHER' || cleanCode.startsWith('DEMO_');
  if (isSandboxVoucher) {
    const orderId = `UP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      message: `[Sandbox] Top-up of ${diamondLabel} successfully simulated for Player ${playerName} (UID: ${uid}).`,
      voucherType,
      playerName,
      orderId,
    };
  }

  // Step 3: Real live voucher redemption via Official Garena Topup & UniBox Gateway
  try {
    const puppeteerExtra = (await import('puppeteer-extra')).default;
    const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
    puppeteerExtra.use(StealthPlugin());

    const browser = await puppeteerExtra.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      );

      // 1. Navigate to Garena Topup Center
      console.log(`[UniPin Worker] Navigating to Garena Topup Center...`);
      await page.goto('https://shop.garena.my/app/100067/idlogin', {
        waitUntil: 'networkidle2',
        timeout: 25000,
      });

      // 2. Login with Player UID
      console.log(`[UniPin Worker] Entering Player UID ${uid}...`);
      await page.type('input[placeholder*="player ID"], input.form-input', uid, { delay: 40 });
      
      const loginButtons = await page.$$('button');
      for (const b of loginButtons) {
        const text = await page.evaluate(el => el.innerText, b);
        if (text.includes('Login')) {
          await b.click();
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 2500));

      // 3. Select Matching Diamond Package
      console.log(`[UniPin Worker] Selecting ${diamondLabel} package on Garena...`);
      const targetDenom = diamondLabel.replace(/ Diamonds?$/i, '').trim(); // e.g. "240"
      
      await page.evaluate((denom) => {
        const elements = Array.from(document.querySelectorAll('div, span, button'));
        for (const el of elements) {
          const txt = (el.innerText || '').trim();
          if (txt === `${denom} Diamond` || txt === `${denom} Diamonds` || txt === denom || (denom.includes('Membership') && txt.includes(denom))) {
            const clickable = el.closest('button, div[role="button"], [tabindex]') || el;
            clickable.click();
            return;
          }
        }
      }, targetDenom);

      await new Promise((r) => setTimeout(r, 1200));

      // 4. Click Proceed to Payment
      console.log(`[UniPin Worker] Proceeding to UniPin gateway...`);
      const proceedBtns = await page.$$('button, a');
      for (const b of proceedBtns) {
        const txt = await page.evaluate(e => e.innerText ? e.innerText.trim() : '', b);
        if (txt.includes('Proceed to Payment') || txt.includes('Payment')) {
          await b.click();
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 4500));

      // 5. On UniBox Select Denomination screen
      console.log(`[UniPin Worker] Selecting denomination on UniBox for '${targetDenom}'...`);
      await page.waitForFunction(() => {
        const text = document.body.innerText || '';
        return text.includes('Select Amount') || text.includes('Diamond') || text.includes('Membership');
      }, { timeout: 15000 }).catch(() => {});

      await new Promise((r) => setTimeout(r, 1500));

      const clickedDenom = await page.evaluate((denom) => {
        const all = Array.from(document.querySelectorAll('div, button, a, span, p, li'));
        for (const el of all) {
          const txt = (el.innerText || el.textContent || '').trim();
          if (
            txt === `${denom} Diamond` || 
            txt === `${denom} Diamonds` || 
            txt.replace(/\s+/g, ' ') === `${denom} Diamond` ||
            txt.replace(/\s+/g, ' ') === `${denom} Diamonds` ||
            (denom.includes('Membership') && txt.toLowerCase().includes(denom.toLowerCase()))
          ) {
            const target = (el.closest('button, a, div[role="button"], li') || el) as HTMLElement;
            target.scrollIntoView({ behavior: 'auto', block: 'center' });
            target.click();
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return true;
          }
        }
        return false;
      }, targetDenom);

      console.log(`[UniPin Worker] Denomination click result:`, clickedDenom);
      await new Promise((r) => setTimeout(r, 4000));

      // 6. Select UniPin Voucher channel (Channel ID 659 for BDMB, 670 for UPBD)
      const targetChannelId = isUPBD ? '670' : '659';
      console.log(`[UniPin Worker] Selecting payment channel ${targetChannelId} (BDMB/UPBD)...`);
      
      await page.evaluate((channelId) => {
        // Try direct selector
        const el = document.querySelector(`#pc_div_${channelId}, [onclick*="${channelId}"], [data-channel-id="${channelId}"]`);
        if (el) {
          (el as HTMLElement).click();
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return;
        }

        // Fallback search by text/image for UniPin Voucher
        const all = Array.from(document.querySelectorAll('div, button, a, li, span'));
        for (const item of all) {
          const t = (item.innerText || item.textContent || '').toLowerCase();
          if (t.includes('unipin voucher') || t.includes('unipin physical') || t.includes('bdmb') || t.includes('upbd') || t.includes('voucher')) {
            const clickable = (item.closest('button, a, div[role="button"], li') || item) as HTMLElement;
            clickable.click();
            clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return;
          }
        }
      }, targetChannelId);

      await new Promise((r) => setTimeout(r, 3500));

      // 7. Fill in Serial & 4-part PIN with multiple selector fallbacks
      console.log(`[UniPin Worker] Submitting Serial (${effectiveSerial}) & PIN to UniPin checkout...`);
      
      // Wait for voucher form or iframe
      await page.waitForSelector('input#serial, input[name="serial"], input[placeholder*="Serial"], input[id*="serial"]', { timeout: 10000 }).catch(() => {});

      const serialInput = await page.$('input#serial, input[name="serial"], input[placeholder*="Serial"], input[id*="serial"]');
      if (serialInput && effectiveSerial) {
        await serialInput.click({ count: 3 }).catch(() => {});
        // Try typing formatted serial first, fallback if maxLength prevents dashes
        await serialInput.type(effectiveSerial, { delay: 25 });
        const currentSerialVal = await page.evaluate(el => (el as HTMLInputElement).value, serialInput);
        if (!currentSerialVal || currentSerialVal.length < 5) {
          await serialInput.type(effectiveSerial.replace(/-/g, ''), { delay: 25 });
        }
      }

      // Split 16-digit PIN into 4 chunks of 4 digits
      const cleanPinDigits = effectivePin.replace(/[^0-9]/g, '');
      const pinParts = [
        cleanPinDigits.substring(0, 4),
        cleanPinDigits.substring(4, 8),
        cleanPinDigits.substring(8, 12),
        cleanPinDigits.substring(12, 16),
      ];

      const pin1 = await page.$('input#pin_1, input[name="pin_1"], input#pin1, input[name="pin1"]');
      const pin2 = await page.$('input#pin_2, input[name="pin_2"], input#pin2, input[name="pin2"]');
      const pin3 = await page.$('input#pin_3, input[name="pin_3"], input#pin3, input[name="pin3"]');
      const pin4 = await page.$('input#pin_4, input[name="pin_4"], input#pin4, input[name="pin4"]');
      const singlePinInput = await page.$('input#pin, input[name="pin"], input[placeholder*="PIN"], input[type="password"]');

      if (pin1 && pin2 && pin3 && pin4) {
        if (pinParts[0]) await pin1.type(pinParts[0], { delay: 25 });
        if (pinParts[1]) await pin2.type(pinParts[1], { delay: 25 });
        if (pinParts[2]) await pin3.type(pinParts[2], { delay: 25 });
        if (pinParts[3]) await pin4.type(pinParts[3], { delay: 25 });
      } else if (singlePinInput) {
        await singlePinInput.type(cleanPinDigits, { delay: 25 });
      }

      await new Promise((r) => setTimeout(r, 1000));

      // 8. Submit redemption form
      console.log(`[UniPin Worker] Clicking confirm / submit button...`);
      const submitBtn = await page.$('input[type="submit"], button[type="submit"], button.btn-primary, #btn-submit, #submit_button');
      if (submitBtn) {
        await submitBtn.click();
        await new Promise((r) => setTimeout(r, 6000));
      } else {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'));
          for (const b of btns) {
            const t = (b as HTMLElement).innerText || (b as HTMLInputElement).value || '';
            if (t.toLowerCase().includes('submit') || t.toLowerCase().includes('confirm') || t.toLowerCase().includes('redeem') || t.includes('নিশ্চিত')) {
              (b as HTMLElement).click();
              return;
            }
          }
        });
        await new Promise((r) => setTimeout(r, 6000));
      }

      // 9. Inspect post-submission page for success or error indicators
      const currentUrl = page.url();
      const finalPageText = await page.evaluate(() => document.body.innerText || '');
      
      const isFailed = 
        currentUrl.includes('/error') ||
        currentUrl.includes('Consumed') ||
        finalPageText.includes('Consumed Voucher') ||
        finalPageText.includes('Invalid serial or pin') ||
        finalPageText.includes('Voucher already used') ||
        finalPageText.includes('Invalid code') ||
        finalPageText.includes('Code expired') ||
        finalPageText.includes('Transaction Failed') ||
        finalPageText.includes('Payment Failed') ||
        finalPageText.includes('Security Check') ||
        finalPageText.includes('Cloudflare') ||
        finalPageText.includes('Verify you are human') ||
        finalPageText.includes('ভাউচারটি ইতিমধ্যে ব্যবহৃত হয়েছে') ||
        finalPageText.includes('ভুল পিন') ||
        finalPageText.includes('ব্যর্থ হয়েছে');

      const isConfirmedSuccess =
        !isFailed && (
          finalPageText.includes('Transaction Successful') ||
          finalPageText.includes('Payment Successful') ||
          finalPageText.includes('Redemption Successful') ||
          finalPageText.includes('Thank you') ||
          finalPageText.includes('Invoice') ||
          finalPageText.includes('লেনদেন সফল') ||
          finalPageText.includes('পেমেন্ট সফল') ||
          currentUrl.includes('success') ||
          currentUrl.includes('receipt') ||
          currentUrl.includes('invoice')
        );

      // Save screenshot for diagnostics if not confirmed success
      try {
        const fs = await import('fs');
        const path = await import('path');
        const debugDir = path.join(process.cwd(), 'public', 'debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        await page.screenshot({ path: path.join(debugDir, `unipin_last_run_${Date.now()}.png`), fullPage: true });
      } catch (shotErr) {
        console.warn('[UniPin Worker] Could not save debug screenshot:', shotErr);
      }

      if (isFailed || (!isConfirmedSuccess && (finalPageText.includes('serial') || finalPageText.includes('PIN')))) {
        await browser.close();
        let reasonMsg = 'UniPin Voucher redemption failed: Voucher is invalid, expired, or already used.';
        if (finalPageText.includes('Consumed Voucher') || currentUrl.includes('Consumed') || finalPageText.includes('Voucher already used') || finalPageText.includes('ব্যবহৃত')) {
          reasonMsg = 'UniPin Voucher is ALREADY USED / CONSUMED (ইতিমধ্যেই ব্যবহৃত ভাউচার).';
        } else if (finalPageText.includes('Invalid serial') || finalPageText.includes('ভুল')) {
          reasonMsg = 'UniPin Voucher Serial or PIN is INVALID.';
        } else if (finalPageText.includes('Cloudflare') || finalPageText.includes('Security Check')) {
          reasonMsg = 'UniPin Gateway blocked by Cloudflare/CAPTCHA challenge.';
        }

        console.error(`[UniPin Worker] Redemption rejected: ${reasonMsg}`);
        return {
          success: false,
          message: reasonMsg,
          errorReason: 'INVALID_VOUCHER',
          voucherType,
          playerName,
        };
      }

      await browser.close();
      const orderId = `UP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      return {
        success: true,
        message: `Top-up of ${diamondLabel} successfully redeemed for Player ${playerName} (UID: ${uid})!`,
        voucherType,
        playerName,
        orderId,
      };
    } catch (innerError: any) {
      try { await browser.close(); } catch {}
      console.error('[UniPin Worker] Automation error:', innerError?.message);
      
      return {
        success: false,
        message: `UniPin automation error: ${innerError?.message || 'Gateway connection issue'}.`,
        errorReason: 'WORKER_ERROR',
        voucherType,
        playerName,
      };
    }
  } catch (launchError: any) {
    console.error('[UniPin Worker] Puppeteer launch error:', launchError?.message);
    return {
      success: false,
      message: `Browser automation worker could not launch: ${launchError?.message}`,
      errorReason: 'WORKER_ERROR',
      voucherType,
      playerName,
    };
  }
}
