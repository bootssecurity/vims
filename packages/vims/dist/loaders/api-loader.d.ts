export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";
export type VimsRouteHandler = (req: VimsRequest, res: VimsResponse, next?: (err?: unknown) => void) => void | Promise<void>;
export type VimsMiddlewareHandler = (req: VimsRequest, res: VimsResponse, next: (err?: unknown) => void) => void | Promise<void>;
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
    [method in HttpMethod]?: (path: string, ...handlers: any[]) => void;
};
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
export declare class ApiLoader {
    private readonly sourceDirs;
    private readonly router?;
    private readonly routes;
    private readonly logger?;
    constructor(opts: {
        sourceDirs: string[];
        router?: VimsRouter;
        logger?: ApiLoader["logger"];
    });
    load(): Promise<void>;
    getRoutes(): LoadedVimsRoute[];
    private scanDir;
    private loadRouteFile;
    private register;
}
