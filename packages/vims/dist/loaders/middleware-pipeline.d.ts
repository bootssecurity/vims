import type { VimsRequest, VimsResponse, VimsMiddlewareHandler } from "./api-loader";
export type PipelineContext = {
    req: VimsRequest;
    res: VimsResponse;
    state: Record<string, unknown>;
};
export type PipelineMiddleware = (ctx: PipelineContext, next: () => Promise<void>) => Promise<void>;
export type MiddlewareBuilderFn = (options?: Record<string, unknown>) => PipelineMiddleware;
/**
 * VimsMiddlewarePipeline
 *
 * A composable request middleware pipeline. Middleware functions receive a
 * shared context object (request, response, and a mutable `state` bag) and
 * a `next()` function to continue the chain.
 *
 * It converts the chain into a single Express/Hono-compatible handler via
 * `toHandler()` so it can be registered on any `VimsRouter`.
 *
 * Usage:
 * ```ts
 * const pipeline = new VimsMiddlewarePipeline()
 *   .use(authMiddleware)
 *   .use(rateLimitMiddleware({ rpm: 60 }))
 *   .use(validationMiddleware(schema));
 *
 * router.get("/admin/products", pipeline.toHandler());
 * ```
 *
 * Lazy middleware (created from a builder):
 * ```ts
 * pipeline.useLazy(authBuilder, { role: "admin" });
 * ```
 */
export declare class VimsMiddlewarePipeline {
    private readonly stack;
    /**
     * Add a middleware to the pipeline.
     */
    use(middleware: PipelineMiddleware): this;
    /**
     * Add a lazily-constructed middleware from a builder function.
     */
    useLazy(builder: MiddlewareBuilderFn, options?: Record<string, unknown>): this;
    /**
     * Merge another pipeline's middleware stack into this one.
     */
    merge(other: VimsMiddlewarePipeline): this;
    /**
     * Execute the pipeline against a request/response pair.
     * Returns the final shared state for inspection in tests.
     */
    execute(req: VimsRequest, res: VimsResponse): Promise<Record<string, unknown>>;
    /**
     * Convert this pipeline to an Express/Hono-compatible handler function.
     */
    toHandler(): (req: VimsRequest, res: VimsResponse, next?: (err?: unknown) => void) => void;
    /**
     * Convert this pipeline to an array of `VimsMiddlewareHandler` functions
     * for direct use with `ApiLoader` route registration.
     */
    toMiddlewareArray(): VimsMiddlewareHandler[];
    get length(): number;
    private run;
}
/**
 * Logs the method and path of every request to stdout.
 */
export declare function requestLogger(): PipelineMiddleware;
/**
 * Attaches a value to the request state.
 * Useful for injecting the DI container, tenant context, etc.
 */
export declare function attachState(key: string, value: unknown): PipelineMiddleware;
/**
 * Blocks requests from proceeding unless a condition is met.
 * Returns a 403 response if the guard fails.
 */
export declare function guard(predicate: (ctx: PipelineContext) => boolean | Promise<boolean>, message?: string): PipelineMiddleware;
