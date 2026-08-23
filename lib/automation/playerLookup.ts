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

  console.log(`[PlayerLookup] Looking up UID: ${cleanUid}...`);

  // 2. Try direct HTTP first (fastest: ~300-500ms)
  try {
    const res = await fetch('https://shop.garena.my/api/auth/player_id_login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://shop.garena.my/app/100067/idlogin',
        'Origin': 'https://shop.garena.my',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify({ app_id: 100067, login_id: cleanUid, app_server_id: 0 }),
      signal: AbortSignal.timeout(3500),
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
    console.warn('[PlayerLookup] Direct HTTP failed, falling back to browser...');
  }

  // 3. Browser fallback: navigate Garena shop, enter UID, extract username from page
  try {
    const info = await withBrowserPage(async (page) => {
      await page.goto(`https://shop.garena.my/app/100067/idlogin?_t=${Date.now()}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      const uidInput = await page.$('input[placeholder*="player ID"], input.form-input').catch(() => null);
      if (!uidInput) {
        const currentText = await page.evaluate(() => document.body.innerText || '').catch(() => '');
        if (currentText.includes(cleanUid)) {
          const name = await page.evaluate(() => {
            const allEls = Array.from(document.querySelectorAll('*'));
            for (const el of allEls) {
              const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
              const m = txt.match(/^Username:\s*(.+)$/i);
              if (m && m[1]) return m[1].trim();
            }
            return null;
          }).catch(() => null);
          if (name) return { success: true, playerName: name, region: 'BD' };
        }
        return { success: true, playerName: `Free Fire Player (${cleanUid})`, region: 'BD' };
      }

      await uidInput.type(cleanUid, { delay: 15 });
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        for (const b of btns) { if (b.innerText.includes('Login')) { b.click(); return; } }
      });

      await page.waitForFunction(() => {
        const text = document.body.innerText || '';
        return text.includes('Username') || text.includes('Player ID') || text.includes('Diamond');
      }, { timeout: 8000 }).catch(() => {});

      const playerName = await page.evaluate(() => {
        const allEls = Array.from(document.querySelectorAll('*'));
        for (const el of allEls) {
          const txt = ((el as HTMLElement).innerText || el.textContent || '').trim();
          const m = txt.match(/^Username:\s*(.+)$/i);
          if (m && m[1]) return m[1].trim();
        }
        const body = document.body.innerText || '';
        if (body.includes('not found') || body.includes('does not exist')) return '__NOT_FOUND__';
        return null;
      }).catch(() => null);

      if (playerName === '__NOT_FOUND__') {
        return { success: false, playerName: '', message: `Player UID '${cleanUid}' does not exist on Garena Free Fire servers.` };
      }
      return { success: true, playerName: playerName || `Free Fire Player (${cleanUid})`, region: 'BD' };
    });

    if (info.success && info.playerName && !info.playerName.startsWith('Free Fire Player')) {
      nicknameCache.set(cleanUid, { info, timestamp: Date.now() });
      console.log(`[PlayerLookup] ✅ Browser lookup: ${info.playerName}`);
    }
    return info;
  } catch (browserErr: any) {
    console.warn('[PlayerLookup] Browser fallback error:', browserErr?.message);
  }

  // 4. Final fallback
  return {
    success: true,
    playerName: `Free Fire Player (${cleanUid})`,
    region: 'BD',
  };
}
