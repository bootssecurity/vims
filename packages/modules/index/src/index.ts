import { auditModule } from "@vims/audit";
import { authModule } from "@vims/auth";
import { crmModule } from "@vims/crm";
import { inventoryModule } from "@vims/inventory";
import { rbacModule } from "@vims/rbac";
import { tenancyModule } from "@vims/tenancy";
import { websitesModule } from "@vims/websites";
import { redisCacheProvider } from "@vims/cache-redis";
import { postgresProvider } from "@vims/database-postgres";
import { localEventBusProvider } from "@vims/event-bus-local";

export const platformModules = [
  auditModule,
  authModule,
  crmModule,
  inventoryModule,
  rbacModule,
  tenancyModule,
  websitesModule,
] as const;

export const platformProviders = [
  redisCacheProvider,
  postgresProvider,
  localEventBusProvider,
] as const;
