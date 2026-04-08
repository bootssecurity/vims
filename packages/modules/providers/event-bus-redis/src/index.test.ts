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
    
    const sub1 = vi.fn();
    const sub2 = vi.fn();
    await bus.subscribe("evt", sub1);
    await bus.subscribe("evt", sub2);
    await bus.emit({ name: "evt", payload: { id: 1 } });
    
    // addBulk should be called on the mocked Queue with two jobs because of two subscribers
    const queueInstance = (bus as any).queue;
    expect(queueInstance.addBulk).toHaveBeenCalledTimes(1);

    const passedJobs = queueInstance.addBulk.mock.calls[0][0];
    expect(passedJobs).toHaveLength(2);
    expect(passedJobs[0].name).toBe("evt:0");
    expect(passedJobs[1].name).toBe("evt:1");
    expect(passedJobs[0].data).toEqual({ eventName: "evt", payload: { id: 1 }, subscriberIndex: 0 });
    expect(passedJobs[1].data).toEqual({ eventName: "evt", payload: { id: 1 }, subscriberIndex: 1 });
  });
});
