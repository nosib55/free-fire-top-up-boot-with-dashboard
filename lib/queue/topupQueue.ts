import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { processUniPinVoucher, AutomationResult } from '../automation/unipinVoucher';
import { processUniPinWallet } from '../automation/unipinWallet';
import { processGarenaShells } from '../automation/garenaShells';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redisClient: Redis | null = null;
let isRedisConnected = false;

try {
  redisClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: () => null, // Do not spam reconnect if local Redis is offline
  });

  redisClient.on('connect', () => {
    isRedisConnected = true;
    console.log('[Redis Queue] Connected to Redis server.');
  });

  redisClient.on('error', () => {
    isRedisConnected = false;
  });

  redisClient.connect().catch(() => {
    isRedisConnected = false;
  });
} catch (e) {
  isRedisConnected = false;
}

export interface TopUpJobData {
  jobId: string;
  pipeline: 'UNIPIN_VOUCHER' | 'UNIPIN_WALLET' | 'GARENA_SHELLS';
  uid: string;
  voucherCode?: string;
  serial?: string;
  pin?: string;
  diamondPackageId?: string;
  itemType?: any;
  playerLevel?: number;
  apiKey: string;
}

// Active UID locks to prevent double-spending race conditions
const activeUidLocks = new Set<string>();

export async function acquireUidLock(uid: string): Promise<boolean> {
  const lockKey = `lock:uid:${uid}`;
  if (isRedisConnected && redisClient) {
    try {
      const acquired = await redisClient.set(lockKey, 'LOCKED', 'EX', 30, 'NX');
      return acquired === 'OK';
    } catch {
      // Fallback in-memory lock
    }
  }
  if (activeUidLocks.has(uid)) return false;
  activeUidLocks.add(uid);
  setTimeout(() => activeUidLocks.delete(uid), 30000);
  return true;
}

export async function releaseUidLock(uid: string): Promise<void> {
  const lockKey = `lock:uid:${uid}`;
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(lockKey);
    } catch {
      // Ignore
    }
  }
  activeUidLocks.delete(uid);
}

// BullMQ Queue instance
export const TOPUP_QUEUE_NAME = 'garena_free_fire_topup_queue';

let topupQueue: Queue<TopUpJobData, AutomationResult> | null = null;

if (redisClient) {
  try {
    topupQueue = new Queue<TopUpJobData, AutomationResult>(TOPUP_QUEUE_NAME, {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  } catch {
    topupQueue = null;
  }
}

// Worker setup with concurrency limit = 3
if (redisClient) {
  try {
    new Worker<TopUpJobData, AutomationResult>(
      TOPUP_QUEUE_NAME,
      async (job: Job<TopUpJobData, AutomationResult>) => {
        const { pipeline, uid, voucherCode, serial, pin, diamondPackageId, itemType } = job.data;

        // Ensure atomic UID lock
        const locked = await acquireUidLock(uid);
        if (!locked) {
          throw new Error(`Concurrent top-up active for UID ${uid}. Lock rejected.`);
        }

        try {
          let result: AutomationResult;

          if (pipeline === 'UNIPIN_WALLET') {
            result = await processUniPinWallet({ uid, diamondPackageId: diamondPackageId || '100_DIAMONDS' });
          } else if (pipeline === 'GARENA_SHELLS') {
            result = await processGarenaShells({ uid, itemType: itemType || 'WEEKLY_MEMBERSHIP', playerLevel: job.data.playerLevel });
          } else {
            result = await processUniPinVoucher({ uid, voucherCode: voucherCode || '', serial, pin });
          }

          return result;
        } finally {
          await releaseUidLock(uid);
        }
      },
      {
        connection: redisClient,
        concurrency: 3, // Limit max 3-5 concurrent Puppeteer browser instances
      }
    );
  } catch (err: any) {
    console.warn('[Queue Worker] Failed to init Redis Queue:', err?.message);
  }
}

// Queue state control
let isQueuePaused = false;

export function pauseQueue(): boolean {
  isQueuePaused = true;
  if (topupQueue) {
    topupQueue.pause().catch(() => {});
  }
  return true;
}

export function resumeQueue(): boolean {
  isQueuePaused = false;
  if (topupQueue) {
    topupQueue.resume().catch(() => {});
  }
  return true;
}

export function getQueueControlStatus() {
  return {
    isPaused: isQueuePaused,
    activeLocks: activeUidLocks.size,
    isRedisConnected,
  };
}

/**
 * Fallback direct execution when Redis is not available
 */
export async function executeTopupDirect(data: TopUpJobData): Promise<AutomationResult> {
  if (isQueuePaused) {
    return {
      success: false,
      message: 'Worker queue is currently PAUSED for maintenance by Admin via Telegram/Dashboard. Please try again in a few minutes.',
      errorReason: 'WORKER_ERROR',
    };
  }

  const locked = await acquireUidLock(data.uid);
  if (!locked) {
    return {
      success: false,
      message: `Another top-up request is currently being processed for Player UID ${data.uid}. Please wait a few seconds.`,
      errorReason: 'WORKER_ERROR',
    };
  }

  try {
    if (data.pipeline === 'UNIPIN_WALLET') {
      return await processUniPinWallet({ uid: data.uid, diamondPackageId: data.diamondPackageId || '100_DIAMONDS' });
    } else if (data.pipeline === 'GARENA_SHELLS') {
      return await processGarenaShells({ uid: data.uid, itemType: data.itemType || 'WEEKLY_MEMBERSHIP', playerLevel: data.playerLevel });
    } else {
      return await processUniPinVoucher({
        uid: data.uid,
        voucherCode: data.voucherCode || '',
        serial: data.serial,
        pin: data.pin,
      });
    }
  } finally {
    await releaseUidLock(data.uid);
  }
}
