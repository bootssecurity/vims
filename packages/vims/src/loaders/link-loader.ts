import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
import type { VimsLinkRegistration } from "@vims/modules-sdk";

/**
 * LinkLoader
 *
 * File-system scanner that discovers and loads link definition modules from
 * one or more `links/` directories, registering them in `VimsLinkRegistry`.
 *
 * Link file shape:
 * ```ts
 * // src/links/crm-inventory.ts
 * import { createModuleLink } from "@vims/modules-sdk";
 *
 * export default createModuleLink({
 *   source: "crm",
 *   target: "inventory",
 *   sourceKey: "deal_id",
 *   targetKey: "product_id",
 *   relationship: "one-to-many",
 *   deleteCascade: true,
 * });
 * ```
 *
 * Usage:
 * ```ts
 * const loader = new LinkLoader([join(cwd, "src/links")]);
 * await loader.load();
 * console.log(loader.getLinks()); // all registered VimsLinkRegistrations
 * ```
 */
export class LinkLoader {
  private readonly sourcePaths: string[];
  private readonly links: VimsLinkRegistration[] = [];
  private readonly logger?: {
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
  };

  constructor(
    sourcePaths: string[],
    logger?: LinkLoader["logger"]
  ) {
    this.sourcePaths = sourcePaths;
    this.logger = logger;
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  async load(): Promise<void> {
    await this.scanAll();
    this.logger?.info(`link.loader.loaded`, { count: this.links.length });
  }

  getLinks(): VimsLinkRegistration[] {
    return [...this.links];
  }

  /**
   * Returns all links where the given module is either source or target.
   * Useful for building per-module relationship maps.
   */
  getLinksFor(moduleKey: string): VimsLinkRegistration[] {
    return this.links.filter(
      (link) => link.source === moduleKey || link.target === moduleKey
    );
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async scanAll(): Promise<void> {
    await Promise.allSettled(this.sourcePaths.map((p) => this.scanDir(p)));
  }

  private async scanDir(dir: string): Promise<void> {
    let entries: string[];

    try {
      entries = await readdir(dir);
    } catch {
      return; // missing dir is not an error
    }

    const validExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);

    await Promise.all(
      entries.map(async (entry) => {
        if (!validExtensions.has(extname(entry))) return;
        if (
          entry.endsWith(".test.ts") ||
          entry.endsWith(".spec.ts") ||
          entry.endsWith(".d.ts")
        )
          return;

        const fullPath = join(dir, entry);

        try {
          const fileStat = await stat(fullPath);
          if (!fileStat.isFile()) return;

          const mod = await import(fullPath);
          const link = mod.default as VimsLinkRegistration | undefined;

          if (!link) return;

          // Validate minimal shape
          if (!link.source || !link.target || !link.relationship) {
            this.logger?.warn(`link.loader.invalid`, { path: fullPath });
            return;
          }

          // Avoid duplicates (same file loaded twice in hot-reload scenarios)
          const alreadyLoaded = this.links.some(
            (l) => l.linkId === link.linkId
          );
          if (!alreadyLoaded) {
            this.links.push(link);
          }
        } catch {
          this.logger?.warn(`link.loader.import.failed`, { path: fullPath });
        }
      })
    );
  }
}
