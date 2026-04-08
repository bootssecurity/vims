import type { DiscoveredSchema } from "./loaders/utils/load-internal";
export type QueryFieldSelector = {
    [field: string]: boolean | QueryFieldSelector;
};
export type QueryFilter = {
    [field: string]: unknown;
};
export type QueryOptions = {
    take?: number;
    skip?: number;
    orderBy?: {
        [field: string]: "asc" | "desc";
    };
};
export type QueryInput = {
    /** Starting module key, e.g. "crm" */
    entryPoint: string;
    /** Fields (and nested traversals) to include in the result */
    variables?: QueryFieldSelector;
    /** Filter applied to the entry module's records */
    filters?: QueryFilter;
    options?: QueryOptions;
};
export type QueryResult<T = Record<string, unknown>> = {
    data: T[];
    /** Paging metadata */
    metadata: {
        count: number;
        take: number;
        skip: number;
    };
};
type MinimalContainer = {
    resolve<T = unknown>(key: string, opts?: {
        allowUnregistered?: boolean;
    }): T;
};
/**
 * RemoteQuery
 *
 * A cross-module query engine that:
 *  1. Loads the discovered Drizzle schema for the entry module from the container
 *  2. Resolves cross-module relationships declared in VimsLinkRegistry
 *  3. Returns a typed result shape with field projection
 *
 * In this implementation, data retrieval itself is delegated to the registered
 * module service (`module:<key>`) because the actual Drizzle db connection
 * lives there. RemoteQuery acts as the query planner that orchestrates
 * multi-module fetches and joins them in-process.
 *
 * Usage:
 * ```ts
 * const query = new RemoteQuery(container);
 *
 * const { data } = await query.query({
 *   entryPoint: "crm",
 *   variables: { id: true, firstName: true, stage: true },
 *   filters: { stage: "New Lead" },
 *   options: { take: 20, skip: 0 },
 * });
 * ```
 */
export declare class RemoteQuery {
    private readonly container;
    constructor(container: MinimalContainer);
    query<T = Record<string, unknown>>(input: QueryInput): Promise<QueryResult<T>>;
    /**
     * Returns table information discovered for a module's schema.
     */
    getSchema(moduleKey: string): DiscoveredSchema | undefined;
    /**
     * Returns all link definitions that connect `moduleKey` to another module.
     */
    getRelationships(moduleKey: string): {
        linkId: string;
        source: string;
        target: string;
        relationship: string;
    }[];
    private fetchFromService;
    private project;
    private resolveLinks;
}
/**
 * Factory helper — creates a `RemoteQuery` instance bound to the given container.
 */
export declare function createQuery(container: MinimalContainer): RemoteQuery;
export {};
