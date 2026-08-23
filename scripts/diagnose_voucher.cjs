const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteerExtra.use(StealthPlugin());

async function runDiagnosis() {
  const uid = '8027150707';
  const serial = 'BDMB-I-S-04007816';
  const pin = '1662312222257775';
  const denom = '240';

  const debugDir = path.join(__dirname, '..', 'public', 'debug');
  if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });

  console.log('=== STARTING AUTOMATION DIAGNOSIS ===');
  console.log(`UID: ${uid}, Serial: ${serial}, PIN: ${pin.substring(0, 4)}****`);

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
    // 1. Navigate to Garena Topup Center
    console.log('[Step 1] Navigating to shop.garena.my...');
    await page.goto('https://shop.garena.my/app/100067/idlogin', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await page.screenshot({ path: path.join(debugDir, 'diag_1_garena_login.png') });

    // 2. Login with Player UID
    console.log('[Step 2] Entering UID and logging in...');
    await page.type('input[placeholder*="player ID"], input.form-input', uid, { delay: 50 });
    
    const loginButtons = await page.$$('button');
    for (const b of loginButtons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text.includes('Login')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(debugDir, 'diag_2_after_uid_login.png') });

    // 3. Select 240 Diamonds
    console.log(`[Step 3] Selecting ${denom} Diamonds...`);
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

    // 4. Click Proceed to Payment
    console.log('[Step 4] Clicking Proceed to Payment...');
    const proceedBtns = await page.$$('button, a');
    for (const b of proceedBtns) {
      const txt = await page.evaluate(e => e.innerText ? e.innerText.trim() : '', b);
      if (txt.includes('Proceed to Payment') || txt.includes('Payment')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: path.join(debugDir, 'diag_3_unibox_screen.png') });

    // 5. Inspect UniBox DOM
    console.log('[Step 5] Analyzing UniBox screen elements...');
    const uniboxText = await page.evaluate(() => document.body.innerText);
    console.log('UniBox Page text snippet:', uniboxText.replace(/\n+/g, ' ').substring(0, 300));

    // Click 240 Diamond on UniBox
    console.log('[Step 5b] Clicking 240 Diamond denomination on UniBox...');
    const clicked = await page.evaluate((d) => {
      const all = Array.from(document.querySelectorAll('div, button, a, span, p, li'));
      for (const el of all) {
        const txt = (el.innerText || el.textContent || '').trim();
        if (
          txt === `${d} Diamond` || 
          txt === `${d} Diamonds` || 
          txt.replace(/\s+/g, ' ') === `${d} Diamond` ||
          txt.replace(/\s+/g, ' ') === `${d} Diamonds`
        ) {
          const target = el.closest('button, a, div[role="button"], li') || el;
          target.click();
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        }
      }
      return false;
    }, denom);
    console.log('Clicked denomination result:', clicked);
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(debugDir, 'diag_4_after_denom_click.png') });

    // Check what is on page now
    const afterDenomText = await page.evaluate(() => document.body.innerText);
    console.log('Page text after denom click:', afterDenomText.replace(/\n+/g, ' ').substring(0, 300));

    // Inspect available payment channels / links
    const channels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[id*="pc_div"], [onclick*="pc_div"], .channel, .payment-channel, a, button'))
        .map(el => ({
          id: el.id,
          tag: el.tagName,
          text: (el.innerText || '').trim(),
          onclick: el.getAttribute('onclick') || ''
        }))
        .filter(c => c.text || c.id || c.onclick);
    });
    console.log('Available channels on page:', JSON.stringify(channels.slice(0, 10), null, 2));

    // Select BDMB / UniPin Voucher
    console.log('[Step 6] Selecting UniPin Voucher channel (659 or text)...');
    await page.evaluate(() => {
      const el = document.querySelector('#pc_div_659, [onclick*="659"], [data-channel-id="659"]');
      if (el) {
        el.click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return;
      }
      const all = Array.from(document.querySelectorAll('div, button, a, li, span'));
      for (const item of all) {
        const t = (item.innerText || item.textContent || '').toLowerCase();
        if (t.includes('unipin voucher') || t.includes('unipin physical') || t.includes('bdmb') || t.includes('voucher')) {
          const clickable = item.closest('button, a, div[role="button"], li') || item;
          clickable.click();
          clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return;
        }
      }
    });

    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(debugDir, 'diag_5_after_channel_click.png') });
    console.log('Current URL after channel selection:', page.url());

    // Check inputs on page
    const inputFields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        visible: i.offsetParent !== null
      }));
    });
    console.log('Input fields found on checkout page:', inputFields);

  } catch (err) {
    console.error('Diagnosis error:', err);
    await page.screenshot({ path: path.join(debugDir, 'diag_error.png') });
  } finally {
    await browser.close();
    console.log('Diagnosis completed. Screenshots saved in public/debug.');
  }
}

runDiagnosis();
