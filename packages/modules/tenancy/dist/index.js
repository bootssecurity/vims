import { defineModule } from "@vims/framework";
export function resolveTenantMode(hostname) {
    if (hostname.includes("admin")) {
        return {
            mode: "platform-admin",
            label: "Platform administration",
            description: "Use a dedicated admin hostname for internal operations, support tooling, and cross-tenant controls.",
        };
    }
    return {
        mode: "dealer-site",
        label: "Dealer-branded runtime",
        description: "Resolve dealership branding, permissions, and website rendering from hostname or organization mapping.",
    };
}
export const tenancyModule = defineModule({
    key: "tenancy",
    label: "Tenancy",
    owner: "packages/modules/tenancy",
    register: ({ registerService }) => {
        const api = {
            resolveTenantMode,
        };
        registerService("tenancy.resolveTenantMode", resolveTenantMode);
        return api;
    },
});
