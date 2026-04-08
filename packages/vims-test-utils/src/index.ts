import { loadVimsConfig, type VimsRuntimeConfig } from "@vims/config";
import { createFrameworkManifest, createVimsApp } from "@vims/framework";
import { auditModule } from "@vims/audit";
import { authModule } from "@vims/auth";
import { crmModule } from "@vims/crm";
import { inventoryModule } from "@vims/inventory";
import { rbacModule } from "@vims/rbac";
import { tenancyModule } from "@vims/tenancy";
import { websitesModule } from "@vims/websites";
import { postgresProvider } from "@vims/database-postgres";
import { redisCacheProvider } from "@vims/cache-redis";
import { localEventBusProvider } from "@vims/event-bus-local";
import { websiteBuilderPlugin } from "@vims/plugin-website-builder";

export const defaultTestModules = [
  tenancyModule,
  authModule,
  rbacModule,
  auditModule,
  inventoryModule,
  crmModule,
  websitesModule,
] as const;

export const defaultTestProviders = [
  postgresProvider,
  redisCacheProvider,
  localEventBusProvider,
] as const;

export const defaultTestPlugins = [websiteBuilderPlugin] as const;

export function createTestConfig(
  overrides: Partial<VimsRuntimeConfig> = {},
): VimsRuntimeConfig {
  return loadVimsConfig({
    name: "vims-test-runtime",
    environment: "test",
    ...overrides,
  });
}

export function bootTestVimsApp(
  overrides: Partial<VimsRuntimeConfig> = {},
) {
  const config = createTestConfig(overrides);

  return createVimsApp(
    createFrameworkManifest({
      modules: [...defaultTestModules],
      providers: [...defaultTestProviders],
      plugins: [...defaultTestPlugins],
    }),
    config,
  );
}

export function createTestManifest() {
  return createFrameworkManifest({
    modules: [...defaultTestModules],
    providers: [...defaultTestProviders],
    plugins: [...defaultTestPlugins],
  });
}

export function createModuleTestRunner() {
  return {
    boot(overrides: Partial<VimsRuntimeConfig> = {}) {
      return bootTestVimsApp(overrides);
    },
    manifest() {
      return createTestManifest();
    },
    config(overrides: Partial<VimsRuntimeConfig> = {}) {
      return createTestConfig(overrides);
    },
  };
}
