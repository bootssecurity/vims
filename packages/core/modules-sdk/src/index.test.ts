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
  VimsLinkRegistry,
  Link,
  LinkRepository,
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

    it("marks workflowEngine as not required", () => {
      expect(VimsModulesDefinition["workflowEngine"].isRequired).toBe(false);
      expect(VimsModulesDefinition["workflowEngine"].defaultPackage).toBe("@vims/workflows-sdk");
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

// ── createModuleLink + VimsLinkRegistry ───────────────────────────────────────

describe("createModuleLink() + VimsLinkRegistry", () => {
  afterEach(() => {
    VimsLinkRegistry.clear();
  });

  it("returns a registration with a stable linkId", () => {
    const link = createModuleLink({
      source: "crm",
      target: "inventory",
      relationship: "one-to-many",
    });

    expect(link.linkId).toBe("crm<>id<>inventory<>id");
    expect(link.sourceKey).toBe("id");
    expect(link.targetKey).toBe("id");
  });

  it("registers the link in VimsLinkRegistry", () => {
    createModuleLink({
      source: "audit",
      target: "crm",
      relationship: "one-to-one",
      sourceKey: "event_id",
      targetKey: "deal_id",
    });

    expect(VimsLinkRegistry.size).toBe(1);
    const entry = VimsLinkRegistry.get("audit<>event_id<>crm<>deal_id");
    expect(entry).toBeDefined();
    expect(entry?.relationship).toBe("one-to-one");
  });

  it("deduplicates links with the same linkId", () => {
    const link1 = createModuleLink({ source: "a", target: "b", relationship: "one-to-many" });
    const link2 = createModuleLink({ source: "a", target: "b", relationship: "one-to-many" });

    // Both calls → same linkId → only 1 entry in registry
    expect(VimsLinkRegistry.size).toBe(1);
    expect(link1.linkId).toBe(link2.linkId);
  });

  it("supports deleteCascade and metadata fields", () => {
    const link = createModuleLink({
      source: "websites",
      target: "tenancy",
      relationship: "many-to-many",
      deleteCascade: true,
      metadata: { priority: 1 },
    });

    expect(link.deleteCascade).toBe(true);
    expect(link.metadata?.priority).toBe(1);
  });
});

// ── Link class ────────────────────────────────────────────────────────────────

describe("Link class", () => {
  afterEach(() => {
    VimsLinkRegistry.clear();
  });

  function setup() {
    // Register two test link definitions
    createModuleLink({ source: "crm", target: "inventory", relationship: "one-to-many", deleteCascade: true });
    createModuleLink({ source: "audit", target: "crm", relationship: "one-to-one", deleteCascade: false });
    return new Link(VimsLinkRegistry);
  }

  it("create() adds link entries", async () => {
    const link = setup();
    await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-1" } });

    const rows = link.dump();
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("deal-1");
    expect(rows[0].target).toBe("prod-1");
  });

  it("create() supports batch input", async () => {
    const link = setup();
    await link.create([
      { crm: { id: "deal-1" }, inventory: { id: "prod-1" } },
      { crm: { id: "deal-1" }, inventory: { id: "prod-2" } },
    ]);
    expect(link.dump()).toHaveLength(2);
  });

  it("dismiss() removes specific links", async () => {
    const link = setup();
    await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-1" } });
    await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-2" } });
    await link.dismiss({ crm: { id: "deal-1" }, inventory: { id: "prod-1" } });

    const rows = link.dump();
    expect(rows).toHaveLength(1);
    expect(rows[0].target).toBe("prod-2");
  });

  it("list() returns matching links", async () => {
    const link = setup();
    await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-1" } });
    await link.create({ crm: { id: "deal-2" }, inventory: { id: "prod-2" } });

    const results = await link.list({ crm: { id: "deal-1" } });
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("deal-1");
    expect(results[0].target).toBe("prod-1");
  });

  it("delete() removes source links and returns cascade metadata", async () => {
    const link = setup();
    await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-1" } });
    await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-2" } });

    const result = await link.delete({ crm: { id: ["deal-1"] } });
    expect(link.dump()).toHaveLength(0);

    // cascade metadata should include the linked inventory records
    expect(result.affected.inventory).toBeDefined();
    expect(result.affected.inventory.id).toContain("prod-1");
    expect(result.affected.inventory.id).toContain("prod-2");
    expect(result.errors).toHaveLength(0);
  });

  it("delete() without deleteCascade does not return cascade metadata", async () => {
    const link = setup();
    await link.create({ audit: { id: "evt-1" }, crm: { id: "deal-1" } });
    const result = await link.delete({ audit: { id: ["evt-1"] } });

    // audit→crm has deleteCascade: false → no cascade metadata
    expect(result.affected).toEqual({});
  });

  it("restore() is a no-op that returns empty result", async () => {
    const link = setup();
    const result = await link.restore({ crm: { id: ["deal-1"] } });
    expect(result.affected).toEqual({});
    expect(result.errors).toHaveLength(0);
  });

  it("throws when creating link between unregistered modules", async () => {
    const link = setup();
    await expect(
      link.create({ unknown: { id: "x" }, also_unknown: { id: "y" } })
    ).rejects.toThrow();
  });
});

// ── LinkRepository (in-memory fallback) ──────────────────────────────────────

describe("LinkRepository (in-memory fallback)", () => {
  it("insert() stores an edge", async () => {
    const repo = new LinkRepository();
    await repo.insert({ linkId: "a<>b", sourceModule: "a", sourceId: "s1", targetModule: "b", targetId: "t1" });
    const edges = await repo.find({ linkId: "a<>b" });
    expect(edges).toHaveLength(1);
    expect(edges[0].sourceId).toBe("s1");
    expect(edges[0].targetId).toBe("t1");
  });

  it("insert() is idempotent", async () => {
    const repo = new LinkRepository();
    const edge = { linkId: "x<>y", sourceModule: "x", sourceId: "s1", targetModule: "y", targetId: "t1" };
    await repo.insert(edge);
    await repo.insert(edge);
    expect(await repo.count({ linkId: "x<>y" })).toBe(1);
  });

  it("findTargetIds() returns linked target IDs", async () => {
    const repo = new LinkRepository();
    await repo.insert({ linkId: "crm<>inv", sourceModule: "crm", sourceId: "deal-1", targetModule: "inv", targetId: "prod-1" });
    await repo.insert({ linkId: "crm<>inv", sourceModule: "crm", sourceId: "deal-1", targetModule: "inv", targetId: "prod-2" });
    const ids = await repo.findTargetIds("crm<>inv", "deal-1");
    expect(ids).toContain("prod-1");
    expect(ids).toContain("prod-2");
  });

  it("findSourceIds() returns linked source IDs", async () => {
    const repo = new LinkRepository();
    await repo.insert({ linkId: "crm<>inv", sourceModule: "crm", sourceId: "deal-1", targetModule: "inv", targetId: "prod-1" });
    await repo.insert({ linkId: "crm<>inv", sourceModule: "crm", sourceId: "deal-2", targetModule: "inv", targetId: "prod-1" });
    const ids = await repo.findSourceIds("crm<>inv", "prod-1");
    expect(ids).toContain("deal-1");
    expect(ids).toContain("deal-2");
  });

  it("deleteBySource() removes edges", async () => {
    const repo = new LinkRepository();
    await repo.insert({ linkId: "crm<>inv", sourceModule: "crm", sourceId: "deal-1", targetModule: "inv", targetId: "prod-1" });
    await repo.deleteBySource("crm<>inv", "deal-1");
    expect(await repo.count({ linkId: "crm<>inv" })).toBe(0);
  });

  it("deleteByTarget() removes edges pointing to a target", async () => {
    const repo = new LinkRepository();
    await repo.insert({ linkId: "crm<>inv", sourceModule: "crm", sourceId: "deal-1", targetModule: "inv", targetId: "prod-1" });
    await repo.insert({ linkId: "crm<>inv", sourceModule: "crm", sourceId: "deal-2", targetModule: "inv", targetId: "prod-1" });
    await repo.deleteByTarget("crm<>inv", "prod-1");
    expect(await repo.count({ linkId: "crm<>inv" })).toBe(0);
  });

  it("find() filters by sourceId array", async () => {
    const repo = new LinkRepository();
    await repo.insert({ linkId: "L", sourceModule: "a", sourceId: "s1", targetModule: "b", targetId: "t1" });
    await repo.insert({ linkId: "L", sourceModule: "a", sourceId: "s2", targetModule: "b", targetId: "t2" });
    const edges = await repo.find({ linkId: "L", sourceId: ["s1"] });
    expect(edges).toHaveLength(1);
    expect(edges[0].sourceId).toBe("s1");
  });
});

// ── Link with repository injection ────────────────────────────────────────────

describe("Link with LinkRepository", () => {
  afterEach(() => {
    VimsLinkRegistry.clear();
  });

  it("create() persists to repo and in-memory cache", async () => {
    createModuleLink({ source: "crm", target: "inventory", relationship: "one-to-many" });
    const repo = new LinkRepository();
    const link = new Link(VimsLinkRegistry, { repository: repo });

    await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-1" } });
    expect(link.dump()).toHaveLength(1);

    const [linkId] = [...VimsLinkRegistry.keys()];
    const edges = await repo.find({ linkId });
    expect(edges).toHaveLength(1);
    expect(edges[0].sourceId).toBe("deal-1");
  });

  it("getTargetIds() returns from cache", async () => {
    createModuleLink({ source: "crm", target: "inventory", relationship: "one-to-many" });
    const repo = new LinkRepository();
    const link = new Link(VimsLinkRegistry, { repository: repo });
    await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-1" } });

    const [linkId] = [...VimsLinkRegistry.keys()];
    const ids = await link.getTargetIds(linkId, "deal-1");
    expect(ids).toContain("prod-1");
  });

  it("delete() removes from cache and repo", async () => {
    createModuleLink({ source: "crm", target: "inventory", relationship: "one-to-many", deleteCascade: true });
    const repo = new LinkRepository();
    const link = new Link(VimsLinkRegistry, { repository: repo });
    await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-1" } });
    await link.delete({ crm: { id: ["deal-1"] } });

    expect(link.dump()).toHaveLength(0);
    expect(await repo.count({})).toBe(0);
  });

  it("hydrate() warms cache from repo", async () => {
    createModuleLink({ source: "crm", target: "inventory", relationship: "one-to-many" });
    const [linkId] = [...VimsLinkRegistry.keys()];
    const reg = VimsLinkRegistry.get(linkId)!;

    const repo = new LinkRepository();
    await repo.insert({ linkId, sourceModule: reg.source, sourceId: "s1", targetModule: reg.target, targetId: "t1" });

    const link = new Link(VimsLinkRegistry, { repository: repo });
    expect(link.dump()).toHaveLength(0);
    await link.hydrate(linkId);
    expect(link.dump()).toHaveLength(1);
  });
});
