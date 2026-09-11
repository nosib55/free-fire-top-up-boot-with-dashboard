// lib/automation/queueManager.ts
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

export const topupQueue = new ConcurrencyQueue(2);
