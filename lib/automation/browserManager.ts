// lib/automation/browserManager.ts
import { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteerExtra.use(StealthPlugin());

let globalBrowser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-component-extensions-with-background-pages',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-hang-monitor',
  '--disable-notifications',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--no-first-run',
  '--password-store=basic',
  '--use-mock-keychain',
];

/**
 * Returns a persistent singleton Browser instance.
 * Automatically restarts if closed or disconnected.
 */
export async function getBrowser(): Promise<Browser> {
  if (globalBrowser && globalBrowser.connected) {
    return globalBrowser;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  browserLaunchPromise = (async () => {
    try {
      console.log('[BrowserManager] Launching shared Puppeteer browser...');
      const browser = (await puppeteerExtra.launch({
        headless: true,
        args: BROWSER_ARGS,
      })) as unknown as Browser;

      browser.on('disconnected', () => {
        console.warn('[BrowserManager] Browser disconnected. Will recreate on next request.');
        globalBrowser = null;
        browserLaunchPromise = null;
      });

      globalBrowser = browser;
      return browser;
    } catch (err) {
      globalBrowser = null;
      browserLaunchPromise = null;
      throw err;
    } finally {
      browserLaunchPromise = null;
    }
  })();

  return browserLaunchPromise;
}

/**
 * Executes a task inside an isolated browser Page with asset blocking.
 * Page is always closed after the task completes.
 */
export async function withBrowserPage<T>(
  task: (page: Page) => Promise<T>,
  options: { blockAssets?: boolean; userAgent?: string } = {}
): Promise<T> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      options.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // Only intercept if explicitly requested with blockAssets: true
    if (options.blockAssets === true) {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });
    }

    return await task(page);
  } finally {
    try {
      await page.close();
    } catch {
      // Ignore close errors
    }
  }
}
