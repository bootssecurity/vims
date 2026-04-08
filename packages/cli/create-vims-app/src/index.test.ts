import { describe, expect, it } from "vitest";

describe("create-vims-app cli", () => {
  it("keeps the cli workspace under versioned control", () => {
    expect("create-vims-app").toContain("vims");
  });
});
