import { describe, expect, it } from "vitest";
import { loadVimsConfig } from "./index";

describe("loadVimsConfig", () => {
  it("returns stable local defaults without env vars", () => {
    const config = loadVimsConfig();
    expect(config.name).toBe("vims");
    expect(["development", "test"]).toContain(config.environment);
    expect(config.postgresUrl).toContain("5432");
    expect(config.redisUrl).toContain("6379");
    expect(config.enableAdmin).toBe(true);
    expect(config.enableTelemetry).toBe(false);
  });

  it("accepts name override", () => {
    const config = loadVimsConfig({ name: "my-app" });
    expect(config.name).toBe("my-app");
  });

  it("accepts environment override", () => {
    const config = loadVimsConfig({ environment: "production" });
    expect(config.environment).toBe("production");
  });

  it("accepts postgresUrl override", () => {
    const config = loadVimsConfig({ postgresUrl: "postgres://user:pass@db:5432/mydb" });
    expect(config.postgresUrl).toBe("postgres://user:pass@db:5432/mydb");
  });

  it("accepts redisUrl override", () => {
    const config = loadVimsConfig({ redisUrl: "redis://cache:6380" });
    expect(config.redisUrl).toBe("redis://cache:6380");
  });

  it("accepts enableAdmin: false override", () => {
    const config = loadVimsConfig({ enableAdmin: false });
    expect(config.enableAdmin).toBe(false);
  });

  it("accepts enableTelemetry: true override", () => {
    const config = loadVimsConfig({ enableTelemetry: true });
    expect(config.enableTelemetry).toBe(true);
  });

  it("accepts enabledModules list", () => {
    const config = loadVimsConfig({ enabledModules: ["tenancy", "auth"] });
    expect(config.enabledModules).toEqual(["tenancy", "auth"]);
  });

  it("accepts enabledProviders list", () => {
    const config = loadVimsConfig({ enabledProviders: ["database-postgres"] });
    expect(config.enabledProviders).toEqual(["database-postgres"]);
  });

  it("accepts enabledPlugins list", () => {
    const config = loadVimsConfig({ enabledPlugins: ["website-builder"] });
    expect(config.enabledPlugins).toEqual(["website-builder"]);
  });

  it("reads POSTGRES_URL from environment", () => {
    process.env.POSTGRES_URL = "postgres://env:env@envhost:5432/envdb";
    const config = loadVimsConfig();
    expect(config.postgresUrl).toBe("postgres://env:env@envhost:5432/envdb");
    delete process.env.POSTGRES_URL;
  });

  it("reads REDIS_URL from environment", () => {
    process.env.REDIS_URL = "redis://envredis:6380";
    const config = loadVimsConfig();
    expect(config.redisUrl).toBe("redis://envredis:6380");
    delete process.env.REDIS_URL;
  });

  it("reads VIMS_APP_NAME from environment", () => {
    process.env.VIMS_APP_NAME = "env-app";
    const config = loadVimsConfig();
    expect(config.name).toBe("env-app");
    delete process.env.VIMS_APP_NAME;
  });

  it("overrides take priority over env vars", () => {
    process.env.VIMS_APP_NAME = "env-app";
    const config = loadVimsConfig({ name: "override-app" });
    expect(config.name).toBe("override-app");
    delete process.env.VIMS_APP_NAME;
  });

  it("reads VIMS_ENABLED_MODULES CSV from environment", () => {
    process.env.VIMS_ENABLED_MODULES = "tenancy,auth,rbac";
    const config = loadVimsConfig();
    expect(config.enabledModules).toEqual(["tenancy", "auth", "rbac"]);
    delete process.env.VIMS_ENABLED_MODULES;
  });

  it("trims whitespace from CSV env var entries", () => {
    process.env.VIMS_ENABLED_MODULES = " tenancy , auth ";
    const config = loadVimsConfig();
    expect(config.enabledModules).toEqual(["tenancy", "auth"]);
    delete process.env.VIMS_ENABLED_MODULES;
  });

  it("returns undefined for enabledModules when env var is empty", () => {
    delete process.env.VIMS_ENABLED_MODULES;
    const config = loadVimsConfig();
    expect(config.enabledModules).toBeUndefined();
  });
});
