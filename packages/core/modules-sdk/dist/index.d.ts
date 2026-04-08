import { type VimsModuleDefinition, type VimsPluginDefinition, type VimsProviderDefinition } from "@vims/framework";
export type ModuleLinkDefinition = {
    source: string;
    target: string;
    relationship: "one-to-one" | "one-to-many" | "many-to-many";
};
export declare function createModuleLink(definition: ModuleLinkDefinition): ModuleLinkDefinition;
export declare function createModuleDefinition<T>(definition: VimsModuleDefinition<T>): VimsModuleDefinition<T>;
export declare function createProviderBridge<T>(provider: VimsProviderDefinition<T>): VimsProviderDefinition<T>;
export declare function createPluginDefinition<TRuntime = unknown, TExtra extends Record<string, unknown> = Record<string, never>>(definition: VimsPluginDefinition<TRuntime, TExtra>): VimsPluginDefinition<TRuntime, TExtra>;
export * from "./loaders/index";
