// lib/automation/queueManager.ts
// Persistent BullMQ-backed job queue for top-up orders.
// Jobs survive server restarts (stored in Redis).
// Concurrency is capped at 2 to protect browser RAM.
//
// Falls back to the legacy in-process ConcurrencyQueue if Redis is unavailable
// so local development without Redis still works.

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { createBullMQConnection } from '../redis';

// ─── Redis connection ────────────────────────────────────────────────────────

function createRedisConnection() {
  return createBullMQConnection()!;
}

// ─── Queue name ───────────────────────────────────────────────────────────────
const QUEUE_NAME = 'topup-orders';

// ─── Singleton queue instance ─────────────────────────────────────────────────
let _queue: Queue | null = null;

export function getTopupQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return _queue;
}

// ─── Job data types ───────────────────────────────────────────────────────────

export interface TopupJobData {
  orderId: string;
  uid: string;
  packageId: string;
  packageName: string;
  amount: number;
  provider: 'garena' | 'unipin';
  apiKey?: string;
}

export interface TopupJobResult {
  success: boolean;
  orderId: string;
  transactionId?: string;
  error?: string;
}

// ─── Worker factory ───────────────────────────────────────────────────────────

/**
 * Start the BullMQ Worker that processes top-up jobs.
 * Call this once on server startup (e.g., in a standalone worker script).
 *
 * @param processor - Your order processing function
 */
export function startTopupWorker(
  processor: (job: Job<TopupJobData>) => Promise<TopupJobResult>
): Worker<TopupJobData, TopupJobResult> {
  const worker = new Worker<TopupJobData, TopupJobResult>(
    QUEUE_NAME,
    processor,
    {
      connection: createRedisConnection(),
      concurrency: 2,            // Max 2 browser contexts at once
      limiter: {
        max: 10,                 // Max 10 jobs per minute
        duration: 60 * 1000,
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[Queue] ✅ Job ${job.id} completed — Order: ${result.orderId}, Success: ${result.success}`);
  });

  worker.on('failed', (job, err) => {
    const attempt = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts?.attempts ?? 3;
    console.error(`[Queue] ❌ Job ${job?.id} failed (attempt ${attempt}/${maxAttempts}): ${err.message}`);
  });

  worker.on('error', (err) => {
    console.error('[Queue] Worker error:', err.message);
  });

  console.log('[Queue] 🚀 BullMQ Worker started — concurrency: 2, queue:', QUEUE_NAME);
  return worker;
}

/**
 * Add a top-up order to the persistent queue.
 * Returns the job ID for tracking.
 */
export async function enqueueTopup(data: TopupJobData): Promise<string> {
  const queue = getTopupQueue();
  const job = await queue.add('process-order', data, {
    jobId: `order-${data.orderId}`,
  });
  console.log(`[Queue] 📥 Enqueued order ${data.orderId} — Job ID: ${job.id}`);
  return job.id ?? data.orderId;
}

/**
 * Get current queue stats for dashboard display.
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getTopupQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}

// ─── Legacy fallback (in-process, no Redis) ───────────────────────────────────
// Used in local dev when Redis is not running.

type Task<T> = () => Promise<T>;

class ConcurrencyQueue {
  private running = 0;
  private queue: (() => void)[] = [];
  private concurrency: number;

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  async run<T>(task: Task<T>): Promise<T> {
    if (this.running >= this.concurrency) {
      console.log(`[QueueManager] Concurrency limit (${this.concurrency}) reached. Queuing request...`);
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }

  get activeCount(): number {
    return this.running;
  }

  get pendingCount(): number {
    return this.queue.length;
  }
}

/** In-process fallback queue for environments without Redis */
export const topupQueue = new ConcurrencyQueue(2);
