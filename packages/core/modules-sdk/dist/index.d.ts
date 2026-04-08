import { type VimsModuleDefinition, type VimsPluginDefinition, type VimsProviderDefinition } from "@vims/framework";
export type ModuleLinkDefinition = {
    source: string;
    target: string;
    relationship: "one-to-one" | "one-to-many" | "many-to-many";
    /** FK field name on the source side */
    sourceKey?: string;
    /** FK field name on the target side */
    targetKey?: string;
    /** If true, deleting a source record will cascade-delete linked target records */
    deleteCascade?: boolean;
    /** Extra metadata provided by the link author */
    metadata?: Record<string, unknown>;
};
export type VimsLinkRegistration = ModuleLinkDefinition & {
    /** Stable composite key derived from source + target + keys */
    linkId: string;
};
/** Global in-memory link registry — accumulated as link files are loaded */
export declare const VimsLinkRegistry: Map<string, VimsLinkRegistration>;
export declare function createModuleLink(definition: ModuleLinkDefinition): VimsLinkRegistration;
export declare function createModuleDefinition<T>(definition: VimsModuleDefinition<T>): VimsModuleDefinition<T>;
export declare function createProviderBridge<T>(provider: VimsProviderDefinition<T>): VimsProviderDefinition<T>;
export declare function createPluginDefinition<TRuntime = unknown, TExtra extends Record<string, unknown> = Record<string, never>>(definition: VimsPluginDefinition<TRuntime, TExtra>): VimsPluginDefinition<TRuntime, TExtra>;
export * from "./loaders/index.js";
export * from "./vims-module.js";
export * from "./definitions.js";
export * from "./link.js";
export * from "./remote-query.js";
export { LinkRepository } from "./db/link-repository.js";
export type { LinkEdge, LinkFilter } from "./db/link-repository.js";
export { linkPivots } from "./db/link-pivot-schema.js";
export type { InsertLinkPivot, SelectLinkPivot } from "./db/link-pivot-schema.js";
export type { DiscoveredSchema } from "./loaders/utils/load-internal.js";
