// lib/automation/browserManager.ts
import { Browser, BrowserContext, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteerExtra.use(StealthPlugin());

let globalBrowser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;
let idleTimer: NodeJS.Timeout | null = null;

export function getProxyConfig(): { server: string; username?: string; password?: string } | null {
  const proxyUrlStr = process.env.RESIDENTIAL_PROXY_URL || '';
  if (!proxyUrlStr) return null;
  try {
    const parsed = new URL(proxyUrlStr);
    const server = `${parsed.protocol}//${parsed.hostname}:${parsed.port}`;
    return {
      server,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    };
  } catch {
    return null;
  }
}

export async function setupPageProxy(page: Page): Promise<void> {
  const proxy = getProxyConfig();
  if (proxy && proxy.username && proxy.password) {
    try {
      await page.authenticate({
        username: proxy.username,
        password: proxy.password,
      });
    } catch {}
  }
}

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--no-zygote',
  '--no-first-run',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-component-extensions-with-background-pages',
  '--disable-default-apps',
  '--disable-hang-monitor',
  '--disable-notifications',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--enable-tcp-fast-open',
  '--ignore-certificate-errors',
  '--window-size=1280,900',
  '--js-flags=--max-old-space-size=256',
];

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (globalBrowser && globalBrowser.connected) {
      console.log('[BrowserManager] 10m idle reached. Closing shared browser to release RAM.');
      try {
        await globalBrowser.close();
      } catch {}
      globalBrowser = null;
    }
  }, 10 * 60 * 1000);
}

/**
 * Returns a persistent singleton Browser instance.
 * Automatically restarts if closed or disconnected.
 */
export async function getBrowser(): Promise<Browser> {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  if (globalBrowser && globalBrowser.connected) {
    resetIdleTimer();
    return globalBrowser;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  browserLaunchPromise = (async () => {
    try {
      const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        (process.platform === 'linux' ? '/usr/bin/google-chrome' : undefined);

      const args = [...BROWSER_ARGS];
      const proxy = getProxyConfig();
      if (proxy) {
        console.log(`[BrowserManager] Routing through residential proxy: ${proxy.server}`);
        args.push(`--proxy-server=${proxy.server}`);
      }

      console.log(`[BrowserManager] Launching optimized Chromium (executable: ${executablePath || 'default'})...`);
      const browser = (await puppeteerExtra.launch({
        headless: true,
        executablePath,
        args,
      })) as unknown as Browser;

      browser.on('targetcreated', async (target) => {
        if (target.type() === 'page') {
          try {
            const newPage = await target.page();
            if (newPage) {
              await setupPageProxy(newPage);
            }
          } catch {}
        }
      });

      browser.on('disconnected', () => {
        console.warn('[BrowserManager] Browser disconnected. Will recreate on next request.');
        globalBrowser = null;
        browserLaunchPromise = null;
      });

      globalBrowser = browser;
      resetIdleTimer();
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
 * Executes a task inside an isolated BrowserContext with C++ level CDP asset blocking.
 * Context and Page are closed automatically after completion, releasing memory.
 */
export async function withBrowserPage<T>(
  task: (page: Page) => Promise<T>,
  options: { blockAssets?: boolean; userAgent?: string } = {}
): Promise<T> {
  const browser = await getBrowser();
  // Create isolated incognito context for clean state and 0 memory bleed
  const context: BrowserContext = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    await setupPageProxy(page);
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      options.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // ZERO-OVERHEAD C++ level URL Blocking (5x faster than JS setRequestInterception)
    if (options.blockAssets !== false) {
      try {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        await client.send('Network.setBlockedURLs', {
          urls: [
            '*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.svg',
            '*.woff', '*.woff2', '*.ttf', '*.otf',
            '*.mp4', '*.mp3',
            '*google-analytics.com*', '*googletagmanager.com*', '*facebook.net*',
          ],
        });
      } catch (cdpErr) {
        console.warn('[BrowserManager] CDP Network blocking notice:', cdpErr);
      }
    }

    return await task(page);
  } finally {
    try {
      await page.close();
    } catch {}
    try {
      await context.close();
    } catch {}
  }
}
