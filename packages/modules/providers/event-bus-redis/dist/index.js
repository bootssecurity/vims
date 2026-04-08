import { defineProvider } from "@vims/framework";
import { RedisEventBus } from "./event-bus";
export const redisEventBusProvider = defineProvider({
    key: "event-bus-redis",
    label: "Redis Event Bus",
    category: "events",
    register: (ctx) => {
        var _a;
        // Basic instantiation
        const logger = ((_a = ctx === null || ctx === void 0 ? void 0 : ctx.container) === null || _a === void 0 ? void 0 : _a.resolve("logger")) || console;
        return {
            key: "event-bus-redis",
            bus: new RedisEventBus({ logger, options: { redisUrl: process.env.REDIS_URL || "redis://localhost:6379" } })
        };
    }
});
export default redisEventBusProvider;
