import { describe, expect, it } from "vitest";
import { localEventBusProvider } from "./index";

describe("local event bus provider", () => {
  it("registers an events provider", () => {
    expect(localEventBusProvider.key).toBe("event-bus-local");
  });
});
