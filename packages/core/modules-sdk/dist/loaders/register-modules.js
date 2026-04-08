import { VimsModulesDefinition } from "../definitions.js";
/**
 * Resolves a module key + declaration into a `VimsModuleResolution`.
 *
 * Priority:
 *  1. If `moduleDeclaration === false` → disabled, returns { resolutionPath: false }
 *  2. Looks up built-in definition from `VimsModulesDefinition`
 *  3. Falls back to custom user-supplied `definition`
 *  4. Resolves the path via require.resolve() when a `resolve` string is given
 */
export function registerVimsModule({ moduleKey, moduleDeclaration, definition, cwd = process.cwd(), }) {
    var _a, _b, _c, _d, _e, _f;
    const resolutions = {};
    // Explicit false → disabled module
    if (moduleDeclaration === false) {
        const modDef = definition !== null && definition !== void 0 ? definition : VimsModulesDefinition[moduleKey];
        if (!modDef) {
            throw new Error(`Module "${moduleKey}" has no definition — cannot disable an unknown module.`);
        }
        resolutions[moduleKey] = {
            resolutionPath: false,
            definition: modDef,
            dependencies: (_a = modDef.dependsOn) !== null && _a !== void 0 ? _a : [],
            options: {},
            moduleDeclaration: { scope: "internal" },
        };
        return resolutions;
    }
    const builtinDef = VimsModulesDefinition[moduleKey];
    const modDef = definition !== null && definition !== void 0 ? definition : builtinDef;
    if (!modDef) {
        throw new Error(`Module "${moduleKey}" is not a known built-in module and no definition was supplied. ` +
            `Pass a "definition" option or use a key from VimsModules.`);
    }
    // Normalise the declaration
    const isString = typeof moduleDeclaration === "string";
    const isObject = moduleDeclaration !== null &&
        typeof moduleDeclaration === "object" &&
        !Array.isArray(moduleDeclaration);
    const declaration = isObject
        ? moduleDeclaration
        : {};
    const resolveStr = isString
        ? moduleDeclaration
        : declaration.resolve;
    const defaultDecl = (_b = modDef.defaultModuleDeclaration) !== null && _b !== void 0 ? _b : {
        scope: "internal",
    };
    const scope = (_d = (_c = declaration.scope) !== null && _c !== void 0 ? _c : defaultDecl.scope) !== null && _d !== void 0 ? _d : "internal";
    // Path resolution
    let resolutionPath;
    if (resolveStr) {
        try {
            resolutionPath = require.resolve(resolveStr, { paths: [cwd] });
        }
        catch (_g) {
            // Store original string so caller can surface a friendlier error
            resolutionPath = resolveStr;
        }
    }
    else {
        const defaultPkg = modDef.defaultPackage;
        if (defaultPkg) {
            try {
                resolutionPath = require.resolve(defaultPkg, { paths: [cwd] });
            }
            catch (_h) {
                // Not installed yet — store name for deferred resolution
                resolutionPath = defaultPkg;
            }
        }
        else {
            resolutionPath = false;
        }
    }
    resolutions[moduleKey] = {
        resolutionPath,
        definition: modDef,
        dependencies: (_e = modDef.dependsOn) !== null && _e !== void 0 ? _e : [],
        options: (_f = declaration.options) !== null && _f !== void 0 ? _f : {},
        moduleDeclaration: { scope },
    };
    return resolutions;
}
/**
 * Convenience: register multiple modules at once.
 * Returns a flat map of { moduleKey → VimsModuleResolution }.
 */
export function registerVimsModules(modules) {
    const all = {};
    for (const [moduleKey, declaration] of Object.entries(modules)) {
        if (declaration === undefined)
            continue;
        Object.assign(all, registerVimsModule({ moduleKey, moduleDeclaration: declaration }));
    }
    return all;
}
