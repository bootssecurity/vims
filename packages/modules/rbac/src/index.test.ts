import { describe, expect, it } from "vitest";
import { rbacModule, defaultRoles } from "./index";

describe("rbac module", () => {
  it("has correct key and label", () => {
    expect(rbacModule.key).toBe("rbac");
    expect(rbacModule.label).toBe("RBAC");
    expect(rbacModule.dependsOn).toContain("auth");
  });

  it("registers all default roles as a service", () => {
    const services: Record<string, unknown> = {};
    rbacModule.register({
      config: {} as any,
      providers: new Map(),
      modules: new Map(),
      plugins: new Map(),
      services: {},
      registerService: (key, value) => { services[key] = value; },
      resolveProvider: () => { throw new Error(); },
      resolveModule: () => { throw new Error(); },
      resolvePlugin: () => { throw new Error(); },
    });

    expect(services["rbac.roles"]).toEqual(defaultRoles);
  });

  describe("can()", () => {
    const api = rbacModule.register({
      config: {} as any,
      providers: new Map(),
      modules: new Map(),
      plugins: new Map(),
      services: {},
      registerService: () => {},
      resolveProvider: () => { throw new Error(); },
      resolveModule: () => { throw new Error(); },
      resolvePlugin: () => { throw new Error(); },
    });

    it("platform_admin can do anything", () => {
      expect(api.can("platform_admin", "platform.manage")).toBe(true);
      expect(api.can("platform_admin", "anything.else")).toBe(true);
    });

    it("dealer_admin cannot manage platform", () => {
      expect(api.can("dealer_admin", "platform.manage")).toBe(false);
    });

    it("dealer_admin can do other permissions", () => {
      expect(api.can("dealer_admin", "inventory.view")).toBe(true);
    });

    it("sales_rep cannot manage platform", () => {
      expect(api.can("sales_rep", "platform.manage")).toBe(false);
    });

    it("defaultRoles contains expected roles", () => {
      expect(defaultRoles).toContain("platform_admin");
      expect(defaultRoles).toContain("dealer_admin");
      expect(defaultRoles).toContain("sales_manager");
      expect(defaultRoles).toContain("sales_rep");
    });
  });
});
