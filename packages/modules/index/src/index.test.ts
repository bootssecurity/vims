import { describe, expect, it } from "vitest";

import { platformModules, platformProviders } from "./index";

describe("@vims/modules", () => {
  it("exposes platform modules and providers", () => {
    expect(platformModules.length).toBeGreaterThan(3);
    expect(platformProviders.length).toBe(3);
  });
});
