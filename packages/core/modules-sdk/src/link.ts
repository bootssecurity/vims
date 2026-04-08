import { VimsLinkRegistry, type VimsLinkRegistration } from "./index";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  errors: Array<{ module: string; key: string; error: Error }>;
};

type RelationMeta = {
  registration: VimsLinkRegistration;
  /** Which side is "cascadeable" when source is deleted */
  cascadeTarget: string;
};

// ── Link ─────────────────────────────────────────────────────────────────────

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
export class Link {
  // In-memory storage: linkId → sourceKey → targetIds
  private readonly store = new Map<string, Map<string, Set<string>>>();

  // Cached relationship graph (rebuilt when registry changes)
  private relations = new Map<string, RelationMeta[]>();

  constructor(registry: Map<string, VimsLinkRegistration> = VimsLinkRegistry) {
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
   */
  async create(
    input: { [moduleKey: string]: Record<string, string> } | Array<{ [moduleKey: string]: Record<string, string> }>
  ): Promise<void> {
    const entries = Array.isArray(input) ? input : [input];

    for (const entry of entries) {
      const modules = Object.keys(entry);
      if (modules.length !== 2) throw new Error("Link.create() requires exactly 2 module keys");

      const [modA, modB] = modules;
      const linkId = this.findLinkId(modA, modB);
      if (!linkId) throw new Error(`No link definition found between "${modA}" and "${modB}"`);

      const reg = VimsLinkRegistry.get(linkId)!;
      const sourceKey = Object.values(entry[reg.source])[0];
      const targetKey = Object.values(entry[reg.target])[0];

      if (!this.store.has(linkId)) this.store.set(linkId, new Map());
      const linkStore = this.store.get(linkId)!;
      if (!linkStore.has(sourceKey)) linkStore.set(sourceKey, new Set());
      linkStore.get(sourceKey)!.add(targetKey);
    }
  }

  /**
   * Remove specific links between module records.
   */
  async dismiss(
    input: { [moduleKey: string]: Record<string, string> } | Array<{ [moduleKey: string]: Record<string, string> }>
  ): Promise<void> {
    const entries = Array.isArray(input) ? input : [input];

    for (const entry of entries) {
      const modules = Object.keys(entry);
      if (modules.length !== 2) throw new Error("Link.dismiss() requires exactly 2 module keys");

      const [modA, modB] = modules;
      const linkId = this.findLinkId(modA, modB);
      if (!linkId) return; // no link def → no-op

      const reg = VimsLinkRegistry.get(linkId)!;
      const sourceKey = Object.values(entry[reg.source])[0];
      const targetKey = Object.values(entry[reg.target])[0];

      const linkStore = this.store.get(linkId);
      linkStore?.get(sourceKey)?.delete(targetKey);
    }
  }

  /**
   * List links for the given filter.
   * Returns matching `{ source, target }` pairs.
   */
  async list(
    filter: { [moduleKey: string]: Record<string, string | string[]> }
  ): Promise<Array<{ source: string; target: string; linkId: string }>> {
    const results: Array<{ source: string; target: string; linkId: string }> = [];
    const modules = Object.keys(filter);

    for (const [linkId, registration] of VimsLinkRegistry) {
      if (!this.store.has(linkId)) continue;
      if (!modules.some((m) => m === registration.source || m === registration.target)) continue;

      const linkStore = this.store.get(linkId)!;

      for (const [sourceId, targetIds] of linkStore) {
        // Apply filter
        const sourceFilter = filter[registration.source];
        const targetFilter = filter[registration.target];

        if (sourceFilter) {
          const filterVals = Object.values(sourceFilter).flat();
          if (!filterVals.includes(sourceId)) continue;
        }

        for (const targetId of targetIds) {
          if (targetFilter) {
            const filterVals = Object.values(targetFilter).flat();
            if (!filterVals.includes(targetId)) continue;
          }
          results.push({ source: sourceId, target: targetId, linkId });
        }
      }
    }

    return results;
  }

  /**
   * Delete all links sourced from the given module records.
   * If `deleteCascade: true` on the link definition, the cascade metadata
   * is included in the result for upstream handling.
   *
   * NOTE: The Link class itself does not delete module records — it deletes
   * the *link* rows and returns cascade metadata for the caller to act on.
   */
  async delete(input: LinkDeleteInput): Promise<LinkCascadeResult> {
    const affected: Record<string, Record<string, string[]>> = {};
    const errors: LinkCascadeResult["errors"] = [];

    for (const [moduleKey, filterMap] of Object.entries(input)) {
      const moduleIds = Object.values(filterMap).flat();

      for (const [linkId, registration] of VimsLinkRegistry) {
        if (registration.source !== moduleKey && registration.target !== moduleKey) continue;

        const linkStore = this.store.get(linkId);
        if (!linkStore) continue;

        const isCascadeable = registration.deleteCascade === true;
        const isSource = registration.source === moduleKey;

        try {
          if (isSource) {
            for (const sourceId of moduleIds) {
              const targets = linkStore.get(sourceId);
              if (!targets) continue;

              if (isCascadeable) {
                const key = registration.target;
                if (!affected[key]) affected[key] = {};
                const fk = registration.targetKey ?? "id";
                if (!affected[key][fk]) affected[key][fk] = [];
                affected[key][fk].push(...targets);
              }

              linkStore.delete(sourceId);
            }
          } else {
            // target side — soft remove entries pointing to these IDs
            for (const [sourceId, targets] of linkStore) {
              for (const targetId of moduleIds) {
                targets.delete(targetId);
              }
              if (targets.size === 0) linkStore.delete(sourceId);
            }
          }
        } catch (err) {
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
   * Restore soft-deleted links. In this in-memory implementation,
   * "restoring" is a no-op since we don't have a soft-delete store,
   * but the method is provided for interface `Link.restore`.
   */
  async restore(input: LinkRestoreInput): Promise<LinkCascadeResult> {
    // In-memory: nothing to restore. Return empty result.
    return { affected: {}, errors: [] };
  }

  /**
   * Add a new link registration to the graph at runtime (e.g. after LinkLoader runs).
   */
  addRegistration(reg: VimsLinkRegistration): void {
    const { source, sourceKey = "id", target, targetKey = "id" } = reg;
    const key = `${source}<>${sourceKey}<>${target}<>${targetKey}`;
    const existing = this.relations.get(source) ?? [];
    existing.push({ registration: reg, cascadeTarget: target });
    this.relations.set(source, existing);
  }

  /**
   * Return all links in the in-memory store, flattened to a readable array.
   */
  dump(): Array<{ linkId: string; source: string; target: string }> {
    const rows: Array<{ linkId: string; source: string; target: string }> = [];
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

  private buildRelations(registry: Map<string, VimsLinkRegistration>): void {
    for (const [, reg] of registry) {
      const existing = this.relations.get(reg.source) ?? [];
      existing.push({ registration: reg, cascadeTarget: reg.target });
      this.relations.set(reg.source, existing);
    }
  }

  /**
   * Find the linkId for a pair of module keys regardless of order.
   */
  private findLinkId(modA: string, modB: string): string | undefined {
    for (const [linkId, reg] of VimsLinkRegistry) {
      if (
        (reg.source === modA && reg.target === modB) ||
        (reg.source === modB && reg.target === modA)
      ) {
        return linkId;
      }
    }
    return undefined;
  }
}
