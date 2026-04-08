import { defineModule, definePlugin, } from "@vims/framework";
export function createModuleLink(definition) {
    return definition;
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
