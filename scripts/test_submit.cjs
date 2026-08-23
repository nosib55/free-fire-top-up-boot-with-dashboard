const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteerExtra.use(StealthPlugin());

async function testSubmit() {
  const uid = '8027150707';
  const serial = 'BDMB-I-S-04007816';
  const pin = '1662312222257775';
  const denom = '240';

  const debugDir = path.join(__dirname, '..', 'public', 'debug');
  if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });

  console.log('=== FULL LIVE REDEMPTION TEST ===');
  console.log(`UID: ${uid}, Serial: ${serial}, PIN: ${pin}`);

  const browser = await puppeteerExtra.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  try {
    // 1. Garena Login
    console.log('[Step 1] Logging into Garena with UID...');
    await page.goto('https://shop.garena.my/app/100067/idlogin', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.type('input[placeholder*="player ID"], input.form-input', uid, { delay: 40 });
    
    const loginButtons = await page.$$('button');
    for (const b of loginButtons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text.includes('Login')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 3000));

    // 2. Select 240 Diamonds
    console.log('[Step 2] Selecting 240 Diamonds on Garena...');
    await page.evaluate((d) => {
      const elements = Array.from(document.querySelectorAll('div, span, button'));
      for (const el of elements) {
        const txt = (el.innerText || '').trim();
        if (txt === `${d} Diamond` || txt === `${d} Diamonds` || txt === d) {
          const clickable = el.closest('button, div[role="button"], [tabindex]') || el;
          clickable.click();
          return;
        }
      }
    }, denom);
    await new Promise(r => setTimeout(r, 1500));

    // 3. Click Proceed to Payment
    console.log('[Step 3] Proceeding to Payment...');
    const proceedBtns = await page.$$('button, a');
    for (const b of proceedBtns) {
      const txt = await page.evaluate(e => e.innerText ? e.innerText.trim() : '', b);
      if (txt.includes('Proceed to Payment') || txt.includes('Payment')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 5000));

    // 4. Click Denomination on UniBox
    console.log('[Step 4] Clicking 240 Diamond on UniBox...');
    await page.evaluate((d) => {
      const all = Array.from(document.querySelectorAll('div, button, a, span, p, li'));
      for (const el of all) {
        const txt = (el.innerText || el.textContent || '').trim();
        if (
          txt === `${d} Diamond` || 
          txt === `${d} Diamonds` || 
          txt.replace(/\s+/g, ' ') === `${d} Diamond`
        ) {
          const target = el.closest('button, a, div[role="button"], li') || el;
          target.click();
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return;
        }
      }
    }, denom);
    await new Promise(r => setTimeout(r, 4000));

    // 5. Click UniPin Voucher channel (Channel 659)
    console.log('[Step 5] Clicking UniPin Voucher Channel (659)...');
    const checkoutUrl = await page.evaluate(() => {
      const el = document.querySelector('#pc_div_659, [onclick*="659"]');
      if (el) {
        const oc = el.getAttribute('onclick') || '';
        const m = oc.match(/'([^']+)'/);
        if (m) return m[1];
      }
      return null;
    });

    if (checkoutUrl) {
      console.log('Navigating directly to checkout URL:', checkoutUrl);
      await page.goto(checkoutUrl, { waitUntil: 'networkidle2' });
    } else {
      await page.evaluate(() => {
        const el = document.querySelector('#pc_div_659, [onclick*="659"]');
        if (el) el.click();
      });
      await new Promise(r => setTimeout(r, 4000));
    }

    // 6. Enter Serial and PIN
    console.log('[Step 6] Entering Serial and PIN on UniPin Form...');
    await page.waitForSelector('input#serial, input[name="serial"]', { timeout: 10000 });
    
    // Type serial
    const serialInput = await page.$('input#serial, input[name="serial"]');
    if (serialInput) {
      await serialInput.click({ clickCount: 3 });
      await serialInput.type(serial, { delay: 30 });
    }

    // Type 4-part PIN
    const pinParts = [
      pin.substring(0, 4),
      pin.substring(4, 8),
      pin.substring(8, 12),
      pin.substring(12, 16),
    ];

    const pin1 = await page.$('input#pin_1, input[name="pin_1"]');
    const pin2 = await page.$('input[name="pin_2"]');
    const pin3 = await page.$('input[name="pin_3"]');
    const pin4 = await page.$('input[name="pin_4"]');

    if (pin1) await pin1.type(pinParts[0], { delay: 30 });
    if (pin2) await pin2.type(pinParts[1], { delay: 30 });
    if (pin3) await pin3.type(pinParts[2], { delay: 30 });
    if (pin4) await pin4.type(pinParts[3], { delay: 30 });

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(debugDir, 'live_before_submit.png') });
    console.log('Form filled. Screenshot saved to live_before_submit.png');

    // 7. Click Submit
    console.log('[Step 7] Clicking Submit button...');
    const submitBtn = await page.$('input[type="submit"], button[type="submit"], button.btn-primary');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.evaluate(() => {
        const btn = document.querySelector('input[type="submit"], button[type="submit"]');
        if (btn) btn.click();
      });
    }

    console.log('Waiting 8 seconds for UniPin gateway response...');
    await new Promise(r => setTimeout(r, 8000));
    await page.screenshot({ path: path.join(debugDir, 'live_after_submit.png'), fullPage: true });

    const finalPageText = await page.evaluate(() => document.body.innerText);
    const finalUrl = page.url();

    console.log('=== UNIPIN GATEWAY FINAL RESULT ===');
    console.log('Final URL:', finalUrl);
    console.log('Final Page Text snippet:\n', finalPageText.replace(/\n\s*\n/g, '\n').substring(0, 800));

  } catch (err) {
    console.error('Execution error:', err);
    await page.screenshot({ path: path.join(debugDir, 'live_error.png') });
  } finally {
    await browser.close();
    console.log('Test finished.');
  }
}

testSubmit();
