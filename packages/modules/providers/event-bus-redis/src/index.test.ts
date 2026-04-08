import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedisEventBus } from "./event-bus";

// Mock BullMQ and ioredis
vi.mock("bullmq", () => {
  return {
    Queue: class {
      addBulk = vi.fn().mockResolvedValue(undefined);
      close = vi.fn();
    },
    Worker: class {
      on = vi.fn();
      close = vi.fn();
    },
  };
});

vi.mock("ioredis", () => {
  return {
    default: class {
      disconnect = vi.fn();
    },
  };
});

describe("RedisEventBus Provider", () => {
  let loggerMock: any;

  beforeEach(() => {
    loggerMock = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  });

  it("initializes without throwing", () => {
    const bus = new RedisEventBus({
      logger: loggerMock,
      options: { redisUrl: "redis://127.0.0.1:6379" },
    });
    expect(bus).toBeDefined();
  });

  it("subscribes and emits properly via bullmq mocks", async () => {
    const bus = new RedisEventBus({
      logger: loggerMock,
      options: { redisUrl: "redis://127.0.0.1:6379" },
    });
    
    const sub = vi.fn();
    await bus.subscribe("evt", sub);
    await bus.emit({ name: "evt", payload: { id: 1 } });
    
    // addBulk should be called on the mocked Queue
    const queueInstance = (bus as any).queue;
    expect(queueInstance.addBulk).toHaveBeenCalled();
  });
});
