import { describe, expect, it } from "vitest";
import { authStrategies } from "./index";

describe("auth", () => {
  it("exposes auth strategies", () => {
    expect(authStrategies).toContain("password");
  });
});
