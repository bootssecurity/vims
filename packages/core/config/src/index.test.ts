import { describe, expect, it } from "vitest";
import { loadVimsConfig } from "./index";

describe("config", () => {
  it("loads stable local defaults", () => {
    const config = loadVimsConfig();
    expect(config.name).toBe("vims");
    expect(config.postgresUrl).toContain("127.0.0.1:5432");
    expect(config.redisUrl).toContain("127.0.0.1:6379");
  });

  it("accepts explicit enabled modules and providers", () => {
    const config = loadVimsConfig({
      enabledModules: ["tenancy", "inventory"],
      enabledProviders: ["database-postgres"],
    });

    expect(config.enabledModules).toEqual(["tenancy", "inventory"]);
    expect(config.enabledProviders).toEqual(["database-postgres"]);
  });
});
