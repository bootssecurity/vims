import { describe, expect, it } from "vitest";
import {
  createRedisUrl,
  redisCacheProvider,
} from "./index";

describe("cache redis provider", () => {
  it("defines a cache provider contract", () => {
    expect(redisCacheProvider.key).toBe("cache-redis");
  });

  it("creates a redis client with local defaults", async () => {
    expect(createRedisUrl()).toContain("127.0.0.1:6379");
    const service: any = await redisCacheProvider.register({} as any);
    expect(service.key).toBe("cache-redis");
    expect(service.get).toBeDefined();
    expect(service.set).toBeDefined();
    expect(service.invalidate).toBeDefined();
    await service.destroy();
  });
});
