import { createFrameworkCatalog, discoverManifest } from "@vims/framework";
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
import { redisEventBusProvider } from "@vims/event-bus-redis";
import { redisLockingProvider } from "@vims/locking-redis";
import { websiteBuilderPlugin } from "@vims/plugin-website-builder";
export const workspaceCatalog = createFrameworkCatalog({
    modules: [
        auditModule,
        authModule,
        crmModule,
        inventoryModule,
        rbacModule,
        tenancyModule,
        websitesModule,
    ],
    providers: [
        redisCacheProvider,
        postgresProvider,
        localEventBusProvider,
        redisEventBusProvider,
        redisLockingProvider,
    ],
    plugins: [
        websiteBuilderPlugin,
    ],
});
export function discoverWorkspaceManifest(config = {}) {
    return discoverManifest(workspaceCatalog, config);
}
