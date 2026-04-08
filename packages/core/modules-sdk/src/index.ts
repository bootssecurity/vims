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
export const VimsLinkRegistry: Map<string, VimsLinkRegistration> = new Map();

export function createModuleLink(definition: ModuleLinkDefinition): VimsLinkRegistration {
  const { source, target, sourceKey = "id", targetKey = "id" } = definition;
  const linkId = [source, sourceKey, target, targetKey].join("<>");
  const registration: VimsLinkRegistration = { ...definition, sourceKey, targetKey, linkId };
  VimsLinkRegistry.set(linkId, registration);
  return registration;
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
