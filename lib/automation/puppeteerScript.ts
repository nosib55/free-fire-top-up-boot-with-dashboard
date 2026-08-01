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
    // go to garena shop page
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // set user agent so that the bot is not blocked
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    // go to garena shop page
    await page.goto('https://shop.garena.sg/', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // to select free fire
    const freeFireCard = 'img[alt*="Free Fire"], .game-item-freefire'; // flexible
    await page.waitForSelector(freeFireCard, { timeout: 10000 });
    await page.click(freeFireCard);

    // typing the UID into the input field
    const uidSelector = 'input[placeholder*="Player ID"]';
    await page.waitForSelector(uidSelector, { timeout: 10000 });
    await page.type(uidSelector, uid, { delay: 100 });

    // click on submit button to proceed
    await page.click('button[type="submit"]');

    // click on the proceed to payment button
    const proceedBtn = 'button:has-text("Proceed to Payment"), .proceed-btn';
    await page.waitForSelector(proceedBtn, { timeout: 10000 });
    await page.click(proceedBtn);

    // click on gift card or voucher that will be select automatically  
    const giftCardOption = 'text/UP Gift Card, .gift-card-option';
    await page.waitForSelector(giftCardOption, { timeout: 10000 });
    await page.click(giftCardOption);

    // making input pin and serial number 
    const serialSelector = 'input[placeholder*="Serial"]';
    const pinSelector = 'input[placeholder*="PIN"], input[placeholder*="1234"]';

    await page.waitForSelector(serialSelector, { timeout: 10000 });
    await page.type(serialSelector, serial, { delay: 50 });

    await page.waitForSelector(pinSelector, { timeout: 10000 });
    await page.type(pinSelector, pin, { delay: 50 });

    // click on the confirm button to redeem
    const confirmBtn = 'button:has-text("CONFIRM"), button.confirm';
    await page.click(confirmBtn);

    // after confirming, wait for a success message 
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
