import { withBrowserPage } from '../lib/automation/browserManager';

async function probeGarenaPPC() {
  console.log('Probing shop.garena.my for Garena Shells / Prepaid Card channels...');
  await withBrowserPage(async (page) => {
    await page.goto('https://shop.garena.my/app/100067/idlogin', { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Login with UID
    await page.waitForSelector('input[placeholder*="player ID"], input.form-input', { timeout: 8000 });
    await page.type('input[placeholder*="player ID"], input.form-input', '8027150707', { delay: 15 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) { if (b.innerText.includes('Login')) { b.click(); return; } }
    });

    await new Promise(r => setTimeout(r, 3000));
    
    // Extract all payment channels & denominations available
    const pageData = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a, div, span, li, p'));
      const textList = elements.map(el => (el as HTMLElement).innerText || el.textContent || '').filter(t => t.trim().length > 0 && t.trim().length < 50);
      return {
        url: window.location.href,
        uniqueTexts: Array.from(new Set(textList)),
      };
    });

    console.log('Current URL:', pageData.url);
    console.log('Available elements/texts on Garena Shop:', pageData.uniqueTexts.slice(0, 30));
  });
}

probeGarenaPPC().catch(console.error);
