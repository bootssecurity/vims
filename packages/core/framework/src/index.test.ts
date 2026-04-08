import { describe, expect, it } from "vitest";
import { bootFramework, createFrameworkManifest, defineModule, defineProvider, definePlugin, bootFrameworkAsync } from "./index";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeDb = () =>
  defineProvider({
    key: "database-postgres",
    label: "PostgreSQL",
    category: "database",
    register: () => ({ kind: "postgres", query: async (sql: string) => sql }),
  });

const makeEventBus = () =>
  defineProvider({
    key: "event-bus-local",
    label: "Local Event Bus",
    category: "events",
    register: () => ({
      bus: {
        events: [] as string[],
        emit(name: string, payload: unknown) {
          this.events.push(name);
        },
      },
    }),
  });

// ─── Dependency Resolution ───────────────────────────────────────────────────

describe("dependency resolution", () => {
  it("resolves modules in topological order respecting dependsOn", () => {
    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [makeDb()],
        modules: [
          defineModule({ key: "rbac", label: "RBAC", owner: "modules/rbac", dependsOn: ["auth"], register: () => ({}) }),
          defineModule({ key: "auth", label: "Auth", owner: "modules/auth", dependsOn: ["tenancy"], register: () => ({}) }),
          defineModule({ key: "tenancy", label: "Tenancy", owner: "modules/tenancy", register: () => ({}) }),
        ],
        plugins: [],
      })
    );

    const order = runtime.moduleOrder;
    expect(order.indexOf("tenancy")).toBeLessThan(order.indexOf("auth"));
    expect(order.indexOf("auth")).toBeLessThan(order.indexOf("rbac"));
  });

  it("throws on circular module dependency", () => {
    expect(() =>
      bootFramework(
        createFrameworkManifest({
          providers: [],
          modules: [
            defineModule({ key: "a", label: "A", owner: "a", dependsOn: ["b"], register: () => ({}) }),
            defineModule({ key: "b", label: "B", owner: "b", dependsOn: ["a"], register: () => ({}) }),
          ],
          plugins: [],
        })
      )
    ).toThrow(/Circular module dependency/);
  });

  it("throws when a module depends on an unknown module", () => {
    expect(() =>
      bootFramework(
        createFrameworkManifest({
          providers: [],
          modules: [
            defineModule({ key: "auth", label: "Auth", owner: "auth", dependsOn: ["does-not-exist"], register: () => ({}) }),
          ],
          plugins: [],
        })
      )
    ).toThrow(/Unknown module dependency/);
  });
});

// ─── Provider Resolution ──────────────────────────────────────────────────────

describe("provider injection", () => {
  it("makes providers available to modules via resolveProvider", () => {
    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [makeDb()],
        modules: [
          defineModule({
            key: "inventory",
            label: "Inventory",
            owner: "modules/inventory",
            register: ({ resolveProvider, registerService }) => {
              const db = resolveProvider<{ kind: string }>("database-postgres");
              registerService("inventory.dbKind", db.kind);
              return { db };
            },
          }),
        ],
        plugins: [],
      })
    );

    expect(runtime.services["inventory.dbKind"]).toBe("postgres");
  });

  it("throws when a module resolves an unregistered provider", () => {
    expect(() =>
      bootFramework(
        createFrameworkManifest({
          providers: [],
          modules: [
            defineModule({
              key: "payments",
              label: "Payments",
              owner: "modules/payments",
              register: ({ resolveProvider }) => {
                resolveProvider("stripe");
                return {};
              },
            }),
          ],
          plugins: [],
        })
      )
    ).toThrow(/Provider "stripe" is not registered/);
  });
});

// ─── Service Registry ────────────────────────────────────────────────────────

describe("service registry", () => {
  it("exposes services on runtime.services and container", () => {
    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [],
        modules: [
          defineModule({
            key: "tenancy",
            label: "Tenancy",
            owner: "modules/tenancy",
            register: ({ registerService }) => {
              registerService("tenancy.mode", "dealer-site");
              return {};
            },
          }),
        ],
        plugins: [],
      })
    );

    expect(runtime.services["tenancy.mode"]).toBe("dealer-site");
    expect(runtime.container.resolve("service:tenancy.mode")).toBe("dealer-site");
  });

  it("allows multiple modules to register independent services", () => {
    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [],
        modules: [
          defineModule({ key: "a", label: "A", owner: "a", register: ({ registerService }) => { registerService("a.ready", true); return {}; } }),
          defineModule({ key: "b", label: "B", owner: "b", register: ({ registerService }) => { registerService("b.ready", true); return {}; } }),
        ],
        plugins: [],
      })
    );

    expect(runtime.services["a.ready"]).toBe(true);
    expect(runtime.services["b.ready"]).toBe(true);
  });
});

