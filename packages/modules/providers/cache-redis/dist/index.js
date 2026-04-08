import Redis from "ioredis";
import { defineProvider } from "@vims/framework";
export function createRedisUrl() {
    var _a;
    return (_a = process.env.REDIS_URL) !== null && _a !== void 0 ? _a : "redis://127.0.0.1:6379";
}
let cacheClient = null;
const DEFAULT_TTL = 30; // seconds
export const redisCacheProvider = defineProvider({
    key: "cache-redis",
    label: "Redis Cache",
    category: "cache",
    register: () => {
        if (!cacheClient) {
            cacheClient = new Redis(createRedisUrl());
        }
        return {
            key: "cache-redis",
            async get(namespace, key) {
                const value = await cacheClient.get(`${namespace}:${key}`);
                return value ? JSON.parse(value) : null;
            },
            async set(namespace, key, data, ttl = DEFAULT_TTL) {
                await cacheClient.set(`${namespace}:${key}`, JSON.stringify(data), "EX", ttl);
            },
            async invalidate(namespace, keys) {
                if (!keys || keys.length === 0) {
                    const matchedKeys = await cacheClient.keys(`${namespace}:*`);
                    if (matchedKeys.length > 0) {
                        await cacheClient.del(...matchedKeys);
                    }
                }
                else {
                    await cacheClient.del(...keys.map((k) => `${namespace}:${k}`));
                }
            },
            async destroy() {
                if (cacheClient) {
                    cacheClient.disconnect();
                    cacheClient = null;
                }
            }
        };
    },
});
