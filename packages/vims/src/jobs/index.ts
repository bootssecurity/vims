export { JobLoader, parseCronExpression, nextRunMs } from "./loader.js";
export type { ParsedCron } from "./loader.js";
export type {
  VimsJobArgs,
  VimsJobConfig,
  VimsJobModule,
} from "../types/index.js";

// Legacy stub — kept for backward compatibility
export const vimsJobs = [
  "inventory-feed-sync",
  "website-publish",
  "lead-assignment",
] as const;
