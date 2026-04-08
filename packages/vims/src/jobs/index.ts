export { JobLoader, parseCronExpression, nextRunMs } from "./loader";
export type { ParsedCron } from "./loader";
export type {
  VimsJobArgs,
  VimsJobConfig,
  VimsJobModule,
} from "../types/index";

// Legacy stub — kept for backward compatibility
export const vimsJobs = [
  "inventory-feed-sync",
  "website-publish",
  "lead-assignment",
] as const;
