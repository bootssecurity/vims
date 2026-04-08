import { describe, expect, it } from "vitest";
import { createEventBus } from "./index";

describe("createEventBus — subscribe / unsubscribe", () => {
  it("subscribes a function and triggers it when event fires", async () => {
    const bus = createEventBus();
    const received: unknown[] = [];

    bus.subscribe("order.created", (payload) => { received.push(payload); });
    bus.emit("order.created", { id: "o_1" });

    expect(received).toEqual([{ id: "o_1" }]);
  });

  it("supports multiple subscribers for the same event", () => {
    const bus = createEventBus();
    const a: string[] = [];
    const b: string[] = [];

    bus.subscribe("tenant.booted", () => { a.push("a"); });
    bus.subscribe("tenant.booted", () => { b.push("b"); });
    bus.emit("tenant.booted", {});

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it("does not trigger subscribers of other events", () => {
    const bus = createEventBus();
    const received: unknown[] = [];

    bus.subscribe("auth.booted", () => { received.push("wrong"); });
    bus.emit("tenant.booted", {});

    expect(received).toHaveLength(0);
  });

  it("unsubscribes a specific subscriber", () => {
    const bus = createEventBus();
    const received: unknown[] = [];

    const handler = (payload: unknown) => { received.push(payload); };
    bus.subscribe("plugin.loaded", handler);
    bus.unsubscribe("plugin.loaded", handler);
    bus.emit("plugin.loaded", { key: "website-builder" });

    expect(received).toHaveLength(0);
  });

  it("unsubscribing one handler leaves other handlers intact", () => {
    const bus = createEventBus();
    const a: unknown[] = [];
    const b: unknown[] = [];

    const handlerA = (p: unknown) => { a.push(p); };
    const handlerB = (p: unknown) => { b.push(p); };

    bus.subscribe("website.published", handlerA);
    bus.subscribe("website.published", handlerB);
    bus.unsubscribe("website.published", handlerA);
    bus.emit("website.published", { siteId: "s_1" });

    expect(a).toHaveLength(0);
    expect(b).toHaveLength(1);
  });

  it("does not throw when unsubscribing from an event with no subscribers", () => {
    const bus = createEventBus();
    expect(() => bus.unsubscribe("never.subscribed", () => {})).not.toThrow();
  });

  it("does not throw when emitting an event with no subscribers", () => {
    const bus = createEventBus();
    expect(() => bus.emit("ghost.event", {})).not.toThrow();
  });

  it("subscriber count remains accurate after unsubscribe", () => {
    const bus = createEventBus();
    const h1 = () => {};
    const h2 = () => {};
    bus.subscribe("crm.lead.created", h1);
    bus.subscribe("crm.lead.created", h2);
    bus.unsubscribe("crm.lead.created", h1);

    let callCount = 0;
    bus.subscribe("crm.lead.created", () => { callCount++; });
    bus.emit("crm.lead.created", {});
    expect(callCount).toBe(1);
  });
});

