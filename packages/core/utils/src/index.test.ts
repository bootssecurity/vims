import { describe, expect, it } from "vitest";
import { formatNumber } from "./index";

describe("shared helpers", () => {
  it("formats numbers using US locale separators", () => {
    expect(formatNumber(12000)).toBe("12,000");
  });
});
