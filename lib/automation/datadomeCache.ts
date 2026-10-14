// lib/automation/datadomeCache.ts
// Redis-backed cache for DataDome cookies.
// DataDome cookies are valid ~15-20 minutes — caching avoids re-solving
// on every order, drastically cutting CapSolver API costs and latency.

import { getRedisClient } from '../redis';

const CACHE_PREFIX = 'datadome:cookie:';
const CACHE_TTL_SECONDS = 18 * 60; // 18 minutes (conservative, DataDome TTL ~20min)

// Fast in-memory cache fallback (0ms)
const memoryCacheStore = new Map<string, { value: string; expiresAt: number }>();

/**
 * Retrieve a cached DataDome cookie for the given domain.
 * Returns null on cache miss or Redis unavailability.
 */
export async function getCachedDatadomeCookie(domain: string): Promise<string | null> {
  const cleanDomain = domain.replace(/^\./, '');

  // 1. Check in-memory cache first (instant 0ms)
  const mem = memoryCacheStore.get(cleanDomain);
  if (mem) {
    if (Date.now() < mem.expiresAt) {
      console.log(`[DatadomeCache] ⚡ Memory Cache HIT for domain: ${cleanDomain}`);
      return mem.value;
    }
    memoryCacheStore.delete(cleanDomain);
  }

  // 2. Check Redis cache
  try {
    const redis = getRedisClient();
    if (!redis) return null;
    if (redis.status !== 'ready') await redis.connect().catch(() => {});
    const key = `${CACHE_PREFIX}${cleanDomain}`;
    const val = await redis.get(key);
    if (val) {
      console.log(`[DatadomeCache] ✅ Redis Cache HIT for domain: ${cleanDomain} — skipping CapSolver`);
      memoryCacheStore.set(cleanDomain, { value: val, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 });
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
  const cleanDomain = domain.replace(/^\./, '');
  memoryCacheStore.set(cleanDomain, { value: cookie, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 });
  try {
    const redis = getRedisClient();
    if (!redis) return;
    if (redis.status !== 'ready') await redis.connect().catch(() => {});
    const key = `${CACHE_PREFIX}${cleanDomain}`;
    await redis.set(key, cookie, 'EX', CACHE_TTL_SECONDS);
    console.log(`[DatadomeCache] 💾 Cached DataDome cookie for domain: ${cleanDomain} (TTL: ${CACHE_TTL_SECONDS}s)`);
  } catch (err: any) {
    console.warn('[DatadomeCache] Failed to cache cookie in Redis:', err.message);
  }
}

/**
 * Invalidate a cached DataDome cookie (e.g., when a 403 is received with it).
 */
export async function invalidateDatadomeCookie(domain: string): Promise<void> {
  const cleanDomain = domain.replace(/^\./, '');
  memoryCacheStore.delete(cleanDomain);
  try {
    const redis = getRedisClient();
    if (!redis) return;
    if (redis.status !== 'ready') await redis.connect().catch(() => {});
    const key = `${CACHE_PREFIX}${cleanDomain}`;
    await redis.del(key);
    console.log(`[DatadomeCache] 🗑️ Invalidated DataDome cookie for domain: ${cleanDomain}`);
  } catch {}
}
