import { withBrowserPage } from '../lib/automation/browserManager';

async function testGarenaShellLogin() {
  await withBrowserPage(async (page) => {
    await page.goto('https://shop.garena.my/app/100000/login', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Screenshot to see the login options for Shell Top Up
    await page.screenshot({ path: 'public/debug/garena_shell_login.png', fullPage: true });
    
    const textList = await page.evaluate(() => {
      return Array.from(new Set(Array.from(document.querySelectorAll('*')).map(el => (el as HTMLElement).innerText || el.textContent || '').filter(t => t.trim().length > 0 && t.trim().length < 60)));
    });

    console.log('Garena Shell Login Page text:', textList.slice(0, 30));
  });
}

testGarenaShellLogin().catch(console.error);
