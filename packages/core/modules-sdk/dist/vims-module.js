import { registerVimsModule } from "./loaders";
import { vimsModuleLoader } from "./loaders/module-loader";
// ── Simple deterministic hash ─────────────────────────────────────────────────
function simpleHash(obj) {
    const str = JSON.stringify(obj);
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
}
// ── VimsModule singleton ───────────────────────────────────────────────────────
/**
 * Singleton bootstrapper for VIMS modules.
 *
 * Responsibilities:
 *  - Resolve module declarations → VimsModuleResolution via registerVimsModule()
 *  - Deduplicate concurrent bootstrap attempts for the same module (via hash)
 *  - Store loaded service instances indexed by hash key
 *  - Expose lifecycle hook dispatch (onApplicationStart / Shutdown)
 *  - Track module resolutions so callers can query what's loaded
 */
export class VimsModule {
    // ── Lifecycle hooks ─────────────────────────────────────────────────────────
    /**
     * Called when the application is fully started.
     * Invokes `onApplicationStart` on all loaded module services that expose it.
     */
    static onApplicationStart(onStartCb) {
        for (const instances of VimsModule.instances_.values()) {
            for (const instance of Object.values(instances)) {
                const hooks = instance === null || instance === void 0 ? void 0 : instance.__hooks;
                if (hooks === null || hooks === void 0 ? void 0 : hooks.onApplicationStart) {
                    void Promise.resolve(hooks.onApplicationStart.call(instance)).then(() => onStartCb === null || onStartCb === void 0 ? void 0 : onStartCb());
                }
            }
        }
    }
    /**
     * Graceful shutdown — waits for all `onApplicationShutdown` hooks.
     */
    static async onApplicationShutdown() {
        const callbacks = [...VimsModule.instances_.values()].flatMap((instances) => Object.values(instances).flatMap((instance) => {
            var _a;
            const hook = (_a = instance === null || instance === void 0 ? void 0 : instance.__hooks) === null || _a === void 0 ? void 0 : _a.onApplicationShutdown;
            return hook ? [() => Promise.resolve(hook.call(instance))] : [];
        }));
        await Promise.all(callbacks.map((fn) => fn().catch(() => void 0)));
    }
    /**
     * Prepare-shutdown phase — gives modules a chance to drain in-flight work.
     */
    static async onApplicationPrepareShutdown() {
        const callbacks = [...VimsModule.instances_.values()].flatMap((instances) => Object.values(instances).flatMap((instance) => {
            var _a;
            const hook = (_a = instance === null || instance === void 0 ? void 0 : instance.__hooks) === null || _a === void 0 ? void 0 : _a.onApplicationPrepareShutdown;
            return hook ? [() => Promise.resolve(hook.call(instance))] : [];
        }));
        await Promise.all(callbacks.map((fn) => fn().catch(() => void 0)));
    }
    // ── Query ───────────────────────────────────────────────────────────────────
    static isInstalled(moduleKey) {
        return VimsModule.modules_.has(moduleKey);
    }
    static getModuleResolution(key) {
        return VimsModule.resolutions_.get(key);
    }
    static getAllModuleResolutions() {
        return [...VimsModule.resolutions_.values()];
    }
    static getLoadedModules() {
        return [...VimsModule.instances_.values()];
    }
    static clearInstances() {
        VimsModule.instances_.clear();
        VimsModule.modules_.clear();
        VimsModule.loading_.clear();
        VimsModule.resolutions_.clear();
    }
    // ── Bootstrap ───────────────────────────────────────────────────────────────
    /**
     * Bootstrap a **single** module. Returns the loaded service map.
     */
    static async bootstrap(options) {
        const [service] = await VimsModule.bootstrap_([options], {
            cwd: options.cwd,
        });
        return service;
    }
    /**
     * Bootstrap **multiple** modules in parallel.
     */
    static async bootstrapAll(modulesOptions, opts = {}) {
        return VimsModule.bootstrap_(modulesOptions, opts);
    }
    // ── Internal ────────────────────────────────────────────────────────────────
    static async bootstrap_(modulesOptions, { cwd = process.cwd() }) {
        const services = [];
        // Resolve declarations → VimsModuleResolution first (sync)
        const queue = [];
        for (const opts of modulesOptions) {
            const { moduleKey, moduleDeclaration, definition, sharedContainer, injectedDependencies } = opts;
            // Build a minimal in-memory container if none provided
            const container = sharedContainer !== null && sharedContainer !== void 0 ? sharedContainer : VimsModule.makeContainer(injectedDependencies);
            const moduleResolutions = registerVimsModule({
                moduleKey,
                moduleDeclaration,
                definition,
                cwd,
            });
            const resolution = moduleResolutions[moduleKey];
            if (!resolution)
                continue;
            const hashKey = simpleHash({ moduleKey, resolve: resolution.resolutionPath, options: resolution.options });
            // Already loaded → reuse
            if (VimsModule.instances_.has(hashKey)) {
                services.push(VimsModule.instances_.get(hashKey));
                continue;
            }
            // In-flight → wait for it
            if (VimsModule.loading_.has(hashKey)) {
                services.push(await VimsModule.loading_.get(hashKey));
                continue;
            }
            let finishLoading;
            let errorLoading;
            const loadingPromise = new Promise((resolve, reject) => {
                finishLoading = resolve;
                errorLoading = reject;
            });
            VimsModule.loading_.set(hashKey, loadingPromise);
            queue.push({ hashKey, moduleKey, resolution, sharedContainer: container, finishLoading, errorLoading });
        }
        // Load all queued modules in parallel via the module-loader
        await Promise.all(queue.map(async ({ hashKey, moduleKey, resolution, sharedContainer, finishLoading, errorLoading }) => {
            try {
                await vimsModuleLoader({
                    container: sharedContainer,
                    moduleResolutions: { [moduleKey]: resolution },
                });
                // Pull the loaded service from the container
                const service = sharedContainer.resolve(`module:${moduleKey}`, { allowUnregistered: true });
                const serviceMap = { [moduleKey]: service };
                VimsModule.instances_.set(hashKey, serviceMap);
                VimsModule.resolutions_.set(moduleKey, resolution);
                VimsModule.registerModuleAlias_(moduleKey, hashKey);
                finishLoading(serviceMap);
                VimsModule.loading_.delete(hashKey);
                services.push(serviceMap);
            }
            catch (err) {
                errorLoading(err);
                VimsModule.loading_.delete(hashKey);
                throw err;
            }
        }));
        return services;
    }
    static registerModuleAlias_(moduleKey, hash) {
        if (!VimsModule.modules_.has(moduleKey)) {
            VimsModule.modules_.set(moduleKey, []);
        }
        VimsModule.modules_.get(moduleKey).push({ key: moduleKey, hash });
    }
    /**
     * Creates a minimal in-memory container for standalone module bootstrapping
     * (no shared container needed for simple single-module tests).
     */
    static makeContainer(injected) {
        const registry = new Map(Object.entries(injected !== null && injected !== void 0 ? injected : {}));
        return {
            register(key, value) {
                registry.set(key, value);
            },
            resolve(key, opts) {
                if (!registry.has(key)) {
                    if (opts === null || opts === void 0 ? void 0 : opts.allowUnregistered)
                        return undefined;
                    throw new Error(`VimsModule container: "${key}" is not registered.`);
                }
                return registry.get(key);
            },
        };
    }
}
// hash → service instance map
VimsModule.instances_ = new Map();
// moduleKey → [ModuleAlias] for lookup
VimsModule.modules_ = new Map();
// hash → in-flight bootstrap promise (dedup concurrent loads)
VimsModule.loading_ = new Map();
// moduleKey → resolution metadata
VimsModule.resolutions_ = new Map();