// ─── Plugin System ────────────────────────────────────────────────────────────

describe("plugin system", () => {
  it("registers plugins after modules and records plugin order", () => {
    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [],
        modules: [
          defineModule({ key: "websites", label: "Websites", owner: "modules/websites", register: () => ({}) }),
        ],
        plugins: [
          definePlugin({
            key: "website-builder",
            label: "Website Builder",
            owner: "plugins/website-builder",
            register: ({ registerService }) => {
              registerService("plugins.website-builder.sections", ["hero", "cta"]);
              return { ready: true };
            },
          }),
        ],
      })
    );

    expect(runtime.pluginOrder).toEqual(["website-builder"]);
    expect(runtime.plugins.has("website-builder")).toBe(true);
    expect(runtime.services["plugins.website-builder.sections"]).toEqual(["hero", "cta"]);
    expect(runtime.container.has("plugin:website-builder")).toBe(true);
  });

  it("plugin with no register function uses defaults", () => {
    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [],
        modules: [],
        plugins: [
          definePlugin({ key: "analytics", label: "Analytics", owner: "plugins/analytics" }),
        ],
      })
    );

    expect(runtime.pluginOrder).toContain("analytics");
  });
});

// ─── Lifecycle Hooks ─────────────────────────────────────────────────────────

describe("lifecycle hooks", () => {
  it("calls boot and shutdown hooks in correct order", async () => {
    const log: string[] = [];

    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [
          defineProvider({
            key: "event-bus-local",
            label: "Event Bus",
            category: "events",
            register: () => ({}),
            boot: () => { log.push("provider:boot"); },
            shutdown: () => { log.push("provider:shutdown"); },
          }),
        ],
        modules: [
          defineModule({
            key: "tenancy",
            label: "Tenancy",
            owner: "modules/tenancy",
            register: () => ({}),
            boot: () => { log.push("module:boot"); },
            shutdown: () => { log.push("module:shutdown"); },
          }),
        ],
        plugins: [
          definePlugin({
            key: "website-builder",
            label: "Website Builder",
            owner: "plugins/website-builder",
            boot: () => { log.push("plugin:boot"); },
            shutdown: () => { log.push("plugin:shutdown"); },
          }),
        ],
      })
    );

    await runtime.shutdown();

    expect(log).toEqual([
      "provider:boot",
      "module:boot",
      "plugin:boot",
      "plugin:shutdown",
      "module:shutdown",
      "provider:shutdown",
    ]);
  });

  it("runs async prepare and start lifecycle via bootFrameworkAsync", async () => {
    const log: string[] = [];

    const runtime = await bootFrameworkAsync(
      createFrameworkManifest({
        providers: [
          defineProvider({
            key: "db",
            label: "DB",
            category: "database",
            register: () => ({}),
            prepare: async () => { log.push("prepare"); },
            start: async () => { log.push("start"); },
            prepareShutdown: async () => { log.push("prepareShutdown"); },
          }),
        ],
        modules: [],
        plugins: [],
      })
    );

    await runtime.start();
    await runtime.shutdown();

    expect(log).toEqual(["prepare", "start", "prepareShutdown"]);
  });
});

// ─── Module inter-resolution  ────────────────────────────────────────────────

describe("module cross-resolution", () => {
  it("allows a module to resolve another module registered before it", () => {
    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [],
        modules: [
          defineModule({
            key: "tenancy",
            label: "Tenancy",
            owner: "modules/tenancy",
            register: ({ registerService }) => {
              registerService("tenancy.plan", "enterprise");
              return { plan: "enterprise" };
            },
          }),
          defineModule({
            key: "rbac",
            label: "RBAC",
            owner: "modules/rbac",
            dependsOn: ["tenancy"],
            register: ({ resolveModule, registerService }) => {
              const tenancy = resolveModule<{ plan: string }>("tenancy");
              registerService("rbac.plan", tenancy.plan);
              return {};
            },
          }),
        ],
        plugins: [],
      })
    );

    expect(runtime.services["rbac.plan"]).toBe("enterprise");
  });
});
