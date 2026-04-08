export const migrationDomains = [
  {
    name: "tenancy",
    configPath: "packages/modules/tenancy/drizzle.config.ts",
    migrationsFolder: "packages/modules/tenancy/drizzle",
  },
  {
    name: "inventory",
    configPath: "packages/modules/inventory/drizzle.config.ts",
    migrationsFolder: "packages/modules/inventory/drizzle",
  },
  {
    name: "crm",
    configPath: "packages/modules/crm/drizzle.config.ts",
    migrationsFolder: "packages/modules/crm/drizzle",
  },
  {
    name: "websites",
    configPath: "packages/modules/websites/drizzle.config.ts",
    migrationsFolder: "packages/modules/websites/drizzle",
  },
];
