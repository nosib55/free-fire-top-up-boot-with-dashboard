import { withBrowserPage } from '../lib/automation/browserManager';

async function probeBdGamesBazar() {
  console.log('Probing bdgamesbazar.com...');
  await withBrowserPage(async (page) => {
    await page.goto('https://bdgamesbazar.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const textList = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, button, div, span, h1, h2, h3'));
      return Array.from(new Set(els.map(el => (el as HTMLElement).innerText || el.textContent || '').filter(t => t.trim().length > 0 && t.trim().length < 40)));
    });
    console.log('bdgamesbazar elements:', textList.slice(0, 30));
  });
}

probeBdGamesBazar().catch(console.error);
