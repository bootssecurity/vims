import { describe, expect, it } from "vitest";
import {
  bootFramework,
  bootFrameworkAsync,
  createFrameworkCatalog,
  createFrameworkManifest,
  definePlugin,
  discoverManifest,
  defineModule,
  defineProvider,
} from "./index";
import { loadVimsConfig } from "./config";
import { createContainer } from "./container";
import { createEventBus } from "./events";
import { createLogger } from "./logger";
import { allow, deny } from "./policies";
import { defineWorkflow } from "./workflows";

describe("framework", () => {
  it("builds a manifest from modules and providers", () => {
    const inventory = defineModule({
      key: "inventory",
      label: "Inventory",
      owner: "modules/inventory",
      register: () => ({
        ready: true,
      }),
    });

    const redis = defineProvider({
      key: "cache-redis",
      label: "Redis Cache",
      category: "cache",
      register: () => ({
        key: "cache-redis",
      }),
    });

    expect(
      createFrameworkManifest({
        modules: [inventory],
        providers: [redis],
        plugins: [],
      }),
    ).toEqual({
      modules: [inventory],
      providers: [redis],
      plugins: [],
    });
  });

  it("boots providers before dependent modules", () => {
    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [
          defineProvider({
            key: "database-postgres",
            label: "PostgreSQL",
            category: "database",
            register: () => ({
              kind: "postgres",
            }),
          }),
        ],
        modules: [
          defineModule({
            key: "tenancy",
            label: "Tenancy",
            owner: "packages/modules/tenancy",
            register: ({ registerService, resolveProvider }) => {
              const database = resolveProvider<{ kind: string }>(
                "database-postgres",
              );
              registerService("tenancy.database", database.kind);
              return {
                ready: true,
              };
            },
          }),
        ],
        plugins: [],
      }),
    );

    expect(runtime.providerOrder).toEqual(["database-postgres"]);
    expect(runtime.moduleOrder).toEqual(["tenancy"]);
    expect(runtime.pluginOrder).toEqual([]);
    expect(runtime.services["tenancy.database"]).toBe("postgres");
    expect(runtime.container.resolve<string>("service:tenancy.database")).toBe("postgres");
    expect(
      runtime.container.resolve<{ all: () => Array<{ message: string }> }>("logger").all(),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "framework.boot.complete" }),
      ]),
    );
  });

  it("discovers a manifest from a catalog and enabled config", () => {
    const catalog = createFrameworkCatalog({
      modules: [
        defineModule({
          key: "tenancy",
          label: "Tenancy",
          owner: "packages/modules/tenancy",
          register: () => ({}),
        }),
        defineModule({
          key: "inventory",
          label: "Inventory",
          owner: "packages/modules/inventory",
          dependsOn: ["tenancy"],
          register: () => ({}),
        }),
      ],
      providers: [
        defineProvider({
          key: "database-postgres",
          label: "PostgreSQL",
          category: "database",
          register: () => ({}),
        }),
        defineProvider({
          key: "cache-redis",
          label: "Redis",
          category: "cache",
          register: () => ({}),
        }),
      ],
      plugins: [
        definePlugin({
          key: "website-builder",
          label: "Website Builder",
          owner: "packages/plugins/website-builder",
        }),
      ],
    });

    const manifest = discoverManifest(catalog, {
      enabledModules: ["tenancy"],
      enabledProviders: ["database-postgres"],
      enabledPlugins: ["website-builder"],
    });

    expect(manifest.modules.map((moduleDefinition) => moduleDefinition.key)).toEqual([
      "tenancy",
    ]);
    expect(
      manifest.providers.map((providerDefinition) => providerDefinition.key),
    ).toEqual(["database-postgres"]);
    expect(manifest.plugins.map((pluginDefinition) => pluginDefinition.key)).toEqual([
      "website-builder",
    ]);
  });

  it("boots plugins and lifecycle hooks", async () => {
    const lifecycle: string[] = [];

    const runtime = bootFramework(
      createFrameworkManifest({
        providers: [
          defineProvider({
            key: "event-bus-local",
            label: "Local Event Bus",
            category: "events",
            register: () => ({ ready: true }),
            boot: () => {
              lifecycle.push("provider:boot");
            },
            shutdown: () => {
              lifecycle.push("provider:shutdown");
            },
          }),
        ],
        modules: [
          defineModule({
            key: "websites",
            label: "Websites",
            owner: "packages/modules/websites",
            register: ({ registerService }) => {
              registerService("websites.ready", true);
              return { ready: true };
            },
            boot: () => {
              lifecycle.push("module:boot");
            },
            shutdown: () => {
              lifecycle.push("module:shutdown");
            },
          }),
        ],
        plugins: [
          definePlugin({
            key: "website-builder",
            label: "Website Builder",
            owner: "packages/plugins/website-builder",
            dependsOn: [],
            register: ({ registerService }) => {
              registerService("plugin.website-builder.ready", true);
              return { ready: true };
            },
            boot: () => {
              lifecycle.push("plugin:boot");
            },
            shutdown: () => {
              lifecycle.push("plugin:shutdown");
            },
          }),
        ],
      }),
    );

    expect(runtime.pluginOrder).toEqual(["website-builder"]);
    expect(runtime.plugins.has("website-builder")).toBe(true);
    expect(runtime.services["plugin.website-builder.ready"]).toBe(true);

    await runtime.shutdown();

    expect(lifecycle).toEqual([
      "provider:boot",
      "module:boot",
      "plugin:boot",
      "plugin:shutdown",
      "module:shutdown",
      "provider:shutdown",
    ]);
  });

  it("runs async lifecycle stages", async () => {
    const lifecycle: string[] = [];

    const runtime = await bootFrameworkAsync(
      createFrameworkManifest({
        providers: [
          defineProvider({
            key: "database-postgres",
            label: "Database",
            category: "database",
            register: () => ({ ready: true }),
            prepare: async () => {
              lifecycle.push("provider:prepare");
            },
            start: async () => {
              lifecycle.push("provider:start");
            },
            prepareShutdown: async () => {
              lifecycle.push("provider:prepareShutdown");
            },
          }),
        ],
        modules: [],
        plugins: [],
      }),
    );

    await runtime.start();
    await runtime.shutdown();

    expect(lifecycle).toEqual([
      "provider:prepare",
      "provider:start",
      "provider:prepareShutdown",
    ]);
  });

  it("exposes framework support modules through dedicated subpaths", async () => {
    const config = loadVimsConfig({ name: "framework-subpaths" });
    const container = createContainer();
    const logger = createLogger();
    const bus = createEventBus();
    const workflow = defineWorkflow("publish-website", [
      {
        name: "mark-ready",
        run: (context: { ready: boolean }) => ({ ...context, ready: true }),
      },
    ]);

    container.register("logger", logger);
    bus.emit("website.published", { websiteId: "site_123" });

    expect(config.name).toBe("framework-subpaths");
    expect(container.resolve("logger")).toBe(logger);
    expect(logger.info("framework.subpath.loaded").message).toBe(
      "framework.subpath.loaded",
    );
    expect(bus.count("website.published")).toBe(1);
    expect(allow()).toEqual({ allowed: true });
    expect(deny("missing-role")).toEqual({
      allowed: false,
      reason: "missing-role",
    });
    await expect(workflow.run({ ready: false })).resolves.toEqual({ ready: true });
  });
});
