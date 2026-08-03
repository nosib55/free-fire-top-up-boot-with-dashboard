import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// stealth plugin used to avoid detection by websites that block automated browsers
puppeteer.use(StealthPlugin());

interface TopupParams {
  uid: string;
  serial: string;
  pin: string;
}

export async function executeGarenaTopup({ uid, serial, pin }: TopupParams) {
  // browser will run in headless mode (in the background), change to false if you want to see it
  const browser = await puppeteer.launch({
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

    // Set viewport size to mimic a real user
    await page.setViewport({ width: 1280, height: 800 });

    // Set user agent to mimic a real user
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    );

    // Navigate to Garena Shop
    console.log('Navigating to Garena Shop...');
    await page.goto('https://shop.garena.sg/?channel=201000', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for 2 seconds to ensure the page is fully loaded and any potential 403 errors are avoided
    await new Promise(r => setTimeout(r, 2000));

    // here you would add the steps to fill in the UID, serial, and pin, and submit the form. 
    console.log('Filling up user details...');

    // typing uid feild 
    await page.waitForSelector('input[placeholder*="UID"]');
    await page.type('input[placeholder*="UID"]', uid, { delay: 100 });

    // typing pin or password field
    await page.waitForSelector('input[placeholder*="Password"]');
    await page.type('input[placeholder*="Password"]', pin, { delay: 80 });

    // clicking confirm or redeem button
    await page.click('button[type="submit"]');

    // সফলভাবে সাবমিট হওয়ার জন্য ৫ সেকেন্ড অপেক্ষা
    await new Promise(r => setTimeout(r, 3000));

    await browser.close();

    return {
      success: true,
      message: 'Automation top-up executed successfully without 403 error!',
    };
  } catch (error: unknown) {
    await browser.close();
    throw new Error((error as Error).message || 'Automation failed');
  }
}
