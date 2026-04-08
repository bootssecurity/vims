import { defineModule } from "@vims/framework";
export const inventoryCapabilities = [
    "VIN decoding, trim normalization, and condition-aware merchandising",
    "Multi-rooftop stock control with price rules and publication flags",
    "Photo, video, and document references stored independently from vehicle records",
    "Marketplace feed contracts that can later move into isolated ingestion services",
];
export const inventoryModule = defineModule({
    key: "inventory",
    label: "Inventory",
    owner: "packages/modules/inventory",
    dependsOn: ["tenancy"],
    register: ({ registerService, resolveProvider }) => {
        const database = resolveProvider("database-postgres");
        registerService("inventory.capabilities", inventoryCapabilities);
        return {
            capabilities: inventoryCapabilities,
            databaseProvider: database.key,
        };
    },
});
