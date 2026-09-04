// lib/automation/playerLookup.ts
import { withBrowserPage } from './browserManager';

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

  // 1. Check cache first (< 5ms)
  const cached = nicknameCache.get(cleanUid);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[PlayerLookup] Cache hit for UID ${cleanUid}: ${cached.info.playerName}`);
    return cached.info;
  }

  console.log(`[PlayerLookup] Looking up real Free Fire in-game name for UID: ${cleanUid}...`);

  // 2. Try direct HTTP first (if not blocked by DataDome)
  try {
    const res = await fetch('https://shop.garena.my/api/auth/player_id_login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://shop.garena.my/?app=100067',
        'Origin': 'https://shop.garena.my',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify({ app_id: 100067, login_id: cleanUid, app_server_id: 0 }),
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.nickname) {
        const info: RealPlayerInfo = {
          success: true,
          playerName: data.nickname,
          region: data.region || 'BD',
          openId: data.open_id,
        };
        nicknameCache.set(cleanUid, { info, timestamp: Date.now() });
        console.log(`[PlayerLookup] ✅ Direct HTTP: ${data.nickname}`);
        return info;
      }
      if (data && (data.error === 'error_player_id' || data.error === 'error_user_not_found')) {
        return {
          success: false,
          playerName: '',
          message: `Player UID '${cleanUid}' does not exist on Garena Free Fire servers.`,
        };
      }
    }
  } catch {
    // Fall through to browser automation
  }

  // 3. Automated Browser Engine (navigates Garena Topup Center SPA and extracts exact in-game nickname)
  try {
    const info = await withBrowserPage(async (page) => {
      await page.goto(`https://shop.garena.my/?app=100067`, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });

      // Click "Player ID" tab button in the SPA
      await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, div, span, a'));
        for (const el of els) {
          const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
          if (txt === 'Player ID') {
            (el as HTMLElement).click();
            return;
          }
        }
      });

      // Wait for the Player ID input field
      await page.waitForSelector('input[placeholder*="player ID"], input.form-input, input[type="text"]', {
        timeout: 10000,
      });
      const input = await page.$('input[placeholder*="player ID"], input.form-input, input[type="text"]');
      if (!input) {
        throw new Error('Player ID input field not found on Garena Topup Center');
      }

      // Enter the target UID
      await input.type(cleanUid, { delay: 15 });

      // Click the Login/Confirm button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const b of buttons) {
          const t = (b.innerText || '').trim();
          if (t === 'Login' || t === 'Confirm' || t === 'Submit') {
            b.click();
            return;
          }
        }
      });

      // Wait for Username display or invalid error message
      await page.waitForFunction(
        () => {
          const text = document.body.innerText || '';
          return (
            text.includes('Username:') ||
            text.includes('Logout') ||
            text.includes('not found') ||
            text.includes('does not exist') ||
            text.includes('invalid player')
          );
        },
        { timeout: 12000 }
      );

      // Extract the in-game player name
      const extraction = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const match = text.match(/Username:\s*([^\n\r]+)/i);
        if (match && match[1]) {
          return { success: true, playerName: match[1].trim() };
        }
        if (
          text.includes('not found') ||
          text.includes('does not exist') ||
          text.includes('invalid player') ||
          text.includes('Error')
        ) {
          return { success: false, notFound: true };
        }
        return null;
      });

      if (extraction?.notFound) {
        return {
          success: false,
          playerName: '',
          message: `Player UID '${cleanUid}' does not exist on Garena Free Fire servers.`,
        };
      }

      if (extraction?.success && extraction.playerName) {
        return {
          success: true,
          playerName: extraction.playerName,
          region: 'BD',
        };
      }

      return {
        success: true,
        playerName: `Free Fire Player (${cleanUid})`,
        region: 'BD',
      };
    });

    if (info.success && info.playerName && !info.playerName.startsWith('Free Fire Player')) {
      nicknameCache.set(cleanUid, { info, timestamp: Date.now() });
      console.log(`[PlayerLookup] ✅ Live Garena Nickname: ${info.playerName}`);
    }
    return info;
  } catch (browserErr: any) {
    console.warn('[PlayerLookup] Browser engine error:', browserErr?.message);
  }

  // 4. Fallback if network or Garena fails
  return {
    success: true,
    playerName: `Free Fire Player (${cleanUid})`,
    region: 'BD',
  };
}
