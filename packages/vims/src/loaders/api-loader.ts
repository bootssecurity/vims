import { readdir, stat } from "fs/promises";
import { join, extname, relative } from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

export type VimsRouteHandler = (
  req: VimsRequest,
  res: VimsResponse,
  next?: (err?: unknown) => void
) => void | Promise<void>;

export type VimsMiddlewareHandler = (
  req: VimsRequest,
  res: VimsResponse,
  next: (err?: unknown) => void
) => void | Promise<void>;

export type VimsRequest = {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  container: unknown;
  [key: string]: unknown;
};

export type VimsResponse = {
  status(code: number): VimsResponse;
  json(body: unknown): void;
  send(body?: unknown): void;
  set(field: string, value: string): VimsResponse;
  [key: string]: unknown;
};

/**
 * Single-method route definition — exported as named export `GET`, `POST` etc.
 */
export type VimsRouteConfig = {
  /** The route handler function */
  handler: VimsRouteHandler;
  /** Optional middleware applied before this handler */
  middlewares?: VimsMiddlewareHandler[];
};

/**
 * A loaded route entry after scanning.
 */
export type LoadedVimsRoute = {
  /** URL path derived from the file's directory structure */
  path: string;
  method: HttpMethod;
  handler: VimsRouteHandler;
  middlewares: VimsMiddlewareHandler[];
  sourcePath: string;
};

/**
 * A minimal abstraction of an HTTP router that `ApiLoader` registers routes on.
 * Implemented by any framework adapter (Hono, Express, Fastify …).
 */
export type VimsRouter = {
  [method in HttpMethod]?: (
    path: string,
    ...handlers: any[]
  ) => void;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete", "options", "head"];
const METHOD_EXPORT_NAMES = new Set(HTTP_METHODS.map((m) => m.toUpperCase()));

// ── ApiLoader ─────────────────────────────────────────────────────────────────

/**
 * ApiLoader
 *
 * File-system route scanner that discovers route modules and registers them
 * on a router.
 *
 * Convention — directory layout → URL path:
 * ```
 * src/api/
 *   admin/
 *     products/
 *       route.ts     →  GET|POST /admin/products
 *       [id]/
 *         route.ts   →  GET|PUT|DELETE /admin/products/:id
 *   store/
 *     products/
 *       route.ts     →  GET /store/products
 * ```
 *
 * Route file shape:
 * ```ts
 * // src/api/admin/products/route.ts
 * import type { VimsRouteHandler } from "@vims/vims";
 *
 * export const GET: VimsRouteHandler = async (req, res) => {
 *   res.json({ products: [] });
 * };
 *
 * export const POST: VimsRouteHandler = async (req, res) => {
 *   res.status(201).json({ product: {} });
 * };
 * ```
 *
 * Usage:
 * ```ts
 * const loader = new ApiLoader({ sourceDirs: [join(cwd, "src/api")], router });
 * await loader.load();
 * ```
 */
export class ApiLoader {
  private readonly sourceDirs: string[];
  private readonly router?: VimsRouter;
  private readonly routes: LoadedVimsRoute[] = [];
  private readonly logger?: {
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
  };

  constructor(opts: {
    sourceDirs: string[];
    router?: VimsRouter;
    logger?: ApiLoader["logger"];
  }) {
    this.sourceDirs = opts.sourceDirs;
    this.router = opts.router;
    this.logger = opts.logger;
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  async load(): Promise<void> {
    for (const sourceDir of this.sourceDirs) {
      await this.scanDir(sourceDir, sourceDir);
    }

    this.register();
    this.logger?.info("api.loader.loaded", { routeCount: this.routes.length });
  }

  getRoutes(): LoadedVimsRoute[] {
    return [...this.routes];
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async scanDir(rootDir: string, currentDir: string): Promise<void> {
    let entries: string[];

    try {
      entries = await readdir(currentDir);
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(currentDir, entry);

        try {
          const fileStat = await stat(fullPath);

          if (fileStat.isDirectory()) {
            await this.scanDir(rootDir, fullPath);
            return;
          }

          if (!fileStat.isFile()) return;

          // Only process route files
          const basename = entry.replace(/\.[^.]+$/, "");
          if (basename !== "route") return;
          if (![".ts", ".js", ".mjs"].includes(extname(entry))) return;

          await this.loadRouteFile(rootDir, fullPath);
        } catch {
          this.logger?.warn("api.loader.scan.error", { path: fullPath });
        }
      })
    );
  }

  private async loadRouteFile(rootDir: string, filePath: string): Promise<void> {
    try {
      const mod = await import(filePath);

      // Derive URL path from the directory structure relative to rootDir
      // e.g. rootDir = /src/api, filePath = /src/api/admin/products/route.ts
      //    → relativeDirParts = ["admin", "products"]
      //    → urlPath = /admin/products
      const relativeDir = relative(rootDir, filePath).replace(/[/\\][^/\\]+$/, ""); // strip filename
      const urlParts = relativeDir
        .split(/[/\\]/)
        .map((part) => part.replace(/^\[(.+)\]$/, ":$1")); // [id] → :id

      const urlPath = "/" + urlParts.filter(Boolean).join("/");

      for (const methodName of Object.keys(mod)) {
        if (!METHOD_EXPORT_NAMES.has(methodName)) continue;

        const method = methodName.toLowerCase() as HttpMethod;
        const handler = mod[methodName] as VimsRouteHandler;

        if (typeof handler !== "function") continue;

        this.routes.push({
          path: urlPath,
          method,
          handler,
          middlewares: [],
          sourcePath: filePath,
        });
      }
    } catch {
      this.logger?.error("api.loader.import.failed", { path: filePath });
    }
  }

  private register(): void {
    if (!this.router) return;

    for (const route of this.routes) {
      const routerMethod = this.router[route.method];
      if (typeof routerMethod === "function") {
        routerMethod.call(this.router, route.path, ...route.middlewares, route.handler);
      }
    }
  }
}
