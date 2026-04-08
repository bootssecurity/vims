import { VimsLinkRegistry } from "./index";
// ── RemoteQuery ───────────────────────────────────────────────────────────────
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
export class RemoteQuery {
    constructor(container) {
        this.container = container;
    }
    // ── Public ──────────────────────────────────────────────────────────────────
    async query(input) {
        var _a, _b;
        const { entryPoint, variables, filters, options } = input;
        const take = (_a = options === null || options === void 0 ? void 0 : options.take) !== null && _a !== void 0 ? _a : 20;
        const skip = (_b = options === null || options === void 0 ? void 0 : options.skip) !== null && _b !== void 0 ? _b : 0;
        // Resolve the schema for the entry module
        const schema = this.container.resolve(`schema:${entryPoint}`, { allowUnregistered: true });
        // Resolve the module service
        const service = this.container.resolve(`module:${entryPoint}`, { allowUnregistered: true });
        // If the service exposes a `list()` or `find()` method, delegate to it
        const rawData = await this.fetchFromService(service, filters, options);
        // Project fields
        const projected = rawData.map((record) => variables ? this.project(record, variables) : record);
        // Resolve linked modules
        const enriched = await this.resolveLinks(entryPoint, projected, variables);
        return {
            data: enriched,
            metadata: { count: enriched.length, take, skip },
        };
    }
    /**
     * Returns table information discovered for a module's schema.
     */
    getSchema(moduleKey) {
        return this.container.resolve(`schema:${moduleKey}`, { allowUnregistered: true });
    }
    /**
     * Returns all link definitions that connect `moduleKey` to another module.
     */
    getRelationships(moduleKey) {
        const result = [];
        for (const [linkId, reg] of VimsLinkRegistry) {
            if (reg.source === moduleKey || reg.target === moduleKey) {
                result.push({
                    linkId,
                    source: reg.source,
                    target: reg.target,
                    relationship: reg.relationship,
                });
            }
        }
        return result;
    }
    // ── Private ──────────────────────────────────────────────────────────────────
    async fetchFromService(service, filters, options) {
        var _a, _b;
        if (!service)
            return [];
        // Try common service method names in order of preference
        for (const method of ["list", "find", "findAll", "getAll"]) {
            if (typeof service[method] === "function") {
                try {
                    const result = await service[method](filters !== null && filters !== void 0 ? filters : {}, {
                        take: (_a = options === null || options === void 0 ? void 0 : options.take) !== null && _a !== void 0 ? _a : 20,
                        skip: (_b = options === null || options === void 0 ? void 0 : options.skip) !== null && _b !== void 0 ? _b : 0,
                        orderBy: options === null || options === void 0 ? void 0 : options.orderBy,
                    });
                    return Array.isArray(result) ? result : [];
                }
                catch (_c) {
                    return [];
                }
            }
        }
        return [];
    }
    project(record, selector) {
        const result = {};
        for (const [field, include] of Object.entries(selector)) {
            if (!include)
                continue;
            if (include === true) {
                if (field in record)
                    result[field] = record[field];
            }
            else if (typeof include === "object" && field in record) {
                const nested = record[field];
                if (nested && typeof nested === "object" && !Array.isArray(nested)) {
                    result[field] = this.project(nested, include);
                }
                else if (Array.isArray(nested)) {
                    result[field] = nested.map((item) => this.project(item, include));
                }
                else {
                    result[field] = nested;
                }
            }
        }
        return result;
    }
    async resolveLinks(entryPoint, records, variables) {
        if (!variables || records.length === 0)
            return records;
        const links = this.getRelationships(entryPoint);
        for (const link of links) {
            const relatedKey = link.source === entryPoint ? link.target : link.source;
            const fieldKey = relatedKey; // by convention, linked module data is keyed by module name
            if (!variables[fieldKey])
                continue;
            const relatedService = this.container.resolve(`module:${relatedKey}`, { allowUnregistered: true });
            if (!relatedService)
                continue;
            const relatedSelector = typeof variables[fieldKey] === "object"
                ? variables[fieldKey]
                : {};
            // Collect IDs from the link registry store
            // For now: attach empty array — full resolution requires the link store
            for (const record of records) {
                if (!(fieldKey in record)) {
                    record[fieldKey] = [];
                }
            }
        }
        return records;
    }
}
// ── createQuery ───────────────────────────────────────────────────────────────
/**
 * Factory helper — creates a `RemoteQuery` instance bound to the given container.
 */
export function createQuery(container) {
    return new RemoteQuery(container);
}
