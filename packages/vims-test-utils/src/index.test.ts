import { describe, expect, it } from "vitest";
import {
  bootTestVimsApp,
  createModuleTestRunner,
  createTestConfig,
  createTestManifest,
  defaultTestModules,
  defaultTestProviders,
} from "./index";

describe("@vims/test-utils", () => {
  it("provides a reusable framework manifest", () => {
    const manifest = createTestManifest();

    expect(manifest.modules).toHaveLength(defaultTestModules.length);
    expect(manifest.providers).toHaveLength(defaultTestProviders.length);
  });

  it("boots a reusable test runtime", () => {
    const runtime = bootTestVimsApp({
      name: "boot-test-utils",
    });

    expect(createTestConfig().environment).toBe("test");
    expect(runtime.moduleOrder).toContain("inventory");
    expect(runtime.providerOrder).toContain("database-postgres");
    expect(runtime.container.has("module:crm")).toBe(true);
  });

  it("provides a module test runner facade", () => {
    const runner = createModuleTestRunner();
    const runtime = runner.boot({
      name: "module-runner",
    });

    expect(runner.manifest().modules).toHaveLength(defaultTestModules.length);
    expect(runner.config().environment).toBe("test");
    expect(runtime.moduleOrder).toContain("websites");
  });
});
