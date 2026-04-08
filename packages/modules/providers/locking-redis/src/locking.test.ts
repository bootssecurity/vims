import { describe, expect, it, vi } from "vitest";
import { RedisLocking } from "./locking";

// ── Mocked Redis client ───────────────────────────────────────────────────────

function makeRedisClient(overrides: Partial<{
  set: (...args: any[]) => Promise<string | null>;
  eval: (...args: any[]) => Promise<number>;
  disconnect: () => void;
}> = {}) {
  return {
    set: vi.fn().mockResolvedValue("OK"),
    eval: vi.fn().mockResolvedValue(1),
    disconnect: vi.fn(),
    ...overrides,
  };
}

function makeLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

// Patch ioredis import with our mock
vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(function () { return makeRedisClient(); } as any),
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RedisLocking", () => {
  it("acquires a lock and returns an owner token", async () => {
    const locking = new RedisLocking({
      logger: makeLogger(),
      options: { redisUrl: "redis://localhost:6379" },
    });

    const token = await locking.acquire("inventory:update");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("throws when a lock cannot be acquired (Redis returns null)", async () => {
    const Redis = (await import("ioredis")).default;
    vi.mocked(Redis).mockImplementationOnce(function () {
      return makeRedisClient({
        set: vi.fn().mockResolvedValue(null), // NX condition fails
      });
    } as any);

    const locking = new RedisLocking({
      logger: makeLogger(),
      options: { redisUrl: "redis://localhost:6379" },
    });

    await expect(locking.acquire("order:checkout")).rejects.toThrow(
      /Could not acquire lock/
    );
  });

  it("releases a lock and returns true on success", async () => {
    const locking = new RedisLocking({
      logger: makeLogger(),
      options: { redisUrl: "redis://localhost:6379" },
    });

    const token = await locking.acquire("crm:lead:update");
    const released = await locking.release("crm:lead:update", token);
    expect(released).toBe(true);
  });

  it("returns false when release fails (token mismatch via Lua)", async () => {
    const Redis = (await import("ioredis")).default;
    vi.mocked(Redis).mockImplementationOnce(function () {
      return makeRedisClient({
        eval: vi.fn().mockResolvedValue(0), // Lua returns 0 = did not own the lock
      });
    } as any);

    const locking = new RedisLocking({
      logger: makeLogger(),
      options: { redisUrl: "redis://localhost:6379" },
    });

    const released = await locking.release("some:key", "wrong-token");
    expect(released).toBe(false);
  });

  it("uses a custom prefix when provided", async () => {
    const client = makeRedisClient();
    const Redis = (await import("ioredis")).default;
    vi.mocked(Redis).mockImplementationOnce(function () { return client; } as any);

    const locking = new RedisLocking({
      logger: makeLogger(),
      options: { redisUrl: "redis://localhost:6379", prefix: "myapp:lk:" },
    });

    await locking.acquire("users:update");

    const setCall = (client.set as any).mock.calls[0];
    expect(setCall[0]).toMatch(/^myapp:lk:/);
  });

  it("uses the default 'vims:lock:' prefix when none provided", async () => {
    const client = makeRedisClient();
    const Redis = (await import("ioredis")).default;
    vi.mocked(Redis).mockImplementationOnce(function () { return client; } as any);

    const locking = new RedisLocking({
      logger: makeLogger(),
      options: { redisUrl: "redis://localhost:6379" },
    });

    await locking.acquire("tenants:create");

    const setCall = (client.set as any).mock.calls[0];
    expect(setCall[0]).toMatch(/^vims:lock:/);
  });

  it("joins multiple keys with ':' into a single Redis key", async () => {
    const client = makeRedisClient();
    const Redis = (await import("ioredis")).default;
    vi.mocked(Redis).mockImplementationOnce(function () { return client; } as any);

    const locking = new RedisLocking({
      logger: makeLogger(),
      options: { redisUrl: "redis://localhost:6379" },
    });

    await locking.acquire(["region", "US", "inventory"]);

    const setCall = (client.set as any).mock.calls[0];
    expect(setCall[0]).toContain("region:US:inventory");
  });

  it("destroy() disconnects the Redis client", async () => {
    const client = makeRedisClient();
    const Redis = (await import("ioredis")).default;
    vi.mocked(Redis).mockImplementationOnce(function () { return client; } as any);

    const locking = new RedisLocking({
      logger: makeLogger(),
      options: { redisUrl: "redis://localhost:6379" },
    });

    await locking.destroy();
    expect((client.disconnect as any).mock.calls.length).toBe(1);
  });
});

