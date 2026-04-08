import { describe, expect, it } from "vitest";

import { websiteBuilderPlugin } from "./index";

describe("@vims/plugin-website-builder", () => {
  it("exposes website builder plugin metadata", () => {
    expect(websiteBuilderPlugin.key).toBe("website-builder");
    expect(websiteBuilderPlugin.links).toHaveLength(1);
    expect(websiteBuilderPlugin.admin.sections.length).toBeGreaterThan(0);
  });
});
