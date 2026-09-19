// lib/redis.ts
// Centralized Redis client for Upstash (TLS) or local Redis.
// Import getRedisClient() anywhere instead of creating raw ioredis instances.

import { Redis } from 'ioredis';

let _client: Redis | null = null;
let _disabled = false;

export function getRedisClient(): Redis | null {
  if (_disabled) return null;
  if (!process.env.REDIS_HOST) return null;
  if (_client && _client.status === 'ready') return _client;

  const host = process.env.REDIS_HOST!;
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const isUpstash = host.includes('upstash.io');

  try {
    _client = new Redis({
      host,
      port,
      password,
      tls: isUpstash ? {} : undefined, // Upstash requires TLS
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 5000,
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 500, 2000)),
    });

    _client.on('connect', () => {
      console.log(`[Redis] ✅ Connected to ${isUpstash ? 'Upstash' : 'local'} Redis`);
    });

    _client.on('error', (err) => {
      console.warn('[Redis] Connection error (non-fatal):', err.message);
      _disabled = true;
      _client = null;
    });

    return _client;
  } catch {
    _disabled = true;
    return null;
  }
}

/** Create a fresh connection for BullMQ (requires maxRetriesPerRequest: null) */
export function createBullMQConnection(): Redis | null {
  if (!process.env.REDIS_HOST) return null;

  const host = process.env.REDIS_HOST!;
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const isUpstash = host.includes('upstash.io');

  try {
    return new Redis({
      host,
      port,
      password,
      tls: isUpstash ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 1000, 5000)),
    });
  } catch {
    return null;
  }
}
