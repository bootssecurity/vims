import { VimsLinkRegistry } from "./index.js";
// ── RemoteQuery ───────────────────────────────────────────────────────────────
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
        const service = this.container.resolve(`module:${entryPoint}`, { allowUnregistered: true });
        const rawData = await this.fetchFromService(service, filters, options);
        const projected = rawData.map((record) => variables ? this.project(record, variables) : record);
        const enriched = await this.resolveLinks(entryPoint, projected, variables);
        return {
            data: enriched,
            metadata: { count: enriched.length, take, skip },
        };
    }
    /**
     * Returns schema metadata for a module.
     */
    getSchema(moduleKey) {
        return this.container.resolve(`schema:${moduleKey}`, { allowUnregistered: true });
    }
    /**
     * Returns all registered link relationships that touch `moduleKey`.
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
        // Resolve the Link instance from the container (registered during app init)
        const link = this.container.resolve("link", { allowUnregistered: true });
        const links = this.getRelationships(entryPoint);
        for (const rel of links) {
            const relatedKey = rel.source === entryPoint ? rel.target : rel.source;
            // Only resolve if the field is requested in the selector
            if (!variables[relatedKey])
                continue;
            const relatedService = this.container.resolve(`module:${relatedKey}`, { allowUnregistered: true });
            const relatedSelector = typeof variables[relatedKey] === "object"
                ? variables[relatedKey]
                : {};
            for (const record of records) {
                const recordId = record["id"];
                if (!recordId) {
                    record[relatedKey] = [];
                    continue;
                }
                // Use the Link instance to resolve edge IDs
                let relatedIds = [];
                if (link) {
                    if (rel.source === entryPoint) {
                        relatedIds = await link.getTargetIds(rel.linkId, recordId);
                    }
                    else {
                        relatedIds = await link.getSourceIds(rel.linkId, recordId);
                    }
                }
                if (relatedIds.length === 0 || !relatedService) {
                    record[relatedKey] = [];
                    continue;
                }
                // Fetch the related records by their IDs
                const relatedRecords = await this.fetchRelatedByIds(relatedService, relatedIds, relatedSelector);
                // Recursively resolve links for the child records
                const fullyResolvedRelated = await this.resolveLinks(relatedKey, relatedRecords, relatedSelector);
                record[relatedKey] = fullyResolvedRelated;
            }
        }
        return records;
    }
    async fetchRelatedByIds(service, ids, selector) {
        if (!service || ids.length === 0)
            return [];
        // Try service methods that accept an ID list
        for (const method of ["listByIds", "findByIds", "findMany"]) {
            if (typeof service[method] === "function") {
                try {
                    const result = await service[method](ids);
                    const raw = Array.isArray(result) ? result : [];
                    return Object.keys(selector).length > 0
                        ? raw.map((r) => this.project(r, selector))
                        : raw;
                }
                catch (_a) {
                    break;
                }
            }
        }
        // Fallback: fetch by filter if only a generic list() is available
        if (typeof service["list"] === "function") {
            try {
                const result = await service["list"]({ id: ids });
                const raw = Array.isArray(result) ? result : [];
                return Object.keys(selector).length > 0
                    ? raw.map((r) => this.project(r, selector))
                    : raw;
            }
            catch (_b) {
                return [];
            }
        }
        return [];
    }
}
// ── createQuery factory ───────────────────────────────────────────────────────
export function createQuery(container) {
    return new RemoteQuery(container);
}
