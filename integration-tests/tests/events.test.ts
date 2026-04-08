import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { setupServer } from "../helpers/setup-server";
import { resetDatabase } from "../helpers/use-db";

let vims: any;
let eventBus: any;
let cache: any;

describe("Architecture Parity: Redis BullMQ Workers", () => {
  beforeAll(async () => {
    await resetDatabase("vims_test_events");
    const internals = await setupServer("vims_test_events");
    vims = internals.vims;
    
    // Resolve providers locally
    eventBus = (vims.runtime.container.resolve("provider:event-bus-local") as any).bus;
    try {
      eventBus = (vims.runtime.container.resolve("provider:event-bus-redis") as any).bus;
    } catch {}
    cache = vims.runtime.container.resolve("provider:cache-redis");
    console.log("RESOLVED CACHE IN TESTS:", Object.keys(cache), cache);
  });

  afterAll(async () => {
    if (vims) {
      await vims.shutdown();
    }
  });

  it("handles async events across independent BullMQ queues dynamically", async () => {
    const testId = `integration-req-${Math.random()}`;

    // 1. Check it's empty
    const beforehand = await cache.get("test-namespace", `event-processed-${testId}`);
    expect(beforehand).toBeNull();

    // 2. Fire independent pub/sub event over Redis
    await eventBus.emit({
      name: "integration.test",
      payload: { id: testId },
    });

    // 3. Wait for Worker node to async process and run subscriber function
    await new Promise((r) => setTimeout(r, 2000));

    // 4. Trace the results executed by the async subscriber
    const afterwards = await cache.get("test-namespace", `event-processed-${testId}`);
    expect(afterwards).toEqual({ fired: true });
  });
});
