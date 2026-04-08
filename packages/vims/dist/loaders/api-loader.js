import { readdir, stat } from "fs/promises";
import { join, extname, relative } from "path";
// ── Constants ─────────────────────────────────────────────────────────────────
const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"];
const METHOD_EXPORT_NAMES = new Set(HTTP_METHODS.map((m) => m.toUpperCase()));
// ── ApiLoader ─────────────────────────────────────────────────────────────────
/**
 * ApiLoader
 *
 * File-system route scanner that discovers route modules and registers them
 * on a router.
 *
 * Convention — directory layout → URL path:
 * ```
 * src/api/
 *   admin/
 *     products/
 *       route.ts     →  GET|POST /admin/products
 *       [id]/
 *         route.ts   →  GET|PUT|DELETE /admin/products/:id
 *   store/
 *     products/
 *       route.ts     →  GET /store/products
 * ```
 *
 * Route file shape:
 * ```ts
 * // src/api/admin/products/route.ts
 * import type { VimsRouteHandler } from "@vims/vims";
 *
 * export const GET: VimsRouteHandler = async (req, res) => {
 *   res.json({ products: [] });
 * };
 *
 * export const POST: VimsRouteHandler = async (req, res) => {
 *   res.status(201).json({ product: {} });
 * };
 * ```
 *
 * Usage:
 * ```ts
 * const loader = new ApiLoader({ sourceDirs: [join(cwd, "src/api")], router });
 * await loader.load();
 * ```
 */
export class ApiLoader {
    constructor(opts) {
        this.routes = [];
        this.sourceDirs = opts.sourceDirs;
        this.router = opts.router;
        this.logger = opts.logger;
    }
    // ── Public ──────────────────────────────────────────────────────────────────
    async load() {
        var _a;
        for (const sourceDir of this.sourceDirs) {
            await this.scanDir(sourceDir, sourceDir);
        }
        this.sortRoutes();
        this.register();
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.info("api.loader.loaded", { routeCount: this.routes.length });
    }
    getRoutes() {
        return [...this.routes];
    }
    // ── Private ─────────────────────────────────────────────────────────────────
    sortRoutes() {
        this.routes.sort((a, b) => {
            const aParts = a.path.split("/").filter(Boolean);
            const bParts = b.path.split("/").filter(Boolean);
            const len = Math.max(aParts.length, bParts.length);
            for (let i = 0; i < len; i++) {
                const aPart = aParts[i];
                const bPart = bParts[i];
                if (aPart === undefined)
                    return -1;
                if (bPart === undefined)
                    return 1;
                const aIsParam = aPart.startsWith(":");
                const bIsParam = bPart.startsWith(":");
                if (aIsParam && !bIsParam)
                    return 1;
                if (!aIsParam && bIsParam)
                    return -1;
                if (aPart !== bPart) {
                    return aPart.localeCompare(bPart);
                }
            }
            // If paths are identical, sort alphabetically by HTTP method (GET before POST, etc.)
            return a.method.localeCompare(b.method);
        });
    }
    async scanDir(rootDir, currentDir) {
        let entries;
        try {
            entries = await readdir(currentDir);
        }
        catch (_a) {
            return;
        }
        await Promise.all(entries.map(async (entry) => {
            var _a;
            const fullPath = join(currentDir, entry);
            try {
                const fileStat = await stat(fullPath);
                if (fileStat.isDirectory()) {
                    await this.scanDir(rootDir, fullPath);
                    return;
                }
                if (!fileStat.isFile())
                    return;
                // Only process route files
                const basename = entry.replace(/\.[^.]+$/, "");
                if (basename !== "route")
                    return;
                if (![".ts", ".js", ".mjs"].includes(extname(entry)))
                    return;
                // Check if middlewares.ts exists next to it
                let middlewaresFile = fullPath.replace(/route\.(ts|js|mjs)$/, "middlewares.$1");
                let middlewares = [];
                try {
                    const mwStat = await stat(middlewaresFile);
                    if (mwStat.isFile()) {
                        const mwMod = await import(middlewaresFile);
                        if (Array.isArray(mwMod.default)) {
                            middlewares = mwMod.default;
                        }
                        else if (Array.isArray(mwMod.middlewares)) {
                            middlewares = mwMod.middlewares;
                        }
                    }
                }
                catch (_b) {
                    // Ignored, middlewares file is purely optional
                }
                await this.loadRouteFile(rootDir, fullPath, middlewares);
            }
            catch (_c) {
                (_a = this.logger) === null || _a === void 0 ? void 0 : _a.warn("api.loader.scan.error", { path: fullPath });
            }
        }));
    }
    async loadRouteFile(rootDir, filePath, middlewares = []) {
        var _a;
        try {
            const mod = await import(filePath);
            // Derive URL path from the directory structure relative to rootDir
            // e.g. rootDir = /src/api, filePath = /src/api/admin/products/route.ts
            //    → relativeDirParts = ["admin", "products"]
            //    → urlPath = /admin/products
            const relativeDir = relative(rootDir, filePath).replace(/[/\\][^/\\]+$/, ""); // strip filename
            const urlParts = relativeDir
                .split(/[/\\]/)
                .map((part) => part.replace(/^\[(.+)\]$/, ":$1")); // [id] → :id
            const urlPath = "/" + urlParts.filter(Boolean).join("/");
            for (const methodName of Object.keys(mod)) {
                if (!METHOD_EXPORT_NAMES.has(methodName))
                    continue;
                const method = methodName.toLowerCase();
                const handler = mod[methodName];
                if (typeof handler !== "function")
                    continue;
                this.routes.push({
                    path: urlPath || "/",
                    method,
                    handler,
                    middlewares: [...middlewares], // Pass down the array
                    sourcePath: filePath,
                });
            }
        }
        catch (_b) {
            (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error("api.loader.import.failed", { path: filePath });
        }
    }
    register() {
        if (!this.router)
            return;
        for (const route of this.routes) {
            const routerMethod = this.router[route.method];
            if (typeof routerMethod === "function") {
                routerMethod.call(this.router, route.path, ...route.middlewares, route.handler);
            }
        }
    }
}
