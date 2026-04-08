export { SubscriberLoader } from "./loader";
export type {
  VimsSubscriberArgs,
  VimsSubscriberConfig,
  VimsSubscriberModule,
} from "../types/index";

// Legacy stub — kept for backward compatibility
export const vimsSubscribers = [
  "inventory.updated",
  "website.published",
  "crm.lead.created",
] as const;
