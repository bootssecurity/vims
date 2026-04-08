import { type VimsLinkRegistration } from "./index.js";
import { LinkRepository } from "./db/link-repository.js";
export type LinkDeleteInput = {
    [moduleKey: string]: Record<string, string | string[]>;
};
export type LinkRestoreInput = LinkDeleteInput;
export type LinkListInput = {
    [moduleKey: string]: Record<string, string | string[]>;
};
export type LinkCascadeResult = {
    /** Modules whose records were cascaded */
    affected: Record<string, Record<string, string[]>>;
    /** Errors encountered during cascade (partial success) */
    errors: Array<{
        module: string;
        key: string;
        error: Error;
    }>;
};
type MinimalContainer = {
    resolve<T = unknown>(key: string, opts?: {
        allowUnregistered?: boolean;
    }): T;
};
export type LinkOptions = {
    /**
     * Injected repository for durable edge storage.
     * When omitted the `Link` operates in in-memory-only mode (no persistence).
     */
    repository?: LinkRepository;
    /**
     * Container for module service resolution.
     * Required for active soft-delete cascades.
     */
    container?: MinimalContainer;
};
/**
 * Link
 *
 * Maintains a relationship graph built from `VimsLinkRegistry`
 * and provides CRUD-like operations over module-to-module associations.
 *
 * Data is stored in an in-memory adjacency map (fast-path cache) keyed by
 * `linkId → (sourceId → targetId[])`.  When a `LinkRepository` is injected,
 * writes are also persisted to the backing store (Drizzle or in-memory fallback).
 *
 * Usage:
 * ```ts
 * // In-memory only (tests, local dev without a DB)
 * const link = new Link();
 *
 * // With durable persistence
 * const repo = new LinkRepository(db, linkPivots);
 * const link = new Link(VimsLinkRegistry, { repository: repo, container: myContainer });
 *
 * await link.create({ crm: { id: "deal-1" }, inventory: { id: "prod-1" } });
 * const links = await link.list({ crm: { id: "deal-1" } });
 * const result = await link.delete({ crm: { id: ["deal-1"] } });
 * ```
 */
export declare class Link {
    private readonly store;
    private relations;
    private readonly repo;
    private readonly container;
    constructor(registry?: Map<string, VimsLinkRegistration>, options?: LinkOptions);
    /**
     * Register (create) links between module records.
     *
     * Input shape:
     * ```ts
     * { moduleA: { foreignKey: "id_value" }, moduleB: { foreignKey: "id_value" } }
     * ```
     *
     * Accepts a single entry or an array of entries for batch creation.
     */
    create(input: {
        [moduleKey: string]: Record<string, string>;
    } | Array<{
        [moduleKey: string]: Record<string, string>;
    }>): Promise<void>;
    /**
     * Remove specific links between module records.
     */
    dismiss(input: {
        [moduleKey: string]: Record<string, string>;
    } | Array<{
        [moduleKey: string]: Record<string, string>;
    }>): Promise<void>;
    /**
     * List links for the given filter.
     * Returns matching `{ source, target, linkId }` tuples.
     *
     * When a repository is present and the in-memory cache is empty,
     * the query falls through to the repository.
     */
    list(filter: {
        [moduleKey: string]: Record<string, string | string[]>;
    }): Promise<Array<{
        source: string;
        target: string;
        linkId: string;
    }>>;
    /**
     * Get all target IDs linked from a given source within a specific linkId.
     * Checks in-memory cache first, falls back to repository.
     */
    getTargetIds(linkId: string, sourceId: string): Promise<string[]>;
    /**
     * Get all source IDs that link to a given target within a specific linkId.
     */
    getSourceIds(linkId: string, targetId: string): Promise<string[]>;
    /**
     * Delete all links sourced from the given module records.
     * If `deleteCascade: true` on the link definition, the cascade metadata
     * is included in the result for the caller to act on.
     *
     * If a container was injected, this method actively orchestrates the soft-delete
     * cascading by resolving the target module service and invoking `.softDelete()`.
     */
    delete(input: LinkDeleteInput): Promise<LinkCascadeResult>;
    /**
     * Restore soft-deleted links.
     * Returns an empty result in this implementation (no soft-delete store).
     */
    restore(input: LinkRestoreInput): Promise<LinkCascadeResult>;
    /**
     * Hydrate the in-memory cache from the repository for a given linkId.
     * Call during application startup to warm the cache.
     */
    hydrate(linkId: string): Promise<void>;
    /**
     * Add a new link registration to the graph at runtime.
     */
    addRegistration(reg: VimsLinkRegistration): void;
    /**
     * Return all links in the in-memory store, flattened to a readable array.
     */
    dump(): Array<{
        linkId: string;
        source: string;
        target: string;
    }>;
    private buildRelations;
    private findLinkId;
}
export {};
