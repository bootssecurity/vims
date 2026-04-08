// ── VimsMiddlewarePipeline ────────────────────────────────────────────────────
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
export class VimsMiddlewarePipeline {
    constructor() {
        this.stack = [];
    }
    /**
     * Add a middleware to the pipeline.
     */
    use(middleware) {
        this.stack.push(middleware);
        return this;
    }
    /**
     * Add a lazily-constructed middleware from a builder function.
     */
    useLazy(builder, options) {
        this.stack.push(builder(options));
        return this;
    }
    /**
     * Merge another pipeline's middleware stack into this one.
     */
    merge(other) {
        this.stack.push(...other.stack);
        return this;
    }
    /**
     * Execute the pipeline against a request/response pair.
     * Returns the final shared state for inspection in tests.
     */
    async execute(req, res) {
        const ctx = { req, res, state: {} };
        await this.run(ctx, 0);
        return ctx.state;
    }
    /**
     * Convert this pipeline to an Express/Hono-compatible handler function.
     */
    toHandler() {
        return (req, res, next) => {
            this.execute(req, res)
                .then(() => next === null || next === void 0 ? void 0 : next())
                .catch((err) => next === null || next === void 0 ? void 0 : next(err));
        };
    }
    /**
     * Convert this pipeline to an array of `VimsMiddlewareHandler` functions
     * for direct use with `ApiLoader` route registration.
     */
    toMiddlewareArray() {
        return this.stack.map((mw) => {
            return (req, res, next) => {
                const ctx = { req, res, state: {} };
                mw(ctx, async () => { next(); })
                    .catch((err) => next(err));
            };
        });
    }
    get length() {
        return this.stack.length;
    }
    // ── Private ─────────────────────────────────────────────────────────────────
    async run(ctx, index) {
        if (index >= this.stack.length)
            return;
        const current = this.stack[index];
        await current(ctx, () => this.run(ctx, index + 1));
    }
}
// ── Built-in middleware factories ─────────────────────────────────────────────
/**
 * Logs the method and path of every request to stdout.
 */
export function requestLogger() {
    return async (ctx, next) => {
        var _a;
        const start = Date.now();
        await next();
        const duration = Date.now() - start;
        process.stdout.write(`[vims] ${(_a = ctx.req.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${ctx.req.path} ${duration}ms\n`);
    };
}
/**
 * Attaches a value to the request state.
 * Useful for injecting the DI container, tenant context, etc.
 */
export function attachState(key, value) {
    return async (ctx, next) => {
        ctx.state[key] = value;
        await next();
    };
}
/**
 * Blocks requests from proceeding unless a condition is met.
 * Returns a 403 response if the guard fails.
 */
export function guard(predicate, message = "Forbidden") {
    return async (ctx, next) => {
        const allowed = await Promise.resolve(predicate(ctx));
        if (!allowed) {
            ctx.res.status(403).json({ error: message });
            return;
        }
        await next();
    };
}
