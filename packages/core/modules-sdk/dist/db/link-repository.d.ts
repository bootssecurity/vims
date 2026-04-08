import type { linkPivots, InsertLinkPivot, SelectLinkPivot } from "./link-pivot-schema.js";
type DrizzleDb = {
    insert: (table: typeof linkPivots) => {
        values: (data: InsertLinkPivot | InsertLinkPivot[]) => {
            onConflictDoNothing: () => Promise<void>;
        };
    };
    select: () => {
        from: (table: typeof linkPivots) => {
            where: (condition: unknown) => {
                limit: (n: number) => Promise<SelectLinkPivot[]>;
                orderBy: (col: unknown) => Promise<SelectLinkPivot[]>;
                execute?: () => Promise<SelectLinkPivot[]>;
            };
        };
    };
    delete: (table: typeof linkPivots) => {
        where: (condition: unknown) => Promise<void>;
    };
};
export type LinkEdge = {
    id: string;
    linkId: string;
    sourceModule: string;
    sourceId: string;
    targetModule: string;
    targetId: string;
    createdAt: Date;
};
export type LinkFilter = {
    linkId?: string;
    sourceModule?: string;
    sourceId?: string | string[];
    targetModule?: string;
    targetId?: string | string[];
};
/**
 * LinkRepository
 *
 * Drizzle-backed persistence layer for cross-module link edges.
 * Works alongside the in-memory `Link` class to provide durable storage.
 *
 * The `db` connection is injected at construction time — the caller is
 * responsible for providing a Drizzle `NodePgDatabase` instance.
 *
 * When no `db` is provided (e.g. in tests), the repository falls back to
 * an in-memory store so callers don't need a live database to operate.
 */
export declare class LinkRepository {
    private readonly db;
    private readonly schema;
    private fallbackStore;
    constructor(db?: DrizzleDb, schema?: typeof linkPivots);
    /**
     * Insert a link edge. Silently ignores duplicates (upsert-style).
     */
    insert(edge: Omit<LinkEdge, "id" | "createdAt">): Promise<void>;
    /**
     * Insert multiple edges in one call.
     */
    insertMany(edges: Omit<LinkEdge, "id" | "createdAt">[]): Promise<void>;
    /**
     * Find link edges matching a filter.
     */
    find(filter: LinkFilter): Promise<LinkEdge[]>;
    /**
     * Find all target IDs linked from a given source.
     */
    findTargetIds(linkId: string, sourceId: string): Promise<string[]>;
    /**
     * Find all source IDs that link to a given target.
     */
    findSourceIds(linkId: string, targetId: string): Promise<string[]>;
    /**
     * Delete all edges matching a filter.
     */
    delete(filter: LinkFilter): Promise<void>;
    /**
     * Delete all edges for a source record (used during cascade delete).
     */
    deleteBySource(linkId: string, sourceId: string): Promise<void>;
    /**
     * Delete all edges pointing to a target record.
     */
    deleteByTarget(linkId: string, targetId: string): Promise<void>;
    /**
     * Count edges matching a filter.
     */
    count(filter: LinkFilter): Promise<number>;
    private findFromDb;
    private deleteFromDb;
    private findFromFallback;
    private deleteFromFallback;
}
export {};
