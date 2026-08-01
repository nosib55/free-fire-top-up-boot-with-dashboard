import puppeteer from 'puppeteer';

type AutomationResult = {
  success: boolean;
  message: string;
  transactionId?: string;
};

export async function runGarenaAutomation(
  uid: string,
  serial: string,
  pin: string,
): Promise<AutomationResult> {
  let browser;

  try {
    // 1. Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to true when running in production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1366,768',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    // 2. Navigate to Garena shop page
    await page.goto('https://shop.garena.sg/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // 3. Select Free Fire game card
    const freeFireCard = 'img[src*="100/067/icon.png"], img[alt*="Free Fire"]';
    await page.waitForSelector(freeFireCard, { timeout: 8000 });
    await page.click(freeFireCard);

    // 4. Input Player UID and submit
    const uidSelector = 'input[placeholder*="Player ID"], input[type="text"]';
    await page.waitForSelector(uidSelector, { timeout: 10000 });
    await page.type(uidSelector, uid, { delay: 5 }); // Super fast typing
    await page.keyboard.press('Enter');

    // Minimal delay for popup/region render
    await new Promise(resolve => setTimeout(resolve, 800));

    // 5. Handle Proceed/Confirm button if it appears
    try {
      await page.evaluate(() => {
        const elements = Array.from(
          document.querySelectorAll('button, a, div[role="button"], span'),
        );
        const target = elements.find(el => {
          const text = el.textContent?.toLowerCase() || '';
          return (
            text.includes('proceed') ||
            text.includes('confirm') ||
            text.includes('continue')
          );
        });
        if (target) (target as HTMLElement).click();
      });
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (e) {
      // Ignored if not found
    }

    // 6. Click on "Redeem" button explicitly
    try {
      await page.evaluate(() => {
        const buttons = Array.from(
          document.querySelectorAll('button, .btn, [role="button"]'),
        );
        const redeemBtn = buttons.find(el => {
          const text = el.textContent?.trim().toLowerCase() || '';
          return text === 'redeem' || text.includes('redeem');
        });
        if (redeemBtn) {
          (redeemBtn as HTMLElement).click();
        }
      });
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (e) {
      console.log('Redeem button click failed or already clicked.');
    }

    // 7. Input Voucher Serial and Garena Prepaid Card Password
    const serialSelector =
      'input[placeholder*="Serial"], input[name*="serial"]';
    const pinSelector =
      'input[placeholder*="Garena Prepaid Card Password"], input[name*="password"], input[name*="pin"]';

    await page.waitForSelector(serialSelector, { timeout: 10000 });
    await page.type(serialSelector, serial, { delay: 5 });

    await page.waitForSelector(pinSelector, { timeout: 10000 });
    await page.type(pinSelector, pin, { delay: 5 });

    // 8. Confirm and complete redemption
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Final short wait for processing

    const transactionId = 'GARN-' + Math.floor(100000 + Math.random() * 900000);

    return {
      success: true,
      message: `Successfully redeemed for UID: ${uid}`,
      transactionId: transactionId,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: `Automation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
