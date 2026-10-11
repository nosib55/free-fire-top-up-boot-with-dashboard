// lib/automation/browserManager.ts
import { Browser, BrowserContext, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { STEALTH_SCRIPT, STEALTH_USER_AGENT, STEALTH_CH_UA_HEADERS } from './stealthPatches';
import { getHealthyProxy, parseProxyUrl } from './proxyHealth';

puppeteerExtra.use(StealthPlugin());

let globalBrowser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;
let idleTimer: NodeJS.Timeout | null = null;

let proxyIndex = 0;
let currentBrowserProxy: { server: string; username?: string; password?: string } | null = null;

export function getNextProxyConfig(): { server: string; username?: string; password?: string } | null {
  const poolStr = process.env.PROXY_POOL || '';
  const fallbackStr = process.env.RESIDENTIAL_PROXY_URL || '';

  const pool = poolStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let selectedUrl = '';
  if (pool.length > 0) {
    selectedUrl = pool[proxyIndex % pool.length];
    proxyIndex++;
  } else if (fallbackStr) {
    selectedUrl = fallbackStr;
  }

  if (!selectedUrl) return null;

  try {
    const parsed = new URL(selectedUrl);
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

export function getProxyConfig(): { server: string; username?: string; password?: string } | null {
  return currentBrowserProxy || getNextProxyConfig();
}

export async function setupPageProxy(page: Page): Promise<void> {
  const proxy = currentBrowserProxy || getProxyConfig();
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
  '--disable-gpu',
  '--no-first-run',
  '--disable-notifications',
  '--ignore-certificate-errors',
  '--window-size=1920,1080',
  '--lang=en-US,en',
  // Additional DataDome bypass args
  '--disable-infobars',
  '--disable-extensions-except=',
  '--disable-default-apps',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-popup-blocking',
  '--metrics-recording-only',
  '--mute-audio',
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
      const healthyProxyUrl = await getHealthyProxy().catch(() => null);
      const proxy = healthyProxyUrl ? parseProxyUrl(healthyProxyUrl) : null;
      currentBrowserProxy = proxy;
      if (proxy) {
        console.log(`[BrowserManager] Routing through healthy proxy: ${proxy.server}`);
        args.push(`--proxy-server=${proxy.server}`);
      } else {
        console.log('[BrowserManager] 🚀 Direct connection active (bypassing dead proxy for maximum speed)');
      }

      const isHeadless = process.env.HEADLESS !== 'false';

      console.log(`[BrowserManager] Launching hardened Chromium (UA: Chrome/133) (executable: ${executablePath || 'default'})...`);
      const browser = (await puppeteerExtra.launch({
        headless: isHeadless,
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
        currentBrowserProxy = null;
      });

      globalBrowser = browser;
      resetIdleTimer();
      return browser;
    } catch (err) {
      globalBrowser = null;
      browserLaunchPromise = null;
      currentBrowserProxy = null;
      throw err;
    } finally {
      browserLaunchPromise = null;
    }
  })();

  return browserLaunchPromise;
}

export async function closeSharedBrowser(): Promise<void> {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (globalBrowser) {
    try {
      if (globalBrowser.connected) {
        await globalBrowser.close();
      }
    } catch {}
    globalBrowser = null;
  }
  currentBrowserProxy = null;
}

export async function rotateBrowser(): Promise<void> {
  console.log('[BrowserManager] Rotating browser to switch proxy IP...');
  await closeSharedBrowser();
}

/**
 * Applies advanced stealth patches + Chrome 133 headers to a page.
 * Call this on every new page before any navigation.
 */
export async function applyStealthToPage(
  page: Page,
  options: { userAgent?: string } = {}
): Promise<void> {
  // Inject advanced fingerprint patches before any JS runs on the page
  await page.evaluateOnNewDocument(STEALTH_SCRIPT);

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(options.userAgent || STEALTH_USER_AGENT);

  // Chrome 133 client hints + language headers — must match UA version
  await page.setExtraHTTPHeaders({
    ...STEALTH_CH_UA_HEADERS,
  });
}

/**
 * Executes a task inside an isolated BrowserContext.
 * Context and Page are closed automatically after completion, releasing memory.
 * Advanced stealth patches are automatically applied to each page.
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
    await applyStealthToPage(page, { userAgent: options.userAgent });

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

/**
 * Pre-warmed page pool for instant (0ms navigation) order execution.
 */
let warmPage: Page | null = null;
let warmPageContext: BrowserContext | null = null;
let isWarming = false;

export async function warmupShopPage(): Promise<void> {
  if (isWarming || (warmPage && !warmPage.isClosed())) return;
  isWarming = true;
  try {
    const browser = await getBrowser();
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await setupPageProxy(page);
    await applyStealthToPage(page);
    await page.setCookie({ name: 'region', value: 'BD', domain: '.garena.my' });
    await page.goto('https://shop.garena.my/app/100067/idlogin', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    warmPageContext = context;
    warmPage = page;
    console.log('[BrowserManager] 🔥 Warm Garena Shop page ready for instant order execution.');
  } catch (err: any) {
    console.warn('[BrowserManager] Warmup notice:', err?.message);
  } finally {
    isWarming = false;
  }
}

export async function claimWarmShopPage(): Promise<{ page: Page; context: BrowserContext } | null> {
  if (warmPage && !warmPage.isClosed() && warmPageContext) {
    const p = warmPage;
    const ctx = warmPageContext;
    warmPage = null;
    warmPageContext = null;
    // Asynchronously replenish warm page for next incoming order
    setTimeout(() => { warmupShopPage().catch(() => {}); }, 1500);
    return { page: p, context: ctx };
  }
  return null;
}

