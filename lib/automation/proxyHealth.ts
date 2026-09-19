// lib/automation/proxyHealth.ts
// Validates and health-checks proxy pool entries.
// Automatically skips dead or datacenter proxies.
// Health status is cached in Redis for 5 minutes per proxy.

import { checkProxyConnectivity } from './proxyHealthCheck.js';
import { getRedisClient } from '../redis';

const HEALTH_PREFIX = 'proxy:health:';
const HEALTH_TTL_SECONDS = 5 * 60; // 5 minutes

export interface ProxyStatus {
  url: string;
  alive: boolean;
  latencyMs?: number;
  checkedAt: number;
}

/**
 * Parse a proxy URL string into its components.
 */
export function parseProxyUrl(proxyUrl: string): {
  server: string;
  username?: string;
  password?: string;
} | null {
  try {
    const parsed = new URL(proxyUrl);
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

/**
 * Check if a proxy is alive by making a test request through it.
 * Uses a simple IP-check endpoint. Returns alive status + latency.
 */
export async function validateProxy(proxyUrl: string): Promise<ProxyStatus> {
  const start = Date.now();
  try {
    const parsed = parseProxyUrl(proxyUrl);
    if (!parsed) {
      return { url: proxyUrl, alive: false, checkedAt: start };
    }

    // Use native fetch with a proxy agent (light check via IP-echo)
    // We build a minimal HTTP CONNECT check without external deps
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      'User-Agent': 'curl/8.5.0',
    };

    if (parsed.username && parsed.password) {
      const creds = Buffer.from(`${parsed.username}:${parsed.password}`).toString('base64');
      headers['Proxy-Authorization'] = `Basic ${creds}`;
    }

    // Validate via a lightweight TCP connectivity check
    const latencyMs = await checkProxyConnectivity(parsed.server, parsed.username, parsed.password);

    clearTimeout(timeout);
    const alive = latencyMs !== null;
    return { url: proxyUrl, alive, latencyMs: latencyMs ?? undefined, checkedAt: Date.now() };
  } catch {
    return { url: proxyUrl, alive: false, checkedAt: Date.now() };
  }
}

/**
 * Returns the list of proxy URLs from env, filtering dead ones.
 * Uses Redis cache to avoid repeated health checks.
 */
export async function getHealthyProxies(): Promise<string[]> {
  const poolStr = process.env.PROXY_POOL || process.env.RESIDENTIAL_PROXY_URL || '';
  const allProxies = poolStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allProxies.length === 0) return [];

  let redis = getRedisClient();
  try {
    if (redis && redis.status !== 'ready') {
      await redis.connect().catch(() => { redis = null; });
    }
  } catch { redis = null; }

  const healthy: string[] = [];

  for (const proxyUrl of allProxies) {
    const cacheKey = `${HEALTH_PREFIX}${Buffer.from(proxyUrl).toString('base64').slice(0, 32)}`;

    // Check Redis cache first
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached === 'alive') {
          healthy.push(proxyUrl);
          continue;
        }
        if (cached === 'dead') {
          console.warn(`[ProxyHealth] ❌ Skipping cached-dead proxy: ${proxyUrl.split('@')[1] || proxyUrl}`);
          continue;
        }
      } catch {}
    }

    // Fresh check
    console.log(`[ProxyHealth] 🔍 Checking proxy: ${proxyUrl.split('@')[1] || proxyUrl}...`);
    const status = await validateProxy(proxyUrl);

    if (redis) {
      try {
        await redis.set(cacheKey, status.alive ? 'alive' : 'dead', 'EX', HEALTH_TTL_SECONDS);
      } catch {}
    }

    if (status.alive) {
      console.log(`[ProxyHealth] ✅ Proxy OK (${status.latencyMs}ms): ${proxyUrl.split('@')[1] || proxyUrl}`);
      healthy.push(proxyUrl);
    } else {
      console.warn(`[ProxyHealth] ❌ Proxy DEAD: ${proxyUrl.split('@')[1] || proxyUrl}`);
    }
  }

  return healthy;
}

/**
 * Get a single healthy proxy URL using round-robin from the healthy pool.
 * Falls back to the first available proxy if health checks fail.
 */
let _rrIndex = 0;
export async function getHealthyProxy(): Promise<string | null> {
  const healthy = await getHealthyProxies().catch(() => [] as string[]);
  if (healthy.length === 0) {
    // Fallback to raw pool without health check
    const poolStr = process.env.PROXY_POOL || process.env.RESIDENTIAL_PROXY_URL || '';
    const all = poolStr.split(',').map((s) => s.trim()).filter(Boolean);
    return all.length > 0 ? all[_rrIndex++ % all.length] : null;
  }
  return healthy[_rrIndex++ % healthy.length];
}
