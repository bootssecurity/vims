import Redis from "ioredis";
import { defineProvider } from "@vims/framework";

export function createRedisUrl() {
  return process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
}

let cacheClient: Redis | null = null;
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
      async get(namespace: string, key: string) {
        const value = await cacheClient!.get(`${namespace}:${key}`);
        return value ? JSON.parse(value) : null;
      },
      async set(namespace: string, key: string, data: any, ttl: number = DEFAULT_TTL) {
        await cacheClient!.set(
          `${namespace}:${key}`, 
          JSON.stringify(data), 
          "EX", 
          ttl
        );
      },
      async invalidate(namespace: string, keys?: string[]) {
        if (!keys || keys.length === 0) {
          const matchedKeys = await cacheClient!.keys(`${namespace}:*`);
          if (matchedKeys.length > 0) {
            await cacheClient!.del(...matchedKeys);
          }
        } else {
          await cacheClient!.del(...keys.map((k) => `${namespace}:${k}`));
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
