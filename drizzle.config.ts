import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/vims",
  },
  schema: [
    "./packages/modules/tenancy/src/db/schema.ts",
    "./packages/modules/inventory/src/db/schema.ts",
    "./packages/modules/crm/src/db/schema.ts",
    "./packages/modules/websites/src/db/schema.ts",
  ],
  out: "./drizzle/platform",
  strict: true,
  verbose: true,
});
