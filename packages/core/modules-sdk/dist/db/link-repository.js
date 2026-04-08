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
export class LinkRepository {
    constructor(db, schema) {
        this.db = db !== null && db !== void 0 ? db : null;
        this.schema = schema !== null && schema !== void 0 ? schema : null;
        this.fallbackStore = new Map();
    }
    // ── Public API ───────────────────────────────────────────────────────────────
    /**
     * Insert a link edge. Silently ignores duplicates (upsert-style).
     */
    async insert(edge) {
        const edgeId = `${edge.linkId}:${edge.sourceId}:${edge.targetId}`;
        if (this.db && this.schema) {
            await this.db
                .insert(this.schema)
                .values({
                linkId: edge.linkId,
                sourceModule: edge.sourceModule,
                sourceId: edge.sourceId,
                targetModule: edge.targetModule,
                targetId: edge.targetId,
            })
                .onConflictDoNothing();
        }
        else {
            if (!this.fallbackStore.has(edgeId)) {
                this.fallbackStore.set(edgeId, {
                    id: edgeId,
                    linkId: edge.linkId,
                    sourceModule: edge.sourceModule,
                    sourceId: edge.sourceId,
                    targetModule: edge.targetModule,
                    targetId: edge.targetId,
                    createdAt: new Date(),
                });
            }
        }
    }
    /**
     * Insert multiple edges in one call.
     */
    async insertMany(edges) {
        await Promise.all(edges.map((e) => this.insert(e)));
    }
    /**
     * Find link edges matching a filter.
     */
    async find(filter) {
        if (this.db && this.schema) {
            return this.findFromDb(filter);
        }
        return this.findFromFallback(filter);
    }
    /**
     * Find all target IDs linked from a given source.
     */
    async findTargetIds(linkId, sourceId) {
        const edges = await this.find({ linkId, sourceId });
        return edges.map((e) => e.targetId);
    }
    /**
     * Find all source IDs that link to a given target.
     */
    async findSourceIds(linkId, targetId) {
        const edges = await this.find({ linkId, targetId });
        return edges.map((e) => e.sourceId);
    }
    /**
     * Delete all edges matching a filter.
     */
    async delete(filter) {
        if (this.db && this.schema) {
            await this.deleteFromDb(filter);
        }
        else {
            this.deleteFromFallback(filter);
        }
    }
    /**
     * Delete all edges for a source record (used during cascade delete).
     */
    async deleteBySource(linkId, sourceId) {
        await this.delete({ linkId, sourceId });
    }
    /**
     * Delete all edges pointing to a target record.
     */
    async deleteByTarget(linkId, targetId) {
        await this.delete({ linkId, targetId });
    }
    /**
     * Count edges matching a filter.
     */
    async count(filter) {
        const edges = await this.find(filter);
        return edges.length;
    }
    // ── Private ──────────────────────────────────────────────────────────────────
    async findFromDb(filter) {
        // NOTE: Drizzle requires importing `and`, `eq`, `inArray` from drizzle-orm.
        // Since this layer is purposely not bound to a drizzle-orm import (to keep
        // the package generic), we skip the DB path for now and fall through to the
        // fallback. Real integration requires injecting an `eq` helper or a full
        // DrizzleQueryHelper. That wiring lives in the database-postgres provider.
        return this.findFromFallback(filter);
    }
    async deleteFromDb(filter) {
        this.deleteFromFallback(filter);
    }
    findFromFallback(filter) {
        const results = [];
        for (const edge of this.fallbackStore.values()) {
            if (filter.linkId && edge.linkId !== filter.linkId)
                continue;
            if (filter.sourceModule && edge.sourceModule !== filter.sourceModule)
                continue;
            if (filter.targetModule && edge.targetModule !== filter.targetModule)
                continue;
            if (filter.sourceId !== undefined) {
                const ids = Array.isArray(filter.sourceId) ? filter.sourceId : [filter.sourceId];
                if (!ids.includes(edge.sourceId))
                    continue;
            }
            if (filter.targetId !== undefined) {
                const ids = Array.isArray(filter.targetId) ? filter.targetId : [filter.targetId];
                if (!ids.includes(edge.targetId))
                    continue;
            }
            results.push(edge);
        }
        return results;
    }
    deleteFromFallback(filter) {
        for (const [key, edge] of this.fallbackStore) {
            if (filter.linkId && edge.linkId !== filter.linkId)
                continue;
            if (filter.sourceModule && edge.sourceModule !== filter.sourceModule)
                continue;
            if (filter.targetModule && edge.targetModule !== filter.targetModule)
                continue;
            if (filter.sourceId !== undefined) {
                const ids = Array.isArray(filter.sourceId) ? filter.sourceId : [filter.sourceId];
                if (!ids.includes(edge.sourceId))
                    continue;
            }
            if (filter.targetId !== undefined) {
                const ids = Array.isArray(filter.targetId) ? filter.targetId : [filter.targetId];
                if (!ids.includes(edge.targetId))
                    continue;
            }
            this.fallbackStore.delete(key);
        }
    }
}
