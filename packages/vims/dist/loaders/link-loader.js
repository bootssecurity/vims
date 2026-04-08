import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
/**
 * LinkLoader
 *
 * File-system scanner that discovers and loads link definition modules from
 * one or more `links/` directories, registering them in `VimsLinkRegistry`.
 *
 * Link file shape:
 * ```ts
 * // src/links/crm-inventory.ts
 * import { createModuleLink } from "@vims/modules-sdk";
 *
 * export default createModuleLink({
 *   source: "crm",
 *   target: "inventory",
 *   sourceKey: "deal_id",
 *   targetKey: "product_id",
 *   relationship: "one-to-many",
 *   deleteCascade: true,
 * });
 * ```
 *
 * Usage:
 * ```ts
 * const loader = new LinkLoader([join(cwd, "src/links")]);
 * await loader.load();
 * console.log(loader.getLinks()); // all registered VimsLinkRegistrations
 * ```
 */
export class LinkLoader {
    constructor(sourcePaths, logger) {
        this.links = [];
        this.sourcePaths = sourcePaths;
        this.logger = logger;
    }
    // ── Public ──────────────────────────────────────────────────────────────────
    async load() {
        var _a;
        await this.scanAll();
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.info(`link.loader.loaded`, { count: this.links.length });
    }
    getLinks() {
        return [...this.links];
    }
    /**
     * Returns all links where the given module is either source or target.
     * Useful for building per-module relationship maps.
     */
    getLinksFor(moduleKey) {
        return this.links.filter((link) => link.source === moduleKey || link.target === moduleKey);
    }
    // ── Private ─────────────────────────────────────────────────────────────────
    async scanAll() {
        await Promise.allSettled(this.sourcePaths.map((p) => this.scanDir(p)));
    }
    async scanDir(dir) {
        let entries;
        try {
            entries = await readdir(dir);
        }
        catch (_a) {
            return; // missing dir is not an error
        }
        const validExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);
        await Promise.all(entries.map(async (entry) => {
            var _a, _b;
            if (!validExtensions.has(extname(entry)))
                return;
            if (entry.endsWith(".test.ts") ||
                entry.endsWith(".spec.ts") ||
                entry.endsWith(".d.ts"))
                return;
            const fullPath = join(dir, entry);
            try {
                const fileStat = await stat(fullPath);
                if (!fileStat.isFile())
                    return;
                const mod = await import(fullPath);
                const link = mod.default;
                if (!link)
                    return;
                // Validate minimal shape
                if (!link.source || !link.target || !link.relationship) {
                    (_a = this.logger) === null || _a === void 0 ? void 0 : _a.warn(`link.loader.invalid`, { path: fullPath });
                    return;
                }
                // Avoid duplicates (same file loaded twice in hot-reload scenarios)
                const alreadyLoaded = this.links.some((l) => l.linkId === link.linkId);
                if (!alreadyLoaded) {
                    this.links.push(link);
                }
            }
            catch (_c) {
                (_b = this.logger) === null || _b === void 0 ? void 0 : _b.warn(`link.loader.import.failed`, { path: fullPath });
            }
        }));
    }
}
