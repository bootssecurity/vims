import { describe, expect, it } from "vitest";
import { discoverWorkspaceManifest, workspaceCatalog } from "./workspace-catalog";

describe("workspace catalog", () => {
  it("contains discovered modules, providers, and plugins", () => {
    expect(Object.keys(workspaceCatalog.modules)).toContain("tenancy");
    expect(Object.keys(workspaceCatalog.providers)).toContain("database-postgres");
    expect(Object.keys(workspaceCatalog.plugins)).toContain("website-builder");
  });

  it("filters discovered manifests by config", () => {
    const manifest = discoverWorkspaceManifest({
      enabledModules: ["tenancy", "inventory"],
      enabledProviders: ["database-postgres"],
      enabledPlugins: ["website-builder"],
    });

    expect(manifest.modules.map((moduleDefinition) => moduleDefinition.key)).toEqual([
      "tenancy",
      "inventory",
    ]);
    expect(
      manifest.providers.map((providerDefinition) => providerDefinition.key),
    ).toEqual(["database-postgres"]);
    expect(manifest.plugins.map((pluginDefinition) => pluginDefinition.key)).toEqual([
      "website-builder",
    ]);
  });
});
