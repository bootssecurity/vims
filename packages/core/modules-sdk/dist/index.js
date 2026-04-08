import { defineModule, definePlugin, } from "@vims/framework";
/** Global in-memory link registry — accumulated as link files are loaded */
export const VimsLinkRegistry = new Map();
export function createModuleLink(definition) {
    const { source, target, sourceKey = "id", targetKey = "id" } = definition;
    const linkId = [source, sourceKey, target, targetKey].join("<>");
    const registration = Object.assign(Object.assign({}, definition), { sourceKey, targetKey, linkId });
    VimsLinkRegistry.set(linkId, registration);
    return registration;
}
export function createModuleDefinition(definition) {
    return defineModule(definition);
}
export function createProviderBridge(provider) {
    return provider;
}
export function createPluginDefinition(definition) {
    return definePlugin(definition);
}
export * from "./loaders/index.js";
export * from "./vims-module.js";
export * from "./definitions.js";
export * from "./link.js";
export * from "./remote-query.js";
export { LinkRepository } from "./db/link-repository.js";
export { linkPivots } from "./db/link-pivot-schema.js";
