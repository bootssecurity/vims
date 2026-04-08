import { defineProvider } from "@vims/framework";
import { RedisEventBus } from "./event-bus.js";

export const redisEventBusProvider = defineProvider({
  key: "event-bus-redis",
  label: "Redis Event Bus",
  category: "events",
  register: (ctx: any) => {
    // Basic instantiation
    const logger = ctx?.container?.resolve("logger") || console;
    return {
      key: "event-bus-redis",
      bus: new RedisEventBus({ logger, options: { redisUrl: process.env.REDIS_URL || "redis://localhost:6379" } })
    };
  }
});

export default redisEventBusProvider;
