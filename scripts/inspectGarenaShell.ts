import { withBrowserPage } from '../lib/automation/browserManager';

async function testGarenaShellPage() {
  console.log('Inspecting shop.garena.my shell top up...');
  await withBrowserPage(async (page) => {
    await page.goto('https://shop.garena.my/?app=100000', { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    const pageInfo = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('a, button, div, span, input'));
      return {
        url: window.location.href,
        texts: Array.from(new Set(items.map(el => (el as HTMLElement).innerText || el.textContent || '').filter(t => t.trim().length > 0 && t.trim().length < 50))),
      };
    });

    console.log('Shell Top Up URL:', pageInfo.url);
    console.log('Shell Top Up Options:', pageInfo.texts.slice(0, 30));
  });
}

testGarenaShellPage().catch(console.error);
