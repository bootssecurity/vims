import { describe, expect, it } from "vitest";
import { createLogger } from "./index";

describe("createLogger", () => {
  it("records structured info entries", () => {
    const logger = createLogger();
    logger.info("framework.boot.start", { app: "vims" });

    const all = logger.all();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual({
      level: "info",
      message: "framework.boot.start",
      context: { app: "vims" },
    });
  });

  it("records debug entries", () => {
    const logger = createLogger();
    logger.debug("cache.miss", { key: "product:1" });

    const entry = logger.all()[0];
    expect(entry.level).toBe("debug");
    expect(entry.message).toBe("cache.miss");
    expect(entry.context?.key).toBe("product:1");
  });

  it("records warn entries", () => {
    const logger = createLogger();
    logger.warn("api.loader.scan.error", { path: "/src/api/missing" });

    const entry = logger.all()[0];
    expect(entry.level).toBe("warn");
    expect(entry.message).toBe("api.loader.scan.error");
  });

  it("records error entries", () => {
    const logger = createLogger();
    logger.error("framework.provider.failed", { provider: "database-postgres" });

    const entry = logger.all()[0];
    expect(entry.level).toBe("error");
    expect(entry.message).toBe("framework.provider.failed");
  });

  it("accumulates multiple entries in order", () => {
    const logger = createLogger();
    logger.info("step.1");
    logger.warn("step.2");
    logger.error("step.3");

    const all = logger.all();
    expect(all).toHaveLength(3);
    expect(all.map((e) => e.message)).toEqual(["step.1", "step.2", "step.3"]);
    expect(all.map((e) => e.level)).toEqual(["info", "warn", "error"]);
  });

  it("all() returns a snapshot copy — not a live reference", () => {
    const logger = createLogger();
    logger.info("first");
    const snap = logger.all();
    logger.info("second");
    expect(snap).toHaveLength(1);
    expect(logger.all()).toHaveLength(2);
  });

  it("works without context (context is undefined)", () => {
    const logger = createLogger();
    const entry = logger.info("ping");
    expect(entry.context).toBeUndefined();
  });

  it("returns the entry object directly from each method", () => {
    const logger = createLogger();
    const entry = logger.info("direct", { x: 1 });
    expect(entry).toEqual({ level: "info", message: "direct", context: { x: 1 } });
  });

  it("each logger instance maintains its own isolated store", () => {
    const a = createLogger();
    const b = createLogger();
    a.info("only-a");
    expect(b.all()).toHaveLength(0);
  });
});
