import { withBrowserPage } from '../lib/automation/browserManager';

async function testGarenaRedeemTab() {
  await withBrowserPage(async (page) => {
    await page.goto('https://shop.garena.my/app/100000/login', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Close login popup if any, or click Redeem
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"], .close, [class*="close"]');
      if (closeBtn) (closeBtn as HTMLElement).click();
      
      const allEls = Array.from(document.querySelectorAll('button, div, span, a'));
      for (const el of allEls) {
        if ((el.textContent || '').trim() === 'Redeem') {
          (el as HTMLElement).click();
          return;
        }
      }
    });

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'public/debug/garena_shell_redeem_tab.png', fullPage: true });

    const redeemText = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div, span, button, input, p')).map(el => (el as HTMLElement).innerText || el.textContent || '').filter(t => t.trim().length > 0 && t.trim().length < 50);
    });

    console.log('Redeem tab texts:', Array.from(new Set(redeemText)));
  });
}

testGarenaRedeemTab().catch(console.error);
