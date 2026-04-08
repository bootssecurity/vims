import { loadVimsConfig } from "@vims/config";
import { createContainer } from "@vims/container";
import { createLogger } from "@vims/logger";
// ── Module key constants  ──────────────
export const VimsModules = {
    EVENT_BUS: "eventBus",
    CACHE: "cache",
    WORKFLOW_ENGINE: "workflowEngine",
    CRM: "crm",
    INVENTORY: "inventory",
    TENANCY: "tenancy",
    AUDIT: "audit",
    WEBSITES: "websites",
    RBAC: "rbac",
    AUTH: "auth",
    LOCKING: "locking",
};
export function defineModule(definition) {
    return definition;
}
export function defineProvider(definition) {
    return definition;
}
export function definePlugin(definition) {
    return definition;
}
export function createFrameworkManifest(options) {
    return options;
}
export function createFrameworkCatalog(options) {
    return {
        modules: Object.fromEntries(options.modules.map((moduleDefinition) => [moduleDefinition.key, moduleDefinition])),
        providers: Object.fromEntries(options.providers.map((providerDefinition) => [
            providerDefinition.key,
            providerDefinition,
        ])),
        plugins: Object.fromEntries(options.plugins.map((pluginDefinition) => [
            pluginDefinition.key,
            pluginDefinition,
        ])),
    };
}
export function discoverManifest(catalog, config = {}) {
    var _a, _b, _c;
    const resolvedConfig = defineAppConfig(config);
    const modules = ((_a = resolvedConfig.enabledModules) === null || _a === void 0 ? void 0 : _a.length)
        ? resolvedConfig.enabledModules.map((moduleKey) => {
            const moduleDefinition = catalog.modules[moduleKey];
            if (!moduleDefinition) {
                throw new Error(`Unknown configured module "${moduleKey}"`);
            }
            return moduleDefinition;
        })
        : Object.values(catalog.modules);
    const providers = ((_b = resolvedConfig.enabledProviders) === null || _b === void 0 ? void 0 : _b.length)
        ? resolvedConfig.enabledProviders.map((providerKey) => {
            const providerDefinition = catalog.providers[providerKey];
            if (!providerDefinition) {
                throw new Error(`Unknown configured provider "${providerKey}"`);
            }
            return providerDefinition;
        })
        : Object.values(catalog.providers);
    const plugins = ((_c = resolvedConfig.enabledPlugins) === null || _c === void 0 ? void 0 : _c.length)
        ? resolvedConfig.enabledPlugins.map((pluginKey) => {
            const pluginDefinition = catalog.plugins[pluginKey];
            if (!pluginDefinition) {
                throw new Error(`Unknown configured plugin "${pluginKey}"`);
            }
            return pluginDefinition;
        })
        : Object.values(catalog.plugins);
    return createFrameworkManifest({
        modules,
        providers,
        plugins,
    });
}
export function defineAppConfig(config = {}) {
    return loadVimsConfig(config);
}
export function createModuleRegistry() {
    const modules = new Map();
    return {
        register(moduleDefinition) {
            modules.set(moduleDefinition.key, moduleDefinition);
        },
        list() {
            return [...modules.values()];
        },
    };
}
export function createProviderRegistry() {
    const providers = new Map();
    return {
        register(providerDefinition) {
            providers.set(providerDefinition.key, providerDefinition);
        },
        list() {
            return [...providers.values()];
        },
    };
}
export function createPluginRegistry() {
    const plugins = new Map();
    return {
        register(pluginDefinition) {
            plugins.set(pluginDefinition.key, pluginDefinition);
        },
        list() {
            return [...plugins.values()];
        },
    };
}
function filterEnabled(entries, enabledKeys) {
    if (!(enabledKeys === null || enabledKeys === void 0 ? void 0 : enabledKeys.length)) {
        return entries;
    }
    const enabledSet = new Set(enabledKeys);
    return entries.filter((entry) => enabledSet.has(entry.key));
}
function resolveDependencyOrder(entries) {
    const moduleMap = new Map(entries.map((module) => [module.key, module]));
    const visiting = new Set();
    const visited = new Set();
    const ordered = [];
    function visit(moduleKey) {
        var _a;
        if (visited.has(moduleKey)) {
            return;
        }
        if (visiting.has(moduleKey)) {
            throw new Error(`Circular module dependency detected for "${moduleKey}"`);
        }
        const moduleDefinition = moduleMap.get(moduleKey);
        if (!moduleDefinition) {
            throw new Error(`Unknown module dependency "${moduleKey}"`);
        }
        visiting.add(moduleKey);
        for (const dependency of (_a = moduleDefinition.dependsOn) !== null && _a !== void 0 ? _a : []) {
            visit(dependency);
        }
        visiting.delete(moduleKey);
        visited.add(moduleKey);
        ordered.push(moduleDefinition);
    }
    for (const moduleDefinition of entries) {
        visit(moduleDefinition.key);
    }
    return ordered;
}
export function bootFramework(manifest, config = {}) {
    var _a, _b;
    const resolvedConfig = defineAppConfig(config);
    const enabledProviders = filterEnabled(manifest.providers, resolvedConfig.enabledProviders);
    const enabledModules = filterEnabled(manifest.modules, resolvedConfig.enabledModules);
    const enabledPlugins = filterEnabled(manifest.plugins, resolvedConfig.enabledPlugins);
    const providerRuntime = new Map();
    const moduleRuntime = new Map();
    const pluginRuntime = new Map();
    const services = {};
    const container = createContainer();
    const logger = createLogger();
    const resolveProvider = (key) => {
        if (!providerRuntime.has(key)) {
            throw new Error(`Provider "${key}" is not registered`);
        }
        return providerRuntime.get(key);
    };
    const resolveModule = (key) => {
        if (!moduleRuntime.has(key)) {
            throw new Error(`Module "${key}" is not registered`);
        }
        return moduleRuntime.get(key);
    };
    const resolvePlugin = (key) => {
        if (!pluginRuntime.has(key)) {
            throw new Error(`Plugin "${key}" is not registered`);
        }
        return pluginRuntime.get(key);
    };
    const registerService = (key, value) => {
        services[key] = value;
        container.register(`service:${key}`, value);
    };
    container.register("logger", logger);
    container.register("config", resolvedConfig);
    logger.info("framework.boot.start", {
        app: resolvedConfig.name,
    });
    for (const providerDefinition of enabledProviders) {
        const provider = providerDefinition.register({
            config: resolvedConfig,
        });
        providerRuntime.set(providerDefinition.key, provider);
        container.register(`provider:${providerDefinition.key}`, provider);
        logger.info("framework.provider.registered", {
            provider: providerDefinition.key,
        });
    }
    const orderedModules = resolveDependencyOrder(enabledModules);
    const orderedPlugins = resolveDependencyOrder(enabledPlugins);
    const runtimeContext = {
        config: resolvedConfig,
        providers: providerRuntime,
        modules: moduleRuntime,
        plugins: pluginRuntime,
        services,
        registerService,
        resolveProvider,
        resolveModule,
        resolvePlugin,
    };
    for (const moduleDefinition of orderedModules) {
        const module = moduleDefinition.register(runtimeContext);
        moduleRuntime.set(moduleDefinition.key, module);
        container.register(`module:${moduleDefinition.key}`, module);
        logger.info("framework.module.registered", {
            module: moduleDefinition.key,
        });
    }
    const pluginContext = Object.assign({}, runtimeContext);
    for (const pluginDefinition of orderedPlugins) {
        const plugin = (_b = (_a = pluginDefinition.register) === null || _a === void 0 ? void 0 : _a.call(pluginDefinition, pluginContext)) !== null && _b !== void 0 ? _b : {
            key: pluginDefinition.key,
            label: pluginDefinition.label,
        };
        pluginRuntime.set(pluginDefinition.key, plugin);
        container.register(`plugin:${pluginDefinition.key}`, plugin);
        logger.info("framework.plugin.registered", {
            plugin: pluginDefinition.key,
        });
    }
    const bootHookContext = {
        config: resolvedConfig,
        providers: providerRuntime,
        modules: moduleRuntime,
        plugins: pluginRuntime,
        services,
        container,
        logger,
        registerService,
        resolveProvider,
        resolveModule,
        resolvePlugin,
    };
    const shutdownCallbacks = [];
    for (const providerDefinition of enabledProviders) {
        if (providerDefinition.boot) {
            void providerDefinition.boot(bootHookContext);
        }
        if (providerDefinition.shutdown) {
            shutdownCallbacks.unshift(() => { var _a; return Promise.resolve((_a = providerDefinition.shutdown) === null || _a === void 0 ? void 0 : _a.call(providerDefinition, bootHookContext)); });
        }
    }
    for (const moduleDefinition of orderedModules) {
        if (moduleDefinition.boot) {
            void moduleDefinition.boot(bootHookContext);
        }
        if (moduleDefinition.shutdown) {
            shutdownCallbacks.unshift(() => { var _a; return Promise.resolve((_a = moduleDefinition.shutdown) === null || _a === void 0 ? void 0 : _a.call(moduleDefinition, bootHookContext)); });
        }
    }
    for (const pluginDefinition of orderedPlugins) {
        if (pluginDefinition.boot) {
            void pluginDefinition.boot(bootHookContext);
        }
        if (pluginDefinition.shutdown) {
            shutdownCallbacks.unshift(() => { var _a; return Promise.resolve((_a = pluginDefinition.shutdown) === null || _a === void 0 ? void 0 : _a.call(pluginDefinition, bootHookContext)); });
        }
    }
    logger.info("framework.boot.complete", {
        modules: orderedModules.length,
        providers: enabledProviders.length,
        plugins: orderedPlugins.length,
    });
    return {
        config: resolvedConfig,
        providers: providerRuntime,
        modules: moduleRuntime,
        plugins: pluginRuntime,
        services,
        container,
        moduleOrder: orderedModules.map((moduleDefinition) => moduleDefinition.key),
        providerOrder: enabledProviders.map((providerDefinition) => providerDefinition.key),
        pluginOrder: orderedPlugins.map((pluginDefinition) => pluginDefinition.key),
        async shutdown() {
            for (const callback of shutdownCallbacks) {
                await callback();
            }
            logger.info("framework.shutdown.complete", {
                app: resolvedConfig.name,
            });
        },
    };
}
export function createVimsApp(manifest, config) {
    return bootFramework(manifest, config);
}
async function runLifecycleStage(definitions, stage, context) {
    for (const definition of definitions) {
        const handler = definition[stage];
        if (handler) {
            await handler(context);
        }
    }
}
export async function bootFrameworkAsync(manifest, config = {}) {
    const runtime = bootFramework(manifest, config);
    const logger = runtime.container.resolve("logger");
    const context = {
        config: runtime.config,
        providers: runtime.providers,
        modules: runtime.modules,
        plugins: runtime.plugins,
        services: runtime.services,
        container: runtime.container,
        logger,
        registerService(key, value) {
            runtime.services[key] = value;
            runtime.container.register(`service:${key}`, value);
        },
        resolveProvider(key) {
            return runtime.providers.get(key);
        },
        resolveModule(key) {
            return runtime.modules.get(key);
        },
        resolvePlugin(key) {
            return runtime.plugins.get(key);
        },
    };
    const providers = manifest.providers.filter((definition) => runtime.providerOrder.includes(definition.key));
    const modules = manifest.modules.filter((definition) => runtime.moduleOrder.includes(definition.key));
    const plugins = manifest.plugins.filter((definition) => runtime.pluginOrder.includes(definition.key));
    await runLifecycleStage(providers, "prepare", context);
    await runLifecycleStage(modules, "prepare", context);
    await runLifecycleStage(plugins, "prepare", context);
    return Object.assign(Object.assign({}, runtime), { async start() {
            await runLifecycleStage(providers, "start", context);
            await runLifecycleStage(modules, "start", context);
            await runLifecycleStage(plugins, "start", context);
            logger.info("framework.start.complete", {
                app: runtime.config.name,
            });
        },
        async shutdown() {
            await runLifecycleStage([...plugins].reverse(), "prepareShutdown", context);
            await runLifecycleStage([...modules].reverse(), "prepareShutdown", context);
            await runLifecycleStage([...providers].reverse(), "prepareShutdown", context);
            await runtime.shutdown();
        } });
}
export async function createVimsAppAsync(manifest, config) {
    return bootFrameworkAsync(manifest, config);
}
