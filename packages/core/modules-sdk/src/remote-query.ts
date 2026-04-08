import type { DiscoveredSchema } from "./loaders/utils/load-internal.js";
import { VimsLinkRegistry } from "./index.js";
import type { Link } from "./link.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueryFieldSelector = {
  [field: string]: boolean | QueryFieldSelector;
};

export type QueryFilter = {
  [field: string]: unknown;
};

export type QueryOptions = {
  take?: number;
  skip?: number;
  orderBy?: { [field: string]: "asc" | "desc" };
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
  resolve<T = unknown>(key: string, opts?: { allowUnregistered?: boolean }): T;
};

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
  private readonly container: MinimalContainer;

  constructor(container: MinimalContainer) {
    this.container = container;
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  async query<T = Record<string, unknown>>(
    input: QueryInput
  ): Promise<QueryResult<T>> {
    const { entryPoint, variables, filters, options } = input;
    const take = options?.take ?? 20;
    const skip = options?.skip ?? 0;

    const service = this.container.resolve<any>(
      `module:${entryPoint}`,
      { allowUnregistered: true }
    );

    const rawData = await this.fetchFromService(service, filters, options);

    const projected = rawData.map((record: Record<string, unknown>) =>
      variables ? this.project(record, variables) : record
    );

    const enriched = await this.resolveLinks(entryPoint, projected, variables);

    return {
      data: enriched as T[],
      metadata: { count: enriched.length, take, skip },
    };
  }

  /**
   * Returns schema metadata for a module.
   */
  getSchema(moduleKey: string): DiscoveredSchema | undefined {
    return this.container.resolve<DiscoveredSchema | undefined>(
      `schema:${moduleKey}`,
      { allowUnregistered: true }
    );
  }

  /**
   * Returns all registered link relationships that touch `moduleKey`.
   */
  getRelationships(moduleKey: string): Array<{
    linkId: string;
    source: string;
    target: string;
    relationship: string;
  }> {
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

  private async fetchFromService(
    service: any,
    filters?: QueryFilter,
    options?: QueryOptions
  ): Promise<Record<string, unknown>[]> {
    if (!service) return [];

    for (const method of ["list", "find", "findAll", "getAll"]) {
      if (typeof service[method] === "function") {
        try {
          const result = await service[method](filters ?? {}, {
            take: options?.take ?? 20,
            skip: options?.skip ?? 0,
            orderBy: options?.orderBy,
          });
          return Array.isArray(result) ? result : [];
        } catch {
          return [];
        }
      }
    }

    return [];
  }

  private project(
    record: Record<string, unknown>,
    selector: QueryFieldSelector
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [field, include] of Object.entries(selector)) {
      if (!include) continue;
      if (include === true) {
        if (field in record) result[field] = record[field];
      } else if (typeof include === "object" && field in record) {
        const nested = record[field];
        if (nested && typeof nested === "object" && !Array.isArray(nested)) {
          result[field] = this.project(nested as Record<string, unknown>, include);
        } else if (Array.isArray(nested)) {
          result[field] = (nested as Record<string, unknown>[]).map((item) =>
            this.project(item, include as QueryFieldSelector)
          );
        } else {
          result[field] = nested;
        }
      }
    }

    return result;
  }

  private async resolveLinks(
    entryPoint: string,
    records: Record<string, unknown>[],
    variables?: QueryFieldSelector
  ): Promise<Record<string, unknown>[]> {
    if (!variables || records.length === 0) return records;

    // Resolve the Link instance from the container (registered during app init)
    const link = this.container.resolve<Link | undefined>(
      "link",
      { allowUnregistered: true }
    );

    const links = this.getRelationships(entryPoint);

    for (const rel of links) {
      const relatedKey = rel.source === entryPoint ? rel.target : rel.source;

      // Only resolve if the field is requested in the selector
      if (!variables[relatedKey]) continue;

      const relatedService = this.container.resolve<any>(
        `module:${relatedKey}`,
        { allowUnregistered: true }
      );

      const relatedSelector =
        typeof variables[relatedKey] === "object"
          ? (variables[relatedKey] as QueryFieldSelector)
          : {};

      for (const record of records) {
        const recordId = record["id"] as string | undefined;
        if (!recordId) {
          record[relatedKey] = [];
          continue;
        }

        // Use the Link instance to resolve edge IDs
        let relatedIds: string[] = [];

        if (link) {
          if (rel.source === entryPoint) {
            relatedIds = await link.getTargetIds(rel.linkId, recordId);
          } else {
            relatedIds = await link.getSourceIds(rel.linkId, recordId);
          }
        }

        if (relatedIds.length === 0 || !relatedService) {
          record[relatedKey] = [];
          continue;
        }

        // Fetch the related records by their IDs
        const relatedRecords = await this.fetchRelatedByIds(
          relatedService,
          relatedIds,
          relatedSelector
        );

        // Recursively resolve links for the child records
        const fullyResolvedRelated = await this.resolveLinks(
          relatedKey,
          relatedRecords,
          relatedSelector
        );

        record[relatedKey] = fullyResolvedRelated;
      }
    }

    return records;
  }

  private async fetchRelatedByIds(
    service: any,
    ids: string[],
    selector: QueryFieldSelector
  ): Promise<Record<string, unknown>[]> {
    if (!service || ids.length === 0) return [];

    // Try service methods that accept an ID list
    for (const method of ["listByIds", "findByIds", "findMany"]) {
      if (typeof service[method] === "function") {
        try {
          const result = await service[method](ids);
          const raw = Array.isArray(result) ? result : [];
          return Object.keys(selector).length > 0
            ? raw.map((r: Record<string, unknown>) => this.project(r, selector))
            : raw;
        } catch {
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
          ? raw.map((r: Record<string, unknown>) => this.project(r, selector))
          : raw;
      } catch {
        return [];
      }
    }

    return [];
  }
}

// ── createQuery factory ───────────────────────────────────────────────────────

export function createQuery(container: MinimalContainer): RemoteQuery {
  return new RemoteQuery(container);
}
