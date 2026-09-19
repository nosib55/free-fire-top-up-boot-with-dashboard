// lib/automation/datadomeCache.ts
// Redis-backed cache for DataDome cookies.
// DataDome cookies are valid ~15-20 minutes — caching avoids re-solving
// on every order, drastically cutting CapSolver API costs and latency.

import { getRedisClient } from '../redis';

const CACHE_PREFIX = 'datadome:cookie:';
const CACHE_TTL_SECONDS = 18 * 60; // 18 minutes (conservative, DataDome TTL ~20min)

/**
 * Retrieve a cached DataDome cookie for the given domain.
 * Returns null on cache miss or Redis unavailability.
 */
export async function getCachedDatadomeCookie(domain: string): Promise<string | null> {
  try {
    const redis = getRedisClient();
    if (!redis) return null;
    if (redis.status !== 'ready') await redis.connect().catch(() => {});
    const key = `${CACHE_PREFIX}${domain.replace(/^\./, '')}`;
    const val = await redis.get(key);
    if (val) {
      console.log(`[DatadomeCache] ✅ Cache HIT for domain: ${domain} — skipping CapSolver`);
    }
    return val;
  } catch {
    return null;
  }
}

/**
 * Store a DataDome cookie in Redis with automatic TTL.
 * The cookie value should be the raw `datadome=<value>` string or just the value.
 */
export async function setCachedDatadomeCookie(domain: string, cookie: string): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;
    if (redis.status !== 'ready') await redis.connect().catch(() => {});
    const key = `${CACHE_PREFIX}${domain.replace(/^\./, '')}`;
    await redis.set(key, cookie, 'EX', CACHE_TTL_SECONDS);
    console.log(`[DatadomeCache] 💾 Cached DataDome cookie for domain: ${domain} (TTL: ${CACHE_TTL_SECONDS}s)`);
  } catch (err: any) {
    console.warn('[DatadomeCache] Failed to cache cookie:', err.message);
  }
}

/**
 * Invalidate a cached DataDome cookie (e.g., when a 403 is received with it).
 */
export async function invalidateDatadomeCookie(domain: string): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;
    if (redis.status !== 'ready') await redis.connect().catch(() => {});
    const key = `${CACHE_PREFIX}${domain.replace(/^\./, '')}`;
    await redis.del(key);
    console.log(`[DatadomeCache] 🗑️ Invalidated DataDome cookie for domain: ${domain}`);
  } catch {}
}
