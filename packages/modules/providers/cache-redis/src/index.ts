import { createClient } from "redis";
import { defineProvider } from "@vims/framework";

export function createRedisUrl() {
  return process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
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
