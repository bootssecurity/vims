import { defineModule } from "@vims/framework";
export const websiteSectionLibrary = [
    {
        key: "hero",
        label: "Hero",
        description: "Branded entry point with headline, media, CTA, and route-aware inventory links.",
    },
    {
        key: "featured-inventory",
        label: "Featured Inventory",
        description: "Inventory-backed section that renders selected vehicles or saved search results.",
    },
    {
        key: "finance-cta",
        label: "Finance CTA",
        description: "Lead-generation section optimized for credit application, pre-qualification, or trade valuation.",
    },
    {
        key: "dealer-trust",
        label: "Dealer Trust",
        description: "Structured trust block for reviews, warranty claims, awards, and service credentials.",
    },
];
export const websitesModule = defineModule({
    key: "websites",
    label: "Websites",
    owner: "packages/modules/websites",
    dependsOn: ["tenancy", "inventory"],
    register: ({ registerService, resolveModule }) => {
        const inventory = resolveModule("inventory");
        registerService("websites.sections", websiteSectionLibrary);
        return {
            sections: websiteSectionLibrary,
            inventoryBacked: inventory.capabilities.length > 0,
        };
    },
});
