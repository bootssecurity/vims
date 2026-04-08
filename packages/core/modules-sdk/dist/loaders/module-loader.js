import { loadVimsInternalModule } from "./utils/index.js";
/**
 * Orchestrates loading of all resolved modules into the shared container.
 *
 * - Skips disabled resolutions (resolutionPath === false)
 * - Dispatches each resolution to `loadVimsInternalModule`
 * - Collects errors and throws after all modules have been attempted
 */
export async function vimsModuleLoader({ container, moduleResolutions, logger, }) {
    const resolutions = Object.values(moduleResolutions !== null && moduleResolutions !== void 0 ? moduleResolutions : {});
    const errors = [];
    await Promise.all(resolutions.map(async (resolution) => {
        if (resolution.resolutionPath === false) {
            // Module is disabled — register undefined so container consumers can
            // detect it gracefully with allowUnregistered.
            container.register(resolution.definition.key, undefined);
            return;
        }
        const result = await loadVimsInternalModule({ container, resolution, logger });
        if (result === null || result === void 0 ? void 0 : result.error) {
            errors.push({
                label: resolution.definition.label,
                error: result.error,
            });
        }
    }));
    if (errors.length) {
        const messages = errors
            .map(({ label, error }) => `  • ${label}: ${error.message}`)
            .join("\n");
        throw new Error(`One or more modules failed to load:\n${messages}`);
    }
}
