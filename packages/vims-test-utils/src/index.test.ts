import { describe, expect, it } from "vitest";
import { bootTestVimsApp, createTestManifest, createModuleTestRunner, defaultTestModules, defaultTestProviders } from "./index";
import { createMockEventCollector } from "./events";
import { createDatabaseTestContext } from "./database";
import { initModulesForTest } from "./init-modules";

// ─── Integration: Full framework boot ────────────────────────────────────────

describe("bootTestVimsApp()", () => {
  it("boots all default modules in correct dependency order", () => {
    const runtime = bootTestVimsApp({ name: "full-boot-test" });

    const order = runtime.moduleOrder;
    // tenancy must come before auth (auth dependsOn tenancy)
    expect(order.indexOf("tenancy")).toBeLessThan(order.indexOf("auth"));
    // auth must come before rbac (rbac dependsOn auth)
    expect(order.indexOf("auth")).toBeLessThan(order.indexOf("rbac"));
    expect(order).toContain("inventory");
    expect(order).toContain("crm");
    expect(order).toContain("websites");
    expect(order).toContain("audit");
  });

  it("registers all default providers in order", () => {
    const runtime = bootTestVimsApp({ name: "providers-test" });
    expect(runtime.providerOrder).toContain("database-postgres");
    expect(runtime.providerOrder).toContain("cache-redis");
    expect(runtime.providerOrder).toContain("event-bus-local");
  });

  it("boots the website-builder plugin", () => {
    const runtime = bootTestVimsApp({ name: "plugins-test" });
    expect(runtime.pluginOrder).toContain("website-builder");
    expect(runtime.container.has("plugin:website-builder")).toBe(true);
  });

  it("exposes all module instances in the container", () => {
    const runtime = bootTestVimsApp({ name: "container-test" });
    for (const module of defaultTestModules) {
      expect(runtime.container.has(`module:${module.key}`), `expected module:${module.key}`).toBe(true);
    }
  });

  it("registers auth.strategies service", () => {
    const runtime = bootTestVimsApp({ name: "auth-service-test" });
    expect(runtime.services["auth.strategies"]).toEqual(["password", "magic-link", "sso"]);
  });

  it("registers rbac.roles service", () => {
    const runtime = bootTestVimsApp({ name: "rbac-service-test" });
    const roles = runtime.services["rbac.roles"] as string[];
    expect(roles).toContain("platform_admin");
    expect(roles).toContain("dealer_admin");
  });

  it("registers tenancy.resolveTenantMode service", () => {
    const runtime = bootTestVimsApp({ name: "tenancy-service-test" });
    const resolve = runtime.services["tenancy.resolveTenantMode"] as Function;
    expect(typeof resolve).toBe("function");
    expect(resolve("admin.vims.app").mode).toBe("platform-admin");
  });

  it("accepts runtime config name override", () => {
    const runtime = bootTestVimsApp({ name: "custom-name" });
    expect(runtime.config.name).toBe("custom-name");
  });

  it("can gracefully shut down", async () => {
    const runtime = bootTestVimsApp({ name: "shutdown-test" });
    await expect(runtime.shutdown()).resolves.toBeUndefined();
  });
});

// ─── createTestManifest ───────────────────────────────────────────────────────

describe("createTestManifest()", () => {
  it("returns a manifest with default modules and providers", () => {
    const manifest = createTestManifest();
    expect(manifest.modules).toHaveLength(defaultTestModules.length);
    expect(manifest.providers).toHaveLength(defaultTestProviders.length);
  });

  it("manifest modules include all expected keys", () => {
    const manifest = createTestManifest();
    const keys = manifest.modules.map((m) => m.key);
    expect(keys).toContain("tenancy");
    expect(keys).toContain("auth");
    expect(keys).toContain("rbac");
    expect(keys).toContain("audit");
    expect(keys).toContain("inventory");
    expect(keys).toContain("crm");
    expect(keys).toContain("websites");
  });
});

// ─── createModuleTestRunner ───────────────────────────────────────────────────

describe("createModuleTestRunner()", () => {
  it("exposes boot(), manifest(), and config()", () => {
    const runner = createModuleTestRunner();
    expect(typeof runner.boot).toBe("function");
    expect(typeof runner.manifest).toBe("function");
    expect(typeof runner.config).toBe("function");
  });

  it("boot() returns a running Vims runtime", () => {
    const runner = createModuleTestRunner();
    const runtime = runner.boot({ name: "runner-boot" });
    expect(runtime.moduleOrder.length).toBeGreaterThan(0);
    expect(runtime.container.has("module:tenancy")).toBe(true);
  });

  it("config() returns test environment config", () => {
    const runner = createModuleTestRunner();
    expect(runner.config().environment).toBe("test");
  });

  it("manifest() returns full default manifest", () => {
    const runner = createModuleTestRunner();
    const m = runner.manifest();
    expect(m.plugins.length).toBeGreaterThan(0);
  });
});

// ─── initModulesForTest ───────────────────────────────────────────────────────

describe("initModulesForTest()", () => {
  it("boots the runtime with a given name", () => {
    const runtime = initModulesForTest("my-test-suite");
    expect(runtime.config.name).toBe("my-test-suite");
  });
});

// ─── createMockEventCollector ────────────────────────────────────────────────

describe("createMockEventCollector()", () => {
  it("collects emitted events", () => {
    const collector = createMockEventCollector();
    collector.emit("order.created", { id: "o_1" });
    collector.emit("order.created", { id: "o_2" });
    collector.emit("tenant.booted", { tenantId: "t_1" });

    const all = collector.all();
    expect(all).toHaveLength(3);
    expect(all[0]).toEqual({ name: "order.created", payload: { id: "o_1" } });
    expect(all[2]).toEqual({ name: "tenant.booted", payload: { tenantId: "t_1" } });
  });

  it("all() returns a snapshot, not a live reference", () => {
    const collector = createMockEventCollector();
    collector.emit("a", {});
    const snap = collector.all();
    collector.emit("b", {});
    expect(snap).toHaveLength(1);
  });
});

// ─── createDatabaseTestContext ────────────────────────────────────────────────

describe("createDatabaseTestContext()", () => {
  it("returns a connectionString pointing to vims db", () => {
    const ctx = createDatabaseTestContext();
    expect(ctx.connectionString).toContain("vims");
    expect(ctx.schema).toBe("public");
  });

  it("uses POSTGRES_URL env override when set", () => {
    process.env.POSTGRES_URL = "postgres://custom:pw@host:5432/custom_db";
    const ctx = createDatabaseTestContext();
    expect(ctx.connectionString).toBe("postgres://custom:pw@host:5432/custom_db");
    delete process.env.POSTGRES_URL;
  });
});
