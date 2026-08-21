// lib/automation/playerLookup.ts
export interface RealPlayerInfo {
  success: boolean;
  playerName: string;
  region?: string;
  openId?: string;
  message?: string;
}

// In-memory cache for fast lookup (24 hour expiration)
const nicknameCache = new Map<string, { info: RealPlayerInfo; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getRealPlayerName(uid: string): Promise<RealPlayerInfo> {
  const cleanUid = uid.trim();
  
  // 1. Check cache first for instant response (< 5ms)
  const cached = nicknameCache.get(cleanUid);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[PlayerLookup] Returning cached nickname for UID ${cleanUid}: ${cached.info.playerName}`);
    return cached.info;
  }

  console.log(`[PlayerLookup] Querying live Garena server for UID: ${cleanUid}`);

  try {
    const puppeteerExtra = (await import('puppeteer-extra')).default;
    const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
    puppeteerExtra.use(StealthPlugin());

    const browser = await puppeteerExtra.launch({
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
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      );

      // Navigate to Garena Top-up Portal to acquire valid session tokens
      await page.goto('https://shop.garena.my/?channel=201000', {
        waitUntil: 'networkidle2',
        timeout: 25000,
      }).catch(() => null);

      await new Promise((r) => setTimeout(r, 1200));

      // Execute in-browser API call to Garena authentication gateway
      const apiResult = await page.evaluate(async (playerUid) => {
        try {
          const response = await fetch('/api/auth/player_id_login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              app_id: 100067,
              login_id: playerUid,
              app_server_id: 0,
            }),
          });
          return await response.json();
        } catch (err: any) {
          return { error: err?.message || 'Network error' };
        }
      }, cleanUid);

      await browser.close();

      if (apiResult && apiResult.nickname) {
        const info: RealPlayerInfo = {
          success: true,
          playerName: apiResult.nickname,
          region: apiResult.region || 'BD',
          openId: apiResult.open_id,
        };
        nicknameCache.set(cleanUid, { info, timestamp: Date.now() });
        return info;
      }

      if (apiResult && (apiResult.error === 'error_player_id' || apiResult.error === 'error_user_not_found')) {
        return {
          success: false,
          playerName: '',
          message: `Player UID '${cleanUid}' does not exist on Garena Free Fire servers.`,
        };
      }

      return {
        success: true,
        playerName: `Free Fire Player (${cleanUid})`,
        region: 'BD',
      };
    } catch (innerError: any) {
      try { await browser.close(); } catch {}
      console.error('[PlayerLookup] Browser session error:', innerError?.message);
    }
  } catch (launchError: any) {
    console.error('[PlayerLookup] Puppeteer launch error:', launchError?.message);
  }

  // Fallback if browser automation cannot launch
  return {
    success: true,
    playerName: `Free Fire Player (${cleanUid})`,
    region: 'BD',
  };
}
