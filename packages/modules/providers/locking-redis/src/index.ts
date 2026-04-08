import { defineProvider } from "@vims/framework";
import { RedisLocking } from "./locking";

export const redisLockingProvider = defineProvider({
  key: "locking-redis",
  label: "Redis Locking",
  category: "cache" as any,
  register: (ctx: any) => {
    const logger = ctx?.container?.resolve("logger") || console;
    return {
      key: "locking-redis",
      locking: new RedisLocking({ logger, options: { redisUrl: process.env.REDIS_URL || "redis://localhost:6379" } })
    };
  }
});

export default redisLockingProvider;
