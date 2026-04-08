export const domainModules = [
    {
        name: "Tenancy",
        description: "Resolves dealer, rooftop, hostnames, feature flags, and permission scopes.",
        owns: ["tenant resolution", "organization context", "policy scopes"],
    },
    {
        name: "Inventory",
        description: "Owns vehicles, pricing, merchandising, media references, and feed synchronization.",
        owns: ["vehicles", "pricing history", "photo assignments"],
    },
    {
        name: "CRM",
        description: "Owns leads, opportunities, activities, appointment flows, and sales pipeline state.",
        owns: ["lead lifecycle", "pipeline stages", "sales activities"],
    },
    {
        name: "Websites",
        description: "Owns section schemas, themes, publishing state, and dealer public presentation.",
        owns: ["page schema", "theme tokens", "publish snapshots"],
    },
    {
        name: "Shared UI",
        description: "Owns reusable primitives so back-office and dealer experiences stay coherent.",
        owns: ["surface components", "design tokens", "interaction patterns"],
    },
    {
        name: "Contracts",
        description: "Owns events, DTOs, and service contracts so extraction does not break consumers.",
        owns: ["message schemas", "event names", "integration payloads"],
    },
];
export const serviceExtractionPlan = [
    {
        name: "Inventory Ingestion Service",
        trigger: "high-volume imports",
        boundary: "Extract once marketplace feeds, VIN decoding, and nightly imports create queue pressure on the web app.",
    },
    {
        name: "Website Publish Service",
        trigger: "heavy publish jobs",
        boundary: "Extract when site generation, search indexing, and cache invalidation need separate scaling and rollout.",
    },
    {
        name: "Communications Service",
        trigger: "external rate limits",
        boundary: "Extract when email, SMS, and webhook delivery need isolated retries, observability, and vendor credentials.",
    },
];
