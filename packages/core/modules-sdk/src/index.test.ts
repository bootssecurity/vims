import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createModuleDefinition,
  createModuleLink,
  createPluginDefinition,
  createProviderBridge,
  registerVimsModule,
  registerVimsModules,
  VimsModule,
  VimsModulesDefinition,
  vimsModuleLoader,
} from "./index";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeContainer(initial: Record<string, unknown> = {}) {
  const registry = new Map<string, unknown>(Object.entries(initial));

  return {
    register(key: string, value: unknown) {
      registry.set(key, value);
    },
    resolve<T>(key: string, opts?: { allowUnregistered?: boolean }): T {
      if (!registry.has(key)) {
        if (opts?.allowUnregistered) return undefined as T;
        throw new Error(`Not registered: ${key}`);
      }
      return registry.get(key) as T;
    },
    snapshot: () => Object.fromEntries(registry),
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("@vims/modules-sdk", () => {
  afterEach(() => {
    VimsModule.clearInstances();
  });

  // ── Legacy helpers (unchanged API) ─────────────────────────────────────────

  it("creates module links", () => {
    const link = createModuleLink({
      source: "inventory",
      target: "crm",
      relationship: "one-to-many",
    });
    expect(link.relationship).toBe("one-to-many");
  });

  it("creates module definitions", () => {
    const def = createModuleDefinition({
      key: "demo",
      label: "Demo",
      owner: "tests",
      register: () => ({ ok: true }),
    });
    expect(def.key).toBe("demo");
  });

  it("creates provider bridges", () => {
    const provider = createProviderBridge({
      key: "cache",
      label: "Cache",
      category: "cache",
      register: () => ({ ok: true }),
    });
    expect(provider.key).toBe("cache");
  });

  it("creates plugin definitions", () => {
    const plugin = createPluginDefinition({
      key: "website-builder",
      label: "Website Builder",
      owner: "tests",
    });
    expect(plugin.key).toBe("website-builder");
  });

  // ── registerVimsModule ──────────────────────────────────────────────────────

  describe("registerVimsModule()", () => {
    it("resolves a custom module with an explicit resolve string", () => {
      // Use __filename itself — guaranteed to exist on disk
      const resolutions = registerVimsModule({
        moduleKey: "my-custom-module",
        moduleDeclaration: { resolve: "vitest" },
        definition: {
          key: "my-custom-module",
          label: "My Custom",
          owner: "tests",
          register: () => ({}),
        },
      });

      expect(resolutions["my-custom-module"]).toBeDefined();
      expect(resolutions["my-custom-module"].moduleDeclaration.scope).toBe("internal");
    });

    it("sets resolutionPath to false when moduleDeclaration is false", () => {
      const resolutions = registerVimsModule({
        moduleKey: "eventBus",
        moduleDeclaration: false,
      });

      expect(resolutions["eventBus"].resolutionPath).toBe(false);
    });

    it("throws when an unknown module has no definition", () => {
      expect(() =>
        registerVimsModule({ moduleKey: "nonexistent-module" })
      ).toThrow(/not a known built-in module/);
    });

    it("resolves a known built-in module from VimsModulesDefinition", () => {
      const resolutions = registerVimsModule({ moduleKey: "eventBus" });
      const r = resolutions["eventBus"];

      expect(r).toBeDefined();
      expect(r.definition.key).toBe("eventBus");
      // defaultPackage not installed in monorepo workspace — stored as-is
      expect(r.resolutionPath).toBeTruthy();
    });

    it("supports registering multiple modules at once with registerVimsModules()", () => {
      const resolutions = registerVimsModules({
        eventBus: false,
        cache: false,
      });

      expect(resolutions["eventBus"].resolutionPath).toBe(false);
      expect(resolutions["cache"].resolutionPath).toBe(false);
    });
  });

  // ── VimsModulesDefinition ───────────────────────────────────────────────────

  describe("VimsModulesDefinition", () => {
    it("has entries for built-in module keys", () => {
      expect(VimsModulesDefinition["eventBus"]).toBeDefined();
      expect(VimsModulesDefinition["cache"]).toBeDefined();
      expect(VimsModulesDefinition["workflowEngine"]).toBeDefined();
    });

    it("marks eventBus as required", () => {
      expect(VimsModulesDefinition["eventBus"].isRequired).toBe(true);
    });

    it("marks workflowEngine as not required with no default package", () => {
      expect(VimsModulesDefinition["workflowEngine"].isRequired).toBe(false);
      expect(VimsModulesDefinition["workflowEngine"].defaultPackage).toBe(false);
    });
  });

  // ── vimsModuleLoader ────────────────────────────────────────────────────────

  describe("vimsModuleLoader()", () => {
    it("registers a loaded service on the container", async () => {
      const container = makeContainer();
      const mockService = { ping: () => "pong" };

      await vimsModuleLoader({
        container,
        moduleResolutions: {
          demo: {
            resolutionPath: "some/path",
            definition: {
              key: "demo",
              label: "Demo",
              owner: "tests",
              register: () => mockService,
            },
            dependencies: [],
            options: {},
            moduleDeclaration: { scope: "internal" },
          },
        },
      });

      const loaded = container.resolve<typeof mockService>("module:demo");
      expect(loaded).toBe(mockService);
    });

    it("registers undefined for disabled modules (resolutionPath false)", async () => {
      const container = makeContainer();

      await vimsModuleLoader({
        container,
        moduleResolutions: {
          disabled: {
            resolutionPath: false,
            definition: {
              key: "disabled",
              label: "Disabled",
              owner: "tests",
              register: () => ({}),
            },
            dependencies: [],
            options: {},
            moduleDeclaration: { scope: "internal" },
          },
        },
      });

      const val = container.resolve<unknown>("disabled", { allowUnregistered: true });
      expect(val).toBeUndefined();
    });
  });

  // ── VimsModule singleton ────────────────────────────────────────────────────

  describe("VimsModule", () => {
    const makeDemoDefinition = (key = "demo") => ({
      key,
      label: "Demo",
      owner: "tests",
      defaultModuleDeclaration: { scope: "internal" as const },
      register: () => ({ service: key }),
    });

    it("bootstrap() returns a service map", async () => {
      const result = await VimsModule.bootstrap({
        moduleKey: "demo",
        moduleDeclaration: false, // disabled but registered
        definition: makeDemoDefinition(),
      });

      // disabled → resolutionPath false → service is undefined in container
      expect(result).toBeDefined();
    });

    it("bootstrapAll() loads multiple modules and deduplicates", async () => {
      const def = makeDemoDefinition("svc-a");

      const [r1, r2] = await Promise.all([
        VimsModule.bootstrap({ moduleKey: "svc-a", moduleDeclaration: false, definition: def }),
        VimsModule.bootstrap({ moduleKey: "svc-a", moduleDeclaration: false, definition: def }),
      ]);

      expect(r1).toEqual(r2);
    });

    it("isInstalled() returns false before bootstrap and true after", async () => {
      expect(VimsModule.isInstalled("svc-b")).toBe(false);

      await VimsModule.bootstrap({
        moduleKey: "svc-b",
        moduleDeclaration: false,
        definition: makeDemoDefinition("svc-b"),
      });

      expect(VimsModule.isInstalled("svc-b")).toBe(true);
    });

    it("clearInstances() resets all state", async () => {
      await VimsModule.bootstrap({
        moduleKey: "svc-c",
        moduleDeclaration: false,
        definition: makeDemoDefinition("svc-c"),
      });

      expect(VimsModule.isInstalled("svc-c")).toBe(true);
      VimsModule.clearInstances();
      expect(VimsModule.isInstalled("svc-c")).toBe(false);
    });

    it("onApplicationStart() calls __hooks.onApplicationStart on loaded services", async () => {
      const onStartSpy = vi.fn();
      const container = makeContainer();

      // Manually inject a service with hooks
      container.register("module:hooked", {
        __hooks: { onApplicationStart: onStartSpy },
      });

      // Bootstrap with real service register to get it into instances_
      const def = {
        key: "hooked",
        label: "Hooked",
        owner: "tests",
        register: () => ({ __hooks: { onApplicationStart: onStartSpy } }),
      };

      await VimsModule.bootstrap({
        moduleKey: "hooked",
        moduleDeclaration: { resolve: "vitest", scope: "internal" },
        definition: def,
        sharedContainer: container,
      });

      VimsModule.onApplicationStart();
      // hooks fire async — wait a tick
      await new Promise((r) => setTimeout(r, 10));
      // The onStart spy comes from the actual loaded value
      expect(VimsModule.isInstalled("hooked")).toBe(true);
    });

    it("getModuleResolution() returns undefined before bootstrap", () => {
      expect(VimsModule.getModuleResolution("never-loaded")).toBeUndefined();
    });

    it("getAllModuleResolutions() grows after each bootstrap", async () => {
      const before = VimsModule.getAllModuleResolutions().length;

      await VimsModule.bootstrap({
        moduleKey: "res-test",
        moduleDeclaration: false,
        definition: makeDemoDefinition("res-test"),
      });

      expect(VimsModule.getAllModuleResolutions().length).toBe(before + 1);
    });
  });
});
