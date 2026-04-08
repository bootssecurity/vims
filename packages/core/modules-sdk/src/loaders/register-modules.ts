import type {
  AnyVimsPluginDefinition,
  VimsModuleDefinition,
  VimsProviderDefinition,
} from "@vims/framework";

export type VimsModuleRegistration = {
  key: string;
  module?: VimsModuleDefinition;
  provider?: VimsProviderDefinition;
  plugin?: AnyVimsPluginDefinition;
};

export function registerVimsModule(
  registration: VimsModuleRegistration,
): VimsModuleRegistration {
  return registration;
}
