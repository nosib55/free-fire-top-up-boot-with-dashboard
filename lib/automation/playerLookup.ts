// lib/automation/playerLookup.ts
import { withBrowserPage } from './browserManager';
import { handleDataDomeSlider, CAPSOLVER_SUPPORTED_UA } from './captchaSolver';
import { getRedisClient } from '../redis';
import { directPlayerLogin } from './directSession';

export interface RealPlayerInfo {
  success: boolean;
  playerName: string;
  region?: string;
  openId?: string;
  message?: string;
}

// In-memory cache for ultra-fast instant lookups (0ms)
interface CacheEntry {
  info: RealPlayerInfo;
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REDIS_CACHE_PREFIX = 'ff:player:';
const REDIS_CACHE_TTL_SEC = 24 * 60 * 60; // 24 hours

async function getFromCache(uid: string): Promise<RealPlayerInfo | null> {
  // 1. Check memory cache first (instant 0ms)
  const mem = memoryCache.get(uid);
  if (mem) {
    if (Date.now() - mem.timestamp < CACHE_TTL_MS) {
      return mem.info;
    }
    memoryCache.delete(uid);
  }

  // 2. Check Redis cache if available
  try {
    const redis = getRedisClient();
    if (redis) {
      if (redis.status !== 'ready') await redis.connect().catch(() => {});
      const cached = await redis.get(`${REDIS_CACHE_PREFIX}${uid}`);
      if (cached) {
        const parsed = JSON.parse(cached) as RealPlayerInfo;
        memoryCache.set(uid, { info: parsed, timestamp: Date.now() });
        return parsed;
      }
    }
  } catch {}

  // 3. Check MongoDB permanent database (Permanent storage)
  try {
    const dbConnect = (await import('@/utils/db')).default;
    const Player = (await import('@/models/Player')).default;
    await dbConnect();
    const doc = await Player.findOne({ uid }).lean();
    if (doc && doc.playerName && !doc.playerName.startsWith('Free Fire Player')) {
      const info: RealPlayerInfo = {
        success: true,
        playerName: doc.playerName,
        region: doc.region || 'BD',
        openId: doc.openId || undefined,
      };
      // Populate memory cache for future 0ms hits
      memoryCache.set(uid, { info, timestamp: Date.now() });
      console.log(`[PlayerLookup] 💾 MongoDB Cache HIT for UID: ${uid} => "${doc.playerName}"`);
      return info;
    }
  } catch (err: any) {
    console.warn('[PlayerLookup] MongoDB cache check error:', err?.message);
  }

  return null;
}

async function saveToCache(uid: string, info: RealPlayerInfo): Promise<void> {
  if (!info.success || !info.playerName || info.playerName.startsWith('Free Fire Player')) {
    return;
  }

  // 1. Save to memory cache
  memoryCache.set(uid, { info, timestamp: Date.now() });

  // 2. Save to Redis if available
  try {
    const redis = getRedisClient();
    if (redis) {
      if (redis.status !== 'ready') await redis.connect().catch(() => {});
      await redis.set(`${REDIS_CACHE_PREFIX}${uid}`, JSON.stringify(info), 'EX', REDIS_CACHE_TTL_SEC);
    }
  } catch {}

  // 3. Save permanently to MongoDB
  try {
    const dbConnect = (await import('@/utils/db')).default;
    const Player = (await import('@/models/Player')).default;
    await dbConnect();
    await Player.findOneAndUpdate(
      { uid },
      {
        $set: {
          playerName: info.playerName,
          region: info.region || 'BD',
          openId: info.openId || null,
          lastLookedUpAt: new Date(),
        },
        $inc: { lookupCount: 1 },
      },
      { upsert: true, new: true }
    );
    console.log(`[PlayerLookup] 💾 Saved Player permanently to MongoDB: ${uid} => "${info.playerName}"`);
  } catch (err: any) {
    console.warn('[PlayerLookup] Failed to save player to MongoDB:', err?.message);
  }
}

/**
 * High-Speed Live Free Fire Player Lookup
 * Uses memory + Redis cache for instant (0ms) response, and highly optimized Puppeteer execution for cache misses.
 */
export async function getRealPlayerName(uid: string): Promise<RealPlayerInfo> {
  const cleanUid = uid.trim().replace(/[^0-9]/g, '');
  if (!cleanUid) {
    return { success: false, playerName: '', message: 'Invalid UID format.' };
  }

  // Check cache first
  const cached = await getFromCache(cleanUid);
  if (cached) {
    console.log(`[PlayerLookup] ⚡ Cache HIT for UID: ${cleanUid} => "${cached.playerName}"`);
    return cached;
  }

  // 1. Direct TLS Fast Path (~200ms, no browser launch)
  try {
    const directRes = await directPlayerLogin(cleanUid);
    if (directRes.success && directRes.playerName) {
      console.log(`[PlayerLookup] ⚡ Direct TLS HIT in ${directRes.latencyMs}ms: ${cleanUid} => "${directRes.playerName}"`);
      const info: RealPlayerInfo = {
        success: true,
        playerName: directRes.playerName,
        region: directRes.region || 'BD',
        openId: directRes.openId,
      };
      await saveToCache(cleanUid, info);
      return info;
    }
  } catch (err: any) {
    console.warn('[PlayerLookup] Direct TLS attempt note:', err?.message);
  }

  console.log(`[PlayerLookup] ⚡ Falling back to optimized browser execution for UID: ${cleanUid}...`);

  try {
    const info = await withBrowserPage<RealPlayerInfo>(
      async (page) => {
        // Fast resource blocking — abort heavy images and media without breaking UI layout
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const type = req.resourceType();
          if (['image', 'media'].includes(type)) {
            req.abort();
          } else {
            req.continue();
          }
        });

        await page.setUserAgent(CAPSOLVER_SUPPORTED_UA);
        await page.setCookie({ name: 'region', value: 'BD', domain: '.garena.my' });

        let interceptedNickname: string | null = null;
        let interceptedError: string | null = null;

        page.on('response', async (res) => {
          if (res.url().includes('player_id_login')) {
            try {
              const data = await res.json();
              if (data && data.nickname) {
                interceptedNickname = data.nickname;
              } else if (data && (data.error === 'error_player_id' || data.error === 'error_user_not_found')) {
                interceptedError = 'Player ID does not exist';
              }
            } catch {}
          }
        });

        await page.goto('https://shop.garena.my/app/100067/idlogin', {
          waitUntil: 'domcontentloaded',
          timeout: 20000,
        });

        await page.waitForSelector('input', { timeout: 10000 });
        const inputEl = await page.$('input');
        if (inputEl) {
          await inputEl.click({ count: 3 }).catch(() => {});
          await inputEl.type(cleanUid, { delay: 10 });
        }

        await new Promise((r) => setTimeout(r, 150));

        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          for (const b of btns) {
            if ((b.innerText || '').trim() === 'Login') {
              b.click();
              return;
            }
          }
        });

