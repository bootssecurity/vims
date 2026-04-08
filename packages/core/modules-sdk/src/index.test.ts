import { describe, expect, it } from "vitest";

import {
  createModuleDefinition,
  createModuleLink,
  createPluginDefinition,
  createProviderBridge,
  registerVimsModule,
} from "./index";

describe("@vims/modules-sdk", () => {
  it("creates module links and module definitions", () => {
    const link = createModuleLink({
      source: "inventory",
      target: "crm",
      relationship: "one-to-many",
    });
    const moduleDefinition = createModuleDefinition({
      key: "demo",
      label: "Demo",
      owner: "tests",
      register: () => ({ ok: true }),
    });
    const provider = createProviderBridge({
      key: "cache",
      label: "Cache",
      category: "cache",
      register: () => ({ ok: true }),
    });
    const plugin = createPluginDefinition({
      key: "website-builder",
      label: "Website Builder",
      owner: "tests",
    });
    const registration = registerVimsModule({
      key: "demo",
      module: moduleDefinition,
    });

    expect(link.relationship).toBe("one-to-many");
    expect(moduleDefinition.key).toBe("demo");
    expect(provider.key).toBe("cache");
    expect(plugin.key).toBe("website-builder");
    expect(registration.module?.key).toBe("demo");
  });
});
