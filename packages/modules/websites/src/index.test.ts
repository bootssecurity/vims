import { describe, expect, it } from "vitest";
import { websiteSectionLibrary } from "./index";

describe("websites", () => {
  it("keeps the builder section library schema-driven", () => {
    expect(websiteSectionLibrary.map((section) => section.key)).toEqual([
      "hero",
      "featured-inventory",
      "finance-cta",
      "dealer-trust",
    ]);
  });
});
