import type { VimsJobConfig, VimsContainer } from "../types/index";
type JobEntry = {
    handler: (args: {
        container: VimsContainer;
    }) => Promise<void>;
    config: VimsJobConfig;
    sourcePath: string;
};
export type ParsedCron = {
    minutes: number[];
    hours: number[];
    doms: number[];
    months: number[];
    dows: number[];
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
export declare function parseCronExpression(schedule: string): ParsedCron | null;
/**
 * Given a ParsedCron, return milliseconds until the next matching tick from `from`.
 * Scans forward minute-by-minute for up to 4 years.
 * Returns -1 if no matching time is found.
 */
export declare function nextRunMs(cron: ParsedCron, from?: Date): number;
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
export declare class JobLoader {
    private readonly sourcePaths;
    private readonly container;
    private readonly jobs;
    private readonly active;
    constructor(sourcePaths: string[], container: VimsContainer);
    load(): Promise<void>;
    /** Stop all timers — call during graceful shutdown */
    stopAll(): void;
    getJobs(): JobEntry[];
    private scanAll;
    private scanDir;
    private scheduleAll;
}
export {};
