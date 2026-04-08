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
    entryPoint: string;
    variables?: QueryFieldSelector;
    filters?: QueryFilter;
    options?: QueryOptions;
};
export type QueryResult<T = Record<string, unknown>> = {
    data: T[];
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
 * Cross-module query engine.
 *
 * Steps for each call to `query()`:
 *  1. Resolve the entry module's service from the container
 *  2. Fetch records via the service's `list()` / `find()` method
 *  3. Project the requested fields (field selector)
 *  4. For each key in the selector that matches a related module,
 *     use the registered `Link` instance to look up linked IDs,
 *     then fetch the related records and attach them
 *
 * Usage:
 * ```ts
 * const query = new RemoteQuery(container);
 *
 * const { data } = await query.query({
 *   entryPoint: "crm",
 *   variables: {
 *     id: true,
 *     firstName: true,
 *     stage: true,
 *     inventory: { id: true, make: true, model: true },
 *   },
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
     * Returns schema metadata for a module.
     */
    getSchema(moduleKey: string): DiscoveredSchema | undefined;
    /**
     * Returns all registered link relationships that touch `moduleKey`.
     */
    getRelationships(moduleKey: string): Array<{
        linkId: string;
        source: string;
        target: string;
        relationship: string;
    }>;
    private fetchFromService;
    private project;
    private resolveLinks;
    private fetchRelatedByIds;
}
export declare function createQuery(container: MinimalContainer): RemoteQuery;
export {};
