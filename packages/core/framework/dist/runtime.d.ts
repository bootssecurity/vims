import { type VimsRuntimeConfig } from "@vims/config";
import { createContainer } from "@vims/container";
import { createLogger } from "@vims/logger";
export type VimsProviderCategory = "cache" | "database" | "events" | "search";
export type VimsAppConfig = VimsRuntimeConfig;
export type VimsServiceMap = Record<string, unknown>;
export type VimsProviderRuntimeContext = {
    config: VimsAppConfig;
};
export type VimsBootHookContext = {
    config: VimsAppConfig;
    providers: Map<string, unknown>;
    modules: Map<string, unknown>;
    plugins: Map<string, unknown>;
    services: VimsServiceMap;
    container: ReturnType<typeof createContainer>;
    logger: ReturnType<typeof createLogger>;
    registerService: (key: string, value: unknown) => void;
    resolveProvider: <T>(key: string) => T;
    resolveModule: <T>(key: string) => T;
    resolvePlugin: <T>(key: string) => T;
};
export type VimsModuleRuntimeContext = {
    config: VimsAppConfig;
    providers: Map<string, unknown>;
    modules: Map<string, unknown>;
    plugins: Map<string, unknown>;
    services: VimsServiceMap;
    registerService: (key: string, value: unknown) => void;
    resolveProvider: <T>(key: string) => T;
    resolveModule: <T>(key: string) => T;
    resolvePlugin: <T>(key: string) => T;
};
export type VimsPluginRuntimeContext = VimsModuleRuntimeContext;
export type VimsLifecycleDefinition = {
    boot?: (context: VimsBootHookContext) => void | Promise<void>;
    prepare?: (context: VimsBootHookContext) => void | Promise<void>;
    start?: (context: VimsBootHookContext) => void | Promise<void>;
    prepareShutdown?: (context: VimsBootHookContext) => void | Promise<void>;
    shutdown?: (context: VimsBootHookContext) => void | Promise<void>;
};
export type VimsProviderDefinition<T = unknown> = {
    key: string;
    label: string;
    category: VimsProviderCategory;
    register: (context: VimsProviderRuntimeContext) => T;
} & VimsLifecycleDefinition;
export type VimsModuleDefinition<T = unknown> = {
    key: string;
    label: string;
    owner: string;
    dependsOn?: string[];
    register: (context: VimsModuleRuntimeContext) => T;
} & VimsLifecycleDefinition;
export type VimsPluginDefinition<TRuntime = unknown, TExtra extends Record<string, unknown> = Record<string, never>> = {
    key: string;
    label: string;
    owner: string;
    dependsOn?: string[];
    register?: (context: VimsPluginRuntimeContext) => TRuntime;
} & VimsLifecycleDefinition & TExtra;
export type AnyVimsPluginDefinition = VimsPluginDefinition<unknown, Record<string, unknown>>;
export type VimsFrameworkManifest = {
    modules: VimsModuleDefinition[];
    providers: VimsProviderDefinition[];
    plugins: AnyVimsPluginDefinition[];
};
export type VimsFrameworkCatalog = {
    modules: Record<string, VimsModuleDefinition>;
    providers: Record<string, VimsProviderDefinition>;
    plugins: Record<string, AnyVimsPluginDefinition>;
};
export type VimsFrameworkRuntime = {
    config: VimsAppConfig;
    providers: Map<string, unknown>;
    modules: Map<string, unknown>;
    plugins: Map<string, unknown>;
    services: VimsServiceMap;
    container: ReturnType<typeof createContainer>;
    moduleOrder: string[];
    providerOrder: string[];
    pluginOrder: string[];
    shutdown: () => Promise<void>;
};
export type VimsAsyncFrameworkRuntime = VimsFrameworkRuntime & {
    start: () => Promise<void>;
};
export declare function defineModule<T>(definition: VimsModuleDefinition<T>): VimsModuleDefinition<T>;
export declare function defineProvider<T>(definition: VimsProviderDefinition<T>): VimsProviderDefinition<T>;
export declare function definePlugin<TRuntime = unknown, TExtra extends Record<string, unknown> = Record<string, never>>(definition: VimsPluginDefinition<TRuntime, TExtra>): VimsPluginDefinition<TRuntime, TExtra>;
export declare function createFrameworkManifest(options: VimsFrameworkManifest): VimsFrameworkManifest;
export declare function createFrameworkCatalog(options: VimsFrameworkManifest): VimsFrameworkCatalog;
export declare function discoverManifest(catalog: VimsFrameworkCatalog, config?: Partial<VimsAppConfig>): VimsFrameworkManifest;
export declare function defineAppConfig(config?: Partial<VimsAppConfig>): VimsAppConfig;
export declare function createModuleRegistry(): {
    register(moduleDefinition: VimsModuleDefinition): void;
    list(): VimsModuleDefinition<unknown>[];
};
export declare function createProviderRegistry(): {
    register(providerDefinition: VimsProviderDefinition): void;
    list(): VimsProviderDefinition<unknown>[];
};
export declare function createPluginRegistry(): {
    register(pluginDefinition: AnyVimsPluginDefinition): void;
    list(): AnyVimsPluginDefinition[];
};
export declare function bootFramework(manifest: VimsFrameworkManifest, config?: Partial<VimsAppConfig>): VimsFrameworkRuntime;
export declare function createVimsApp(manifest: VimsFrameworkManifest, config?: Partial<VimsAppConfig>): VimsFrameworkRuntime;
export declare function bootFrameworkAsync(manifest: VimsFrameworkManifest, config?: Partial<VimsAppConfig>): Promise<VimsAsyncFrameworkRuntime>;
export declare function createVimsAppAsync(manifest: VimsFrameworkManifest, config?: Partial<VimsAppConfig>): Promise<VimsAsyncFrameworkRuntime>;