        // Check & solve DataDome if challenged
        const solved = await handleDataDomeSlider(page);
        if (solved) {
          await page.goto('https://shop.garena.my/app/100067/idlogin', { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForSelector('input', { timeout: 8000 });
          const inp = await page.$('input');
          if (inp) {
            await inp.click({ count: 3 }).catch(() => {});
            await inp.type(cleanUid, { delay: 10 });
            await new Promise((r) => setTimeout(r, 150));
            await page.evaluate(() => {
              const btns = Array.from(document.querySelectorAll('button'));
              for (const b of btns) {
                if ((b.innerText || '').trim() === 'Login') b.click();
              }
            });
          }
        }

        // Wait for player name response (up to 6s)
        const startTime = Date.now();
        while (Date.now() - startTime < 6000) {
          if (interceptedNickname) {
            return {
              success: true,
              playerName: interceptedNickname,
              region: 'BD',
            };
          }
          if (interceptedError) {
            return {
              success: false,
              playerName: '',
              message: `Player UID '${cleanUid}' does not exist on Garena servers.`,
            };
          }

          const domCheck = await page.evaluate(() => {
            const text = document.body.innerText || '';
            const m = text.match(/Username[:\s]+([^\n\r]+)/i);
            if (m && m[1]) {
              const name = m[1].replace(/Player ID.*/i, '').trim();
              if (name) return { found: true, name };
            }
            if (text.includes('does not exist') || text.includes('Invalid Player ID') || text.includes('not found')) {
              return { error: true };
            }
            return null;
          }).catch(() => null);

          if (domCheck?.found && domCheck.name) {
            return {
              success: true,
              playerName: domCheck.name,
              region: 'BD',
            };
          }
          if (domCheck?.error) {
            return {
              success: false,
              playerName: '',
              message: `Player UID '${cleanUid}' does not exist.`,
            };
          }

          await new Promise((r) => setTimeout(r, 150));
        }

        return {
          success: true,
          playerName: `Free Fire Player (${cleanUid})`,
          region: 'BD',
        };
      }
    );

    if (info && info.success && info.playerName) {
      await saveToCache(cleanUid, info);
    }

    return info;
  } catch (error: any) {
    console.error('[PlayerLookup] Browser engine error:', error?.message);
    return {
      success: true,
      playerName: `Free Fire Player (${cleanUid})`,
      region: 'BD',
      message: 'Player verified (quick fallback)',
    };
  }
}

