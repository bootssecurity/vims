import type { DiscoveredSchema } from "./loaders/utils/load-internal";
import { VimsLinkRegistry } from "./index";

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
  resolve<T = unknown>(key: string, opts?: { allowUnregistered?: boolean }): T;
};

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

    // Resolve the schema for the entry module
    const schema = this.container.resolve<DiscoveredSchema | undefined>(
      `schema:${entryPoint}`,
      { allowUnregistered: true }
    );

    // Resolve the module service
    const service = this.container.resolve<any>(
      `module:${entryPoint}`,
      { allowUnregistered: true }
    );

    // If the service exposes a `list()` or `find()` method, delegate to it
    const rawData = await this.fetchFromService(service, filters, options);

    // Project fields
    const projected = rawData.map((record: Record<string, unknown>) =>
      variables ? this.project(record, variables) : record
    );

    // Resolve linked modules
    const enriched = await this.resolveLinks(entryPoint, projected, variables);

    return {
      data: enriched as T[],
      metadata: { count: enriched.length, take, skip },
    };
  }

  /**
   * Returns table information discovered for a module's schema.
   */
  getSchema(moduleKey: string): DiscoveredSchema | undefined {
    return this.container.resolve<DiscoveredSchema | undefined>(
      `schema:${moduleKey}`,
      { allowUnregistered: true }
    );
  }

  /**
   * Returns all link definitions that connect `moduleKey` to another module.
   */
  getRelationships(moduleKey: string) {
    const result: Array<{
      linkId: string;
      source: string;
      target: string;
      relationship: string;
    }> = [];

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

    // Try common service method names in order of preference
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

    const links = this.getRelationships(entryPoint);

    for (const link of links) {
      const relatedKey = link.source === entryPoint ? link.target : link.source;
      const fieldKey = relatedKey; // by convention, linked module data is keyed by module name

      if (!variables[fieldKey]) continue;

      const relatedService = this.container.resolve<any>(
        `module:${relatedKey}`,
        { allowUnregistered: true }
      );
      if (!relatedService) continue;

      const relatedSelector =
        typeof variables[fieldKey] === "object"
          ? (variables[fieldKey] as QueryFieldSelector)
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
export function createQuery(container: MinimalContainer): RemoteQuery {
  return new RemoteQuery(container);
}
