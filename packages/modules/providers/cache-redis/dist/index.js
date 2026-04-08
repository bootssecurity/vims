import { createClient } from "redis";
import { defineProvider } from "@vims/framework";
export function createRedisUrl() {
    var _a;
    return (_a = process.env.REDIS_URL) !== null && _a !== void 0 ? _a : "redis://127.0.0.1:6379";
}
export const redisCacheProvider = defineProvider({
    key: "cache-redis",
    label: "Redis Cache",
    category: "cache",
    register: () => ({
        key: "cache-redis",
        url: createRedisUrl(),
        createClient: createRedisCacheClient,
    }),
});
export function createRedisCacheClient(url = createRedisUrl()) {
    return createClient({ url });
}
