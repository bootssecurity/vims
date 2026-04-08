export { SubscriberLoader } from "./loader.js";
export type {
  VimsSubscriberArgs,
  VimsSubscriberConfig,
  VimsSubscriberModule,
} from "../types/index.js";

// Legacy stub — kept for backward compatibility
export const vimsSubscribers = [
  "inventory.updated",
  "website.published",
  "crm.lead.created",
] as const;
