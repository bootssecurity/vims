import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedisLocking } from "./locking";

// Mock ioredis
vi.mock("ioredis", () => {
  return {
    default: class {
      set = vi.fn().mockResolvedValue("OK");
      eval = vi.fn().mockResolvedValue(1);
      disconnect = vi.fn();
    },
  };
});

describe("RedisLocking Provider", () => {
  let loggerMock: any;

  beforeEach(() => {
    loggerMock = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  });

  it("initializes without throwing", () => {
    const locker = new RedisLocking({
      logger: loggerMock,
      options: { redisUrl: "redis://127.0.0.1:6379" },
    });
    expect(locker).toBeDefined();
  });

  it("acquires and releases lock", async () => {
    const locker = new RedisLocking({
      logger: loggerMock,
      options: { redisUrl: "redis://127.0.0.1:6379" },
    });
    
    // Acquire
    const token = await locker.acquire("test-key", { expireTimeout: 5000 });
    expect(token).toBeDefined();
    
    // Release
    const success = await locker.release("test-key", token);
    expect(success).toBe(true);
    
    // IORedis methods should have been called
    const client = (locker as any).client;
    expect(client.set).toHaveBeenCalledWith(
      "vims:lock:test-key",
      expect.any(String),
      "PX",
      5000,
      "NX"
    );
    expect(client.eval).toHaveBeenCalled();
  });
});
