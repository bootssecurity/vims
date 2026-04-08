import { VimsLinkRegistry } from "./index.js";
// ── Link ─────────────────────────────────────────────────────────────────────
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
export class Link {
    constructor(registry = VimsLinkRegistry, options = {}) {
        var _a, _b;
        this.store = new Map();
        this.relations = new Map();
        this.repo = (_a = options.repository) !== null && _a !== void 0 ? _a : null;
        this.container = (_b = options.container) !== null && _b !== void 0 ? _b : null;
        this.buildRelations(registry);
    }
    // ── Public API ───────────────────────────────────────────────────────────────
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
    async create(input) {
        const entries = Array.isArray(input) ? input : [input];
        for (const entry of entries) {
            const modules = Object.keys(entry);
            if (modules.length !== 2)
                throw new Error("Link.create() requires exactly 2 module keys");
            const [modA, modB] = modules;
            const linkId = this.findLinkId(modA, modB);
            if (!linkId)
                throw new Error(`No link definition found between "${modA}" and "${modB}"`);
            const reg = VimsLinkRegistry.get(linkId);
            const sourceId = Object.values(entry[reg.source])[0];
            const targetId = Object.values(entry[reg.target])[0];
            // In-memory fast path
            if (!this.store.has(linkId))
                this.store.set(linkId, new Map());
            const linkStore = this.store.get(linkId);
            if (!linkStore.has(sourceId))
                linkStore.set(sourceId, new Set());
            linkStore.get(sourceId).add(targetId);
            // Durable path
            if (this.repo) {
                await this.repo.insert({
                    linkId,
                    sourceModule: reg.source,
                    sourceId,
                    targetModule: reg.target,
                    targetId,
                });
            }
        }
    }
    /**
     * Remove specific links between module records.
     */
    async dismiss(input) {
        var _a, _b;
        const entries = Array.isArray(input) ? input : [input];
        for (const entry of entries) {
            const modules = Object.keys(entry);
            if (modules.length !== 2)
                throw new Error("Link.dismiss() requires exactly 2 module keys");
            const [modA, modB] = modules;
            const linkId = this.findLinkId(modA, modB);
            if (!linkId)
                return;
            const reg = VimsLinkRegistry.get(linkId);
            const sourceId = Object.values(entry[reg.source])[0];
            const targetId = Object.values(entry[reg.target])[0];
            (_b = (_a = this.store.get(linkId)) === null || _a === void 0 ? void 0 : _a.get(sourceId)) === null || _b === void 0 ? void 0 : _b.delete(targetId);
            if (this.repo) {
                await this.repo.delete({ linkId, sourceId, targetId });
            }
        }
    }
    /**
     * List links for the given filter.
     * Returns matching `{ source, target, linkId }` tuples.
     *
     * When a repository is present and the in-memory cache is empty,
     * the query falls through to the repository.
     */
    async list(filter) {
        const results = [];
        const modules = Object.keys(filter);
        for (const [linkId, registration] of VimsLinkRegistry) {
            if (!modules.some((m) => m === registration.source || m === registration.target))
                continue;
            // Prefer in-memory cache; fall through to repo if cache is empty for this linkId
            if (!this.store.has(linkId) && this.repo) {
                const sourceFilter = filter[registration.source];
                const repoFilter = sourceFilter
                    ? { linkId, sourceId: Object.values(sourceFilter).flat() }
                    : { linkId };
                const edges = await this.repo.find(repoFilter);
                for (const edge of edges) {
                    results.push({ source: edge.sourceId, target: edge.targetId, linkId });
                }
                continue;
            }
            const linkStore = this.store.get(linkId);
            if (!linkStore)
                continue;
            for (const [sourceId, targetIds] of linkStore) {
                const sourceFilter = filter[registration.source];
                const targetFilter = filter[registration.target];
                if (sourceFilter) {
                    const vals = Object.values(sourceFilter).flat();
                    if (!vals.includes(sourceId))
                        continue;
                }
                for (const targetId of targetIds) {
                    if (targetFilter) {
                        const vals = Object.values(targetFilter).flat();
                        if (!vals.includes(targetId))
                            continue;
                    }
                    results.push({ source: sourceId, target: targetId, linkId });
                }
            }
        }
        return results;
    }
    /**
     * Get all target IDs linked from a given source within a specific linkId.
     * Checks in-memory cache first, falls back to repository.
     */
    async getTargetIds(linkId, sourceId) {
        var _a;
        const cached = (_a = this.store.get(linkId)) === null || _a === void 0 ? void 0 : _a.get(sourceId);
        if (cached && cached.size > 0)
            return [...cached];
        if (this.repo) {
            return this.repo.findTargetIds(linkId, sourceId);
        }
        return [];
    }
    /**
     * Get all source IDs that link to a given target within a specific linkId.
     */
    async getSourceIds(linkId, targetId) {
        const results = [];
        // Check in-memory cache
        const linkStore = this.store.get(linkId);
        if (linkStore) {
            for (const [sourceId, targets] of linkStore) {
                if (targets.has(targetId))
                    results.push(sourceId);
            }
            if (results.length > 0)
                return results;
        }
        if (this.repo) {
            return this.repo.findSourceIds(linkId, targetId);
        }
        return [];
    }
    /**
     * Delete all links sourced from the given module records.
     * If `deleteCascade: true` on the link definition, the cascade metadata
     * is included in the result for the caller to act on.
     *
     * If a container was injected, this method actively orchestrates the soft-delete
     * cascading by resolving the target module service and invoking `.softDelete()`.
     */
    async delete(input) {
        var _a;
        const affected = {};
        const errors = [];
        for (const [moduleKey, filterMap] of Object.entries(input)) {
            const moduleIds = Object.values(filterMap).flat();
            for (const [linkId, registration] of VimsLinkRegistry) {
                if (registration.source !== moduleKey && registration.target !== moduleKey)
                    continue;
                const linkStore = this.store.get(linkId);
                const isCascadeable = registration.deleteCascade === true;
                const isSource = registration.source === moduleKey;
                try {
                    if (isSource) {
                        for (const sourceId of moduleIds) {
                            const targets = linkStore === null || linkStore === void 0 ? void 0 : linkStore.get(sourceId);
                            // Gather IDs that need to be cascaded before deleting the edge
                            let cascadeIds = [];
                            if (isCascadeable && targets && targets.size > 0) {
                                cascadeIds = [...targets];
                                const key = registration.target;
                                const fk = (_a = registration.targetKey) !== null && _a !== void 0 ? _a : "id";
                                if (!affected[key])
                                    affected[key] = {};
                                if (!affected[key][fk])
                                    affected[key][fk] = [];
                                affected[key][fk].push(...cascadeIds);
                            }
                            linkStore === null || linkStore === void 0 ? void 0 : linkStore.delete(sourceId);
                            if (this.repo) {
                                await this.repo.deleteBySource(linkId, sourceId);
                            }
                            // Actively invoke softDelete if enabled
                            if (cascadeIds.length > 0 && this.container) {
                                const targetService = this.container.resolve(`module:${registration.target}`, { allowUnregistered: true });
                                if (targetService) {
                                    const method = typeof targetService.softDelete === "function"
                                        ? "softDelete"
                                        : typeof targetService.delete === "function"
                                            ? "delete"
                                            : null;
                                    if (method) {
                                        await targetService[method](cascadeIds);
                                    }
                                }
                            }
                        }
                    }
                    else {
                        // Target side — remove any edge pointing AT these IDs
                        if (linkStore) {
                            for (const [sourceId, targets] of linkStore) {
                                for (const targetId of moduleIds) {
                                    targets.delete(targetId);
                                }
                                if (targets.size === 0)
                                    linkStore.delete(sourceId);
                            }
                        }
                        if (this.repo) {
                            for (const targetId of moduleIds) {
                                await this.repo.deleteByTarget(linkId, targetId);
                            }
                        }
                    }
                }
                catch (err) {
                    errors.push({
                        module: moduleKey,
                        key: linkId,
                        error: err instanceof Error ? err : new Error(String(err)),
                    });
                }
            }
        }
        return { affected, errors };
    }
    /**
     * Restore soft-deleted links.
     * Returns an empty result in this implementation (no soft-delete store).
     */
    async restore(input) {
        return { affected: {}, errors: [] };
    }
    /**
     * Hydrate the in-memory cache from the repository for a given linkId.
     * Call during application startup to warm the cache.
     */
    async hydrate(linkId) {
        if (!this.repo)
            return;
        const edges = await this.repo.find({ linkId });
        if (!this.store.has(linkId))
            this.store.set(linkId, new Map());
        const linkStore = this.store.get(linkId);
        for (const edge of edges) {
            if (!linkStore.has(edge.sourceId))
                linkStore.set(edge.sourceId, new Set());
            linkStore.get(edge.sourceId).add(edge.targetId);
        }
    }
    /**
     * Add a new link registration to the graph at runtime.
     */
    addRegistration(reg) {
        var _a;
        const existing = (_a = this.relations.get(reg.source)) !== null && _a !== void 0 ? _a : [];
        existing.push({ registration: reg, cascadeTarget: reg.target });
        this.relations.set(reg.source, existing);
    }
    /**
     * Return all links in the in-memory store, flattened to a readable array.
     */
    dump() {
        const rows = [];
        for (const [linkId, linkStore] of this.store) {
            for (const [sourceId, targetIds] of linkStore) {
                for (const targetId of targetIds) {
                    rows.push({ linkId, source: sourceId, target: targetId });
                }
            }
        }
        return rows;
    }
    // ── Private ─────────────────────────────────────────────────────────────────
    buildRelations(registry) {
        var _a;
        for (const [, reg] of registry) {
            const existing = (_a = this.relations.get(reg.source)) !== null && _a !== void 0 ? _a : [];
            existing.push({ registration: reg, cascadeTarget: reg.target });
            this.relations.set(reg.source, existing);
        }
    }
    findLinkId(modA, modB) {
        for (const [linkId, reg] of VimsLinkRegistry) {
            if ((reg.source === modA && reg.target === modB) ||
                (reg.source === modB && reg.target === modA)) {
                return linkId;
            }
        }
        return undefined;
    }
}
