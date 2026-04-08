import { type VimsLinkRegistration } from "./index";
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
/**
 * Link
 *
 * Maintains an in-memory relationship graph built from `VimsLinkRegistry`
 * and provides CRUD-like operations over module-to-module associations.
 *
 *
 * Data is stored in an in-memory adjacency map keyed
 * by `linkId → (sourceId → targetId[])`.
 *
 * For persistence, modules that own links should implement their own repository
 * layer; this class is an orchestration layer, not a storage layer.
 *
 * Usage:
 * ```ts
 * const link = new Link();
 *
 * // Create a relationship
 * await link.create({ crm: { deal_id: "d1" }, inventory: { product_id: "p1" } });
 *
 * // List links for a deal
 * const links = await link.list({ crm: { deal_id: "d1" } });
 *
 * // Cascade-delete everything linked to a CRM deal
 * const result = await link.delete({ crm: { deal_id: "d1" } });
 * ```
 */
export declare class Link {
    private readonly store;
    private relations;
    constructor(registry?: Map<string, VimsLinkRegistration>);
    /**
     * Register (create) links between module records.
     *
     * Input shape:
     * ```ts
     * { moduleA: { foreignKey: "id_value" }, moduleB: { foreignKey: "id_value" } }
     * ```
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
     * Returns matching `{ source, target }` pairs.
     */
    list(filter: {
        [moduleKey: string]: Record<string, string | string[]>;
    }): Promise<Array<{
        source: string;
        target: string;
        linkId: string;
    }>>;
    /**
     * Delete all links sourced from the given module records.
     * If `deleteCascade: true` on the link definition, the cascade metadata
     * is included in the result for upstream handling.
     *
     * NOTE: The Link class itself does not delete module records — it deletes
     * the *link* rows and returns cascade metadata for the caller to act on.
     */
    delete(input: LinkDeleteInput): Promise<LinkCascadeResult>;
    /**
     * Restore soft-deleted links. In this in-memory implementation,
     * "restoring" is a no-op since we don't have a soft-delete store,
     * but the method is provided for interface `Link.restore`.
     */
    restore(input: LinkRestoreInput): Promise<LinkCascadeResult>;
    /**
     * Add a new link registration to the graph at runtime (e.g. after LinkLoader runs).
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
    /**
     * Find the linkId for a pair of module keys regardless of order.
     */
    private findLinkId;
}
