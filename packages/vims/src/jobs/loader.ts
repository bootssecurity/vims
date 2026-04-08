import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
import type { VimsJobConfig, VimsContainer } from "../types/index";

type JobEntry = {
  handler: (args: { container: VimsContainer }) => Promise<void>;
  config: VimsJobConfig;
  sourcePath: string;
};

type ActiveJob = JobEntry & {
  stop: () => void;
};

// ── Cron parser ───────────────────────────────────────────────────────────────

/**
 * Expand a single cron field token to a sorted array of valid integer values.
 *
 * Supports:
 *   *         → every valid value in [min, max]
 *   *\/step   → every step-th value (e.g. *\/5 = every 5 mins)
 *   start-end → range (inclusive)
 *   a,b,c     → explicit list (can be combined)
 *   number    → single value
 */
function expandField(token: string, min: number, max: number): number[] | null {
  const values = new Set<number>();

  for (const part of token.split(",")) {
    const trimmed = part.trim();

    if (trimmed === "*") {
      for (let i = min; i <= max; i++) values.add(i);
      continue;
    }

    if (trimmed.startsWith("*/")) {
      const step = parseInt(trimmed.slice(2), 10);
      if (isNaN(step) || step < 1) return null;
      for (let i = min; i <= max; i += step) values.add(i);
      continue;
    }

    if (trimmed.includes("-")) {
      const dashIdx = trimmed.indexOf("-");
      const slashIdx = trimmed.indexOf("/");
      const startStr = trimmed.slice(0, dashIdx);
      const endStr = slashIdx > dashIdx ? trimmed.slice(dashIdx + 1, slashIdx) : trimmed.slice(dashIdx + 1);
      const stepStr = slashIdx > dashIdx ? trimmed.slice(slashIdx + 1) : "1";
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      const step = parseInt(stepStr, 10);
      if (isNaN(start) || isNaN(end) || isNaN(step) || step < 1) return null;
      for (let i = start; i <= end; i += step) values.add(i);
      continue;
    }

    const n = parseInt(trimmed, 10);
    if (isNaN(n) || n < min || n > max) return null;
    values.add(n);
  }

  return [...values].sort((a, b) => a - b);
}

export type ParsedCron = {
  minutes: number[];
  hours: number[];
  doms: number[];    // day of month (1-31)
  months: number[];  // (1-12)
  dows: number[];    // day of week (0=Sun, 6=Sat)
};

/**
 * Parse a standard 5-field cron expression into sorted value arrays.
 * Returns null if the expression is invalid.
 *
 * Field order: minute hour day-of-month month day-of-week
 *
 * Examples:
 *   "* * * * *"       → every minute
 *   "0 * * * *"       → every hour at :00
 *   "0 0 * * *"       → daily at midnight
 *   "*\/5 * * * *"    → every 5 minutes
 *   "0,30 8-18 * * 1-5" → at :00 and :30, hours 8-18, Mon-Fri
 */
export function parseCronExpression(schedule: string): ParsedCron | null {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minTok, hourTok, domTok, monthTok, dowTok] = parts;

  const minutes = expandField(minTok, 0, 59);
  const hours = expandField(hourTok, 0, 23);
  const doms = expandField(domTok, 1, 31);
  const months = expandField(monthTok, 1, 12);
  const dows = expandField(dowTok, 0, 6);

  if (!minutes || !hours || !doms || !months || !dows) return null;
  if (!minutes.length || !hours.length || !doms.length || !months.length || !dows.length) return null;

  return { minutes, hours, doms, months, dows };
}

/**
 * Given a ParsedCron, return milliseconds until the next matching tick from `from`.
 * Scans forward minute-by-minute for up to 4 years.
 * Returns -1 if no matching time is found.
 */
export function nextRunMs(cron: ParsedCron, from: Date = new Date()): number {
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const limit = new Date(from);
  limit.setFullYear(limit.getFullYear() + 4);

  while (cursor < limit) {
    const month = cursor.getMonth() + 1;
    const dom = cursor.getDate();
    const dow = cursor.getDay();
    const hour = cursor.getHours();
    const min = cursor.getMinutes();

    if (
      cron.months.includes(month) &&
      cron.doms.includes(dom) &&
      cron.dows.includes(dow) &&
      cron.hours.includes(hour) &&
      cron.minutes.includes(min)
    ) {
      return cursor.getTime() - from.getTime();
    }

    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return -1;
}

// ── JobLoader ─────────────────────────────────────────────────────────────────

/**
 * JobLoader
 *
 * File-system scanner that discovers job modules and schedules them using a
 * full 5-field cron expression parser (zero external dependencies).
 *
 * Job file shape:
 * ```ts
 * export default async function myJob({ container }) { ... }
 * export const config: VimsJobConfig = {
 *   name: "my-job",
 *   schedule: "0 * * * *",     // every hour at :00
 * }
 * ```
 *
 * Cron syntax supported:
 *   *           wildcard (all values)
 *   *\/n        every n-th value (step)
 *   n-m         range (inclusive)
 *   a,b,c       comma list
 *   Combinations: "0,30 8-18 * * 1-5"
 */
export class JobLoader {
  private readonly sourcePaths: string[];
  private readonly container: VimsContainer;
  private readonly jobs: JobEntry[] = [];
  private readonly active: ActiveJob[] = [];

  constructor(sourcePaths: string[], container: VimsContainer) {
    this.sourcePaths = sourcePaths;
    this.container = container;
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  async load(): Promise<void> {
    await this.scanAll();
    this.scheduleAll();
  }

  /** Stop all timers — call during graceful shutdown */
  stopAll(): void {
    for (const job of this.active) {
      job.stop();
    }
    this.active.length = 0;
  }

  getJobs(): JobEntry[] {
    return [...this.jobs];
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async scanAll(): Promise<void> {
    await Promise.allSettled(this.sourcePaths.map((p) => this.scanDir(p)));
  }

  private async scanDir(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    const validExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);

    await Promise.all(
      entries.map(async (entry) => {
        if (!validExtensions.has(extname(entry))) return;
        if (entry.endsWith(".test.ts") || entry.endsWith(".spec.ts") || entry.endsWith(".d.ts")) return;

        const fullPath = join(dir, entry);
        try {
          const fileStat = await stat(fullPath);
          if (!fileStat.isFile()) return;

          const mod = await import(fullPath);
          const handler = mod.default;
          const config: VimsJobConfig | undefined = mod.config;

          if (typeof handler !== "function") return;
          if (!config?.name || !config?.schedule) return;

          this.jobs.push({ handler, config, sourcePath: fullPath });
        } catch {
          // skip broken modules
        }
      })
    );
  }

  private scheduleAll(): void {
    for (const job of this.jobs) {
      const cron = parseCronExpression(job.config.schedule);
      if (!cron) continue; // invalid expression

      const self = this;
      let timerId: ReturnType<typeof setTimeout> | undefined;
      let stopped = false;

      /**
       * Self-rescheduling tick: calculates exact ms until next cron match,
       * avoids the drift of setInterval and is precise to the minute.
       */
      function tick(): void {
        if (stopped) return;
        const delayMs = nextRunMs(cron!, new Date());
        if (delayMs < 0) return;

        timerId = setTimeout(async () => {
          if (stopped) return;
          try {
            await job.handler({ container: self.container });
          } catch {
            // never crash the process on job error
          }
          tick();
        }, delayMs);
      }

      tick();

      this.active.push({
        ...job,
        stop: () => {
          stopped = true;
          if (timerId !== undefined) clearTimeout(timerId);
        },
      });
    }
  }
}
