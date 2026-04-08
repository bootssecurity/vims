import { defineModule } from "@vims/framework";
export const defaultPipelineStages = [
    "New Lead",
    "Contacted",
    "Appointment Set",
    "Negotiation",
    "Won / Delivered",
];
export const crmModule = defineModule({
    key: "crm",
    label: "CRM",
    owner: "packages/modules/crm",
    dependsOn: ["tenancy", "inventory"],
    register: ({ registerService, resolveModule }) => {
        const inventory = resolveModule("inventory");
        registerService("crm.pipelineStages", defaultPipelineStages);
        return {
            pipelineStages: defaultPipelineStages,
            inventoryCapabilitiesCount: inventory.capabilities.length,
        };
    },
});
