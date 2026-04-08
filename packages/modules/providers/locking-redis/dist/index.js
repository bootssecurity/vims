import { defineProvider } from "@vims/framework";
import { RedisLocking } from "./locking";
export const redisLockingProvider = defineProvider({
    key: "locking-redis",
    label: "Redis Locking",
    category: "cache",
    register: (ctx) => {
        var _a;
        const logger = ((_a = ctx === null || ctx === void 0 ? void 0 : ctx.container) === null || _a === void 0 ? void 0 : _a.resolve("logger")) || console;
        return {
            key: "locking-redis",
            locking: new RedisLocking({ logger, options: { redisUrl: process.env.REDIS_URL || "redis://localhost:6379" } })
        };
    }
});
export default redisLockingProvider;
