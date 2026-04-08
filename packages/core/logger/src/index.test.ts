import { describe, expect, it } from "vitest";
import { createLogger } from "./index";

describe("logger", () => {
  it("records structured log entries", () => {
    const logger = createLogger();
    logger.info("framework.booted", { modules: 1 });
    expect(logger.all()).toHaveLength(1);
  });
});
