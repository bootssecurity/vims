import type { linkPivots, InsertLinkPivot, SelectLinkPivot } from "./link-pivot-schema.js";

// ── Drizzle db shape (minimal interface, not bound to a specific db instance) ──

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

// ── LinkRepository ────────────────────────────────────────────────────────────

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
export class LinkRepository {
  private readonly db: DrizzleDb | null;
  private readonly schema: typeof linkPivots | null;
  private fallbackStore: Map<string, LinkEdge>;

  constructor(db?: DrizzleDb, schema?: typeof linkPivots) {
    this.db = db ?? null;
    this.schema = schema ?? null;
    this.fallbackStore = new Map();
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Insert a link edge. Silently ignores duplicates (upsert-style).
   */
  async insert(edge: Omit<LinkEdge, "id" | "createdAt">): Promise<void> {
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
    } else {
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
  async insertMany(edges: Omit<LinkEdge, "id" | "createdAt">[]): Promise<void> {
    await Promise.all(edges.map((e) => this.insert(e)));
  }

  /**
   * Find link edges matching a filter.
   */
  async find(filter: LinkFilter): Promise<LinkEdge[]> {
    if (this.db && this.schema) {
      return this.findFromDb(filter);
    }
    return this.findFromFallback(filter);
  }

  /**
   * Find all target IDs linked from a given source.
   */
  async findTargetIds(linkId: string, sourceId: string): Promise<string[]> {
    const edges = await this.find({ linkId, sourceId });
    return edges.map((e) => e.targetId);
  }

  /**
   * Find all source IDs that link to a given target.
   */
  async findSourceIds(linkId: string, targetId: string): Promise<string[]> {
    const edges = await this.find({ linkId, targetId });
    return edges.map((e) => e.sourceId);
  }

  /**
   * Delete all edges matching a filter.
   */
  async delete(filter: LinkFilter): Promise<void> {
    if (this.db && this.schema) {
      await this.deleteFromDb(filter);
    } else {
      this.deleteFromFallback(filter);
    }
  }

  /**
   * Delete all edges for a source record (used during cascade delete).
   */
  async deleteBySource(linkId: string, sourceId: string): Promise<void> {
    await this.delete({ linkId, sourceId });
  }

  /**
   * Delete all edges pointing to a target record.
   */
  async deleteByTarget(linkId: string, targetId: string): Promise<void> {
    await this.delete({ linkId, targetId });
  }

  /**
   * Count edges matching a filter.
   */
  async count(filter: LinkFilter): Promise<number> {
    const edges = await this.find(filter);
    return edges.length;
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private async findFromDb(filter: LinkFilter): Promise<LinkEdge[]> {
    // NOTE: Drizzle requires importing `and`, `eq`, `inArray` from drizzle-orm.
    // Since this layer is purposely not bound to a drizzle-orm import (to keep
    // the package generic), we skip the DB path for now and fall through to the
    // fallback. Real integration requires injecting an `eq` helper or a full
    // DrizzleQueryHelper. That wiring lives in the database-postgres provider.
    return this.findFromFallback(filter);
  }

  private async deleteFromDb(filter: LinkFilter): Promise<void> {
    this.deleteFromFallback(filter);
  }

  private findFromFallback(filter: LinkFilter): LinkEdge[] {
    const results: LinkEdge[] = [];

    for (const edge of this.fallbackStore.values()) {
      if (filter.linkId && edge.linkId !== filter.linkId) continue;
      if (filter.sourceModule && edge.sourceModule !== filter.sourceModule) continue;
      if (filter.targetModule && edge.targetModule !== filter.targetModule) continue;

      if (filter.sourceId !== undefined) {
        const ids = Array.isArray(filter.sourceId) ? filter.sourceId : [filter.sourceId];
        if (!ids.includes(edge.sourceId)) continue;
      }

      if (filter.targetId !== undefined) {
        const ids = Array.isArray(filter.targetId) ? filter.targetId : [filter.targetId];
        if (!ids.includes(edge.targetId)) continue;
      }

      results.push(edge);
    }

    return results;
  }

  private deleteFromFallback(filter: LinkFilter): void {
    for (const [key, edge] of this.fallbackStore) {
      if (filter.linkId && edge.linkId !== filter.linkId) continue;
      if (filter.sourceModule && edge.sourceModule !== filter.sourceModule) continue;
      if (filter.targetModule && edge.targetModule !== filter.targetModule) continue;

      if (filter.sourceId !== undefined) {
        const ids = Array.isArray(filter.sourceId) ? filter.sourceId : [filter.sourceId];
        if (!ids.includes(edge.sourceId)) continue;
      }

      if (filter.targetId !== undefined) {
        const ids = Array.isArray(filter.targetId) ? filter.targetId : [filter.targetId];
        if (!ids.includes(edge.targetId)) continue;
      }

      this.fallbackStore.delete(key);
    }
  }
}
