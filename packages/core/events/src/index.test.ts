import { describe, expect, it } from "vitest";
import { createEventBus } from "./index";

describe("events", () => {
  it("records emitted events", () => {
    const bus = createEventBus();
    bus.emit("test.created", { id: "1" });
    expect(bus.count("test.created")).toBe(1);
  });
});
