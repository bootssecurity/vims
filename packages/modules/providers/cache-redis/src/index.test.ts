import { describe, expect, it } from "vitest";
import {
  createRedisCacheClient,
  createRedisUrl,
  redisCacheProvider,
} from "./index";

describe("cache redis provider", () => {
  it("defines a cache provider contract", () => {
    expect(redisCacheProvider.key).toBe("cache-redis");
  });

  it("creates a redis client with local defaults", () => {
    expect(createRedisUrl()).toContain("127.0.0.1:6379");
    expect(createRedisCacheClient().options?.url).toContain("127.0.0.1:6379");
  });
});
