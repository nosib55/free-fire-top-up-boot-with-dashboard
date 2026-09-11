// lib/automation/profiler.ts

export class StepProfiler {
  private startTime: number;
  private lastStepTime: number;
  private steps: { name: string; durationMs: number; totalElapsedMs: number }[] = [];
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
    this.lastStepTime = this.startTime;
    console.log(`[PROFILER] ── Top-up Execution Started (${label}) ──`);
  }

  public mark(stepName: string): void {
    const now = performance.now();
    const durationMs = Math.round(now - this.lastStepTime);
    const totalElapsedMs = Math.round(now - this.startTime);
    this.steps.push({ name: stepName, durationMs, totalElapsedMs });
    this.lastStepTime = now;
    console.log(`[PROFILER] ├─ [${(totalElapsedMs / 1000).toFixed(2)}s] (+${durationMs}ms) ${stepName}`);
  }

  public end(success: boolean, extraInfo?: string): void {
    const totalTimeMs = Math.round(performance.now() - this.startTime);
    const statusText = success ? '✅ COMPLETED' : '❌ FAILED';
    console.log(
      `[PROFILER] └─ [${(totalTimeMs / 1000).toFixed(2)}s] ${statusText} - Total: ${(totalTimeMs / 1000).toFixed(2)}s (${this.label})${extraInfo ? ' | ' + extraInfo : ''}`
    );
  }
}
