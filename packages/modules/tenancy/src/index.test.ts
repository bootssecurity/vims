import { describe, expect, it } from "vitest";
import { tenancyModule, resolveTenantMode } from "./index";

describe("tenancy module", () => {
  it("reports the correct module key", () => {
    expect(tenancyModule.key).toBe("tenancy");
    expect(tenancyModule.label).toBe("Tenancy");
    expect(tenancyModule.dependsOn).toBeUndefined();
  });

  describe("resolveTenantMode()", () => {
    it("resolves 'platform-admin' when hostname contains 'admin'", () => {
      const result = resolveTenantMode("admin.vims.app");
      expect(result.mode).toBe("platform-admin");
      expect(result.label).toBe("Platform administration");
    });

    it("resolves 'dealer-site' for standard storefronts", () => {
      const result = resolveTenantMode("dealership.vims.app");
      expect(result.mode).toBe("dealer-site");
      expect(result.label).toBe("Dealer-branded runtime");
    });

    it("resolves 'dealer-site' for localhost without admin in name", () => {
      const result = resolveTenantMode("localhost:3000");
      expect(result.mode).toBe("dealer-site");
    });

    it("resolves 'platform-admin' when hostname is exactly 'admin'", () => {
      const result = resolveTenantMode("admin");
      expect(result.mode).toBe("platform-admin");
    });
  });

  it("registers resolveTenantMode as a service during boot", () => {
    const registeredServices: Record<string, unknown> = {};
    tenancyModule.register({
      config: {} as any,
      providers: new Map(),
      modules: new Map(),
      plugins: new Map(),
      services: {},
      registerService: (key, value) => { registeredServices[key] = value; },
      resolveProvider: () => { throw new Error("not wired"); },
      resolveModule: () => { throw new Error("not wired"); },
      resolvePlugin: () => { throw new Error("not wired"); },
    });

    expect(registeredServices["tenancy.resolveTenantMode"]).toBe(resolveTenantMode);
  });
});
