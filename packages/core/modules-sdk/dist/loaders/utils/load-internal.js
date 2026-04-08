/**
 * Wires a single resolved module into the shared container.
 * Mirrors Medusa's `loadInternalModule()` in @medusajs/modules-sdk.
 *
 * Design:
 *  - Creates a scoped `localContainer` so the module can resolve its peer
 *    dependencies (declared in `resolution.dependencies`) without polluting the
 *    shared container registry directly.
 *  - Calls the module definition's `register()` function to obtain the service
 *    instance (or object), then registers that under the module's key.
 *  - Intentionally does NOT do file-system auto-discovery (models/services/repos)
 *    — that will be added in a future phase when ORM support arrives.
 */
export async function loadVimsInternalModule({ container, resolution, logger, }) {
    var _a;
    const { definition, dependencies, options, moduleDeclaration } = resolution;
    const keyName = definition.key;
    // Build a scoped localContainer that proxies peer dependency resolves back to
    // the shared container — the same pattern Medusa uses with awilix.
    const localRegistry = {};
    const localContainer = {
        config: (_a = container.resolve("config", { allowUnregistered: true })) !== null && _a !== void 0 ? _a : {},
        providers: new Map(),
        modules: new Map(),
        plugins: new Map(),
        services: {},
        registerService(k, v) {
            localRegistry[k] = v;
            container.register(`service:${k}`, v);
        },
        resolveProvider(k) {
            return container.resolve(`provider:${k}`, { allowUnregistered: true });
        },
        resolveModule(k) {
            return container.resolve(`module:${k}`, { allowUnregistered: true });
        },
        resolvePlugin(k) {
            return container.resolve(`plugin:${k}`, { allowUnregistered: true });
        },
    };
    // Validate declared dependencies are present in the container
    for (const dep of dependencies) {
        const resolved = container.resolve(dep, { allowUnregistered: true });
        if (resolved === undefined || resolved === null) {
            logger === null || logger === void 0 ? void 0 : logger.warn(`Module "${keyName}" declares a dependency on "${dep}" which is not yet loaded.`, { module: keyName, dependency: dep });
        }
    }
    try {
        // Invoke the module's register() function to obtain the service
        const service = await Promise.resolve(definition.register(localContainer));
        // Register the returned service value under the module's canonical key
        container.register(`module:${keyName}`, service !== null && service !== void 0 ? service : {});
        logger === null || logger === void 0 ? void 0 : logger.info(`module.loaded`, { module: keyName });
        return undefined; // success
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger === null || logger === void 0 ? void 0 : logger.error(`module.load.failed`, {
            module: keyName,
            error: error.message,
        });
        // Register undefined so downstream optional resolves don't throw
        container.register(`module:${keyName}`, undefined);
        return { error };
    }
}
