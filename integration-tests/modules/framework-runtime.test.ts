import { describe, expect, it } from "vitest";
import { bootTestVimsApp } from "@vims/test-utils";

describe("framework runtime", () => {
  it("boots providers and modules through the kernel", () => {
    const runtime = bootTestVimsApp({
      name: "integration-tests",
    });

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
    expect(runtime.services["crm.pipelineStages"]).toBeDefined();
    expect(runtime.services["plugins.website-builder.sections"]).toBeDefined();
    expect(runtime.container.has("module:audit")).toBe(true);
    expect(runtime.container.has("plugin:website-builder")).toBe(true);
  });
});
