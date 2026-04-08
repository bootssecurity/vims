import { describe, expect, it } from "vitest";
import { createContainer } from "./index";

describe("createContainer", () => {
  it("registers and resolves a value", () => {
    const container = createContainer();
    container.register("logger", { log: () => {} });
    expect(container.resolve("logger")).toBeDefined();
  });

  it("throws when resolving an unregistered key", () => {
    const container = createContainer();
    expect(() => container.resolve("missing")).toThrow(
      'Container value "missing" is not registered'
    );
  });

  it("has() returns true for registered keys and false for missing", () => {
    const container = createContainer();
    container.register("key", "value");
    expect(container.has("key")).toBe(true);
    expect(container.has("unknown")).toBe(false);
  });

  it("entries() returns all registered key-value pairs", () => {
    const container = createContainer();
    container.register("a", 1);
    container.register("b", 2);
    const entries = container.entries();
    expect(entries).toContainEqual(["a", 1]);
    expect(entries).toContainEqual(["b", 2]);
  });

  it("overwrites a previously registered key", () => {
    const container = createContainer();
    container.register("key", "v1");
    container.register("key", "v2");
    expect(container.resolve("key")).toBe("v2");
  });

  it("preserves type integrity when resolving typed values", () => {
    const container = createContainer();
    const service = { name: "inventory", list: () => [] };
    container.register("module:inventory", service);
    const resolved = container.resolve<typeof service>("module:inventory");
    expect(resolved.name).toBe("inventory");
    expect(resolved.list()).toEqual([]);
  });
});
