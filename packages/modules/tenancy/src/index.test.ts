import { describe, expect, it } from "vitest";
import { resolveTenantMode } from "./index";

describe("tenancy", () => {
  it("resolves admin hostnames to platform administration mode", () => {
    expect(resolveTenantMode("admin.vims.local")).toMatchObject({
      mode: "platform-admin",
      label: "Platform administration",
    });
  });

  it("defaults dealer hostnames to dealer runtime mode", () => {
    expect(resolveTenantMode("dealer-one.vims.local")).toMatchObject({
      mode: "dealer-site",
      label: "Dealer-branded runtime",
    });
  });
});
