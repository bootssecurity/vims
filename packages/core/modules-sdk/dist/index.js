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
export * from "./loaders/index";
export * from "./vims-module";
export * from "./definitions";
export * from "./link";
export * from "./remote-query";
export { LinkRepository } from "./db/link-repository";
export { linkPivots } from "./db/link-pivot-schema";
