import type { VimsRequest, VimsResponse, VimsMiddlewareHandler } from "./api-loader";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PipelineContext = {
  req: VimsRequest;
  res: VimsResponse;
  state: Record<string, unknown>;
};

export type PipelineMiddleware = (
  ctx: PipelineContext,
  next: () => Promise<void>
) => Promise<void>;

export type MiddlewareBuilderFn = (options?: Record<string, unknown>) => PipelineMiddleware;

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
  private readonly stack: PipelineMiddleware[] = [];

  /**
   * Add a middleware to the pipeline.
   */
  use(middleware: PipelineMiddleware): this {
    this.stack.push(middleware);
    return this;
  }

  /**
   * Add a lazily-constructed middleware from a builder function.
   */
  useLazy(builder: MiddlewareBuilderFn, options?: Record<string, unknown>): this {
    this.stack.push(builder(options));
    return this;
  }

  /**
   * Merge another pipeline's middleware stack into this one.
   */
  merge(other: VimsMiddlewarePipeline): this {
    this.stack.push(...other.stack);
    return this;
  }

  /**
   * Execute the pipeline against a request/response pair.
   * Returns the final shared state for inspection in tests.
   */
  async execute(req: VimsRequest, res: VimsResponse): Promise<Record<string, unknown>> {
    const ctx: PipelineContext = { req, res, state: {} };
    await this.run(ctx, 0);
    return ctx.state;
  }

  /**
   * Convert this pipeline to an Express/Hono-compatible handler function.
   */
  toHandler(): (req: VimsRequest, res: VimsResponse, next?: (err?: unknown) => void) => void {
    return (req, res, next) => {
      this.execute(req, res)
        .then(() => next?.())
        .catch((err) => next?.(err));
    };
  }

  /**
   * Convert this pipeline to an array of `VimsMiddlewareHandler` functions
   * for direct use with `ApiLoader` route registration.
   */
  toMiddlewareArray(): VimsMiddlewareHandler[] {
    return this.stack.map((mw) => {
      return (req: VimsRequest, res: VimsResponse, next: (err?: unknown) => void) => {
        const ctx: PipelineContext = { req, res, state: {} };
        mw(ctx, async () => { next(); })
          .catch((err) => next(err));
      };
    });
  }

  get length(): number {
    return this.stack.length;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async run(ctx: PipelineContext, index: number): Promise<void> {
    if (index >= this.stack.length) return;
    const current = this.stack[index];
    await current(ctx, () => this.run(ctx, index + 1));
  }
}

// ── Built-in middleware factories ─────────────────────────────────────────────

/**
 * Logs the method and path of every request to stdout.
 */
export function requestLogger(): PipelineMiddleware {
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    process.stdout.write(`[vims] ${ctx.req.method?.toUpperCase()} ${ctx.req.path} ${duration}ms\n`);
  };
}

/**
 * Attaches a value to the request state.
 * Useful for injecting the DI container, tenant context, etc.
 */
export function attachState(key: string, value: unknown): PipelineMiddleware {
  return async (ctx, next) => {
    ctx.state[key] = value;
    await next();
  };
}

/**
 * Blocks requests from proceeding unless a condition is met.
 * Returns a 403 response if the guard fails.
 */
export function guard(
  predicate: (ctx: PipelineContext) => boolean | Promise<boolean>,
  message = "Forbidden"
): PipelineMiddleware {
  return async (ctx, next) => {
    const allowed = await Promise.resolve(predicate(ctx));
    if (!allowed) {
      ctx.res.status(403).json({ error: message });
      return;
    }
    await next();
  };
}
