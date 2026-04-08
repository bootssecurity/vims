import {
  defineModule,
  definePlugin,
  type VimsModuleDefinition,
  type VimsPluginDefinition,
  type VimsProviderDefinition,
} from "@vims/framework";

export type ModuleLinkDefinition = {
  source: string;
  target: string;
  relationship: "one-to-one" | "one-to-many" | "many-to-many";
};

export function createModuleLink(definition: ModuleLinkDefinition) {
  return definition;
}

export function createModuleDefinition<T>(
  definition: VimsModuleDefinition<T>,
): VimsModuleDefinition<T> {
  return defineModule(definition);
}

export function createProviderBridge<T>(
  provider: VimsProviderDefinition<T>,
): VimsProviderDefinition<T> {
  return provider;
}

export function createPluginDefinition<
  TRuntime = unknown,
  TExtra extends Record<string, unknown> = Record<string, never>,
>(
  definition: VimsPluginDefinition<TRuntime, TExtra>,
): VimsPluginDefinition<TRuntime, TExtra> {
  return definePlugin(definition);
}

export * from "./loaders/index";
export * from "./vims-module";
export * from "./definitions";
