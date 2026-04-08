import { describe, expect, it } from "vitest";
import { bootTestVimsApp } from "@vims/test-utils";

// ─── Framework Integration ────────────────────────────────────────────────────

describe("framework runtime integration", () => {
  it("boots providers and modules through the kernel in correct dependency order", () => {
    const runtime = bootTestVimsApp({ name: "integration-tests" });

    expect(runtime.providerOrder).toEqual([
      "database-postgres",
      "cache-redis",
      "event-bus-local",
    ]);
    expect(runtime.moduleOrder).toEqual([
      "tenancy",
      "auth",
      "rbac",
      "audit",
      "inventory",
      "crm",
      "websites",
    ]);
    expect(runtime.pluginOrder).toEqual(["website-builder"]);
  });

  it("registers all expected services", () => {
    const runtime = bootTestVimsApp({ name: "services-test" });

    expect(runtime.services["crm.pipelineStages"]).toBeDefined();
    expect(runtime.services["plugins.website-builder.sections"]).toBeDefined();
    expect(runtime.services["auth.strategies"]).toEqual(["password", "magic-link", "sso"]);
    expect(runtime.services["rbac.roles"]).toBeDefined();
    expect(runtime.services["tenancy.resolveTenantMode"]).toBeDefined();
  });

  it("registers all modules and plugins in the container", () => {
    const runtime = bootTestVimsApp({ name: "container-integration" });

    expect(runtime.container.has("module:audit")).toBe(true);
    expect(runtime.container.has("module:auth")).toBe(true);
    expect(runtime.container.has("module:rbac")).toBe(true);
    expect(runtime.container.has("module:tenancy")).toBe(true);
    expect(runtime.container.has("module:inventory")).toBe(true);
    expect(runtime.container.has("module:crm")).toBe(true);
    expect(runtime.container.has("module:websites")).toBe(true);
    expect(runtime.container.has("plugin:website-builder")).toBe(true);
  });

  it("resolves auth module and verifies JWT roundtrip", () => {
    const runtime = bootTestVimsApp({ name: "auth-jwt-integration" });
    const auth = runtime.modules.get("auth") as {
      issueSessionToken(id: string): string;
      verifySessionToken(token: string): { userId: string } | null;
    };

    const token = auth.issueSessionToken("user_001");
    const decoded = auth.verifySessionToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe("user_001");
  });

  it("resolves rbac module can() method via container", () => {
    const runtime = bootTestVimsApp({ name: "rbac-integration" });
    const rbac = runtime.container.resolve<{ can(role: string, perm: string): boolean }>("module:rbac");

    expect(rbac.can("platform_admin", "platform.manage")).toBe(true);
    expect(rbac.can("sales_rep", "platform.manage")).toBe(false);
  });

  it("resolves tenancy module via container", () => {
    const runtime = bootTestVimsApp({ name: "tenancy-integration" });
    const tenancy = runtime.container.resolve<{
      resolveTenantMode(host: string): { mode: string };
    }>("module:tenancy");

    expect(tenancy.resolveTenantMode("admin.company.com").mode).toBe("platform-admin");
    expect(tenancy.resolveTenantMode("dealer.company.com").mode).toBe("dealer-site");
  });

  it("can resolve services by service container key", () => {
    const runtime = bootTestVimsApp({ name: "service-container-test" });

    const strategies = runtime.container.resolve<string[]>("service:auth.strategies");
    expect(strategies).toContain("password");
  });

  it("shuts down cleanly", async () => {
    const runtime = bootTestVimsApp({ name: "shutdown-integration" });
    await expect(runtime.shutdown()).resolves.toBeUndefined();
  });
});
