import type { VimsLinkRegistration } from "@vims/modules-sdk";
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
export declare class LinkLoader {
    private readonly sourcePaths;
    private readonly links;
    private readonly logger?;
    constructor(sourcePaths: string[], logger?: LinkLoader["logger"]);
    load(): Promise<void>;
    getLinks(): VimsLinkRegistration[];
    /**
     * Returns all links where the given module is either source or target.
     * Useful for building per-module relationship maps.
     */
    getLinksFor(moduleKey: string): VimsLinkRegistration[];
    private scanAll;
    private scanDir;
}
