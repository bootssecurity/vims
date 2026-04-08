import type { AnyVimsPluginDefinition, VimsModuleDefinition, VimsProviderDefinition } from "@vims/framework";
export type VimsModuleRegistration = {
    key: string;
    module?: VimsModuleDefinition;
    provider?: VimsProviderDefinition;
    plugin?: AnyVimsPluginDefinition;
};
export declare function registerVimsModule(registration: VimsModuleRegistration): VimsModuleRegistration;
