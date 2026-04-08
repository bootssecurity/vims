import { describe, expect, it, vi } from "vitest";
import { VimsMiddlewarePipeline, attachState, guard, requireAuth, requestLogger } from "./middleware-pipeline";
import type { VimsRequest, VimsResponse } from "./api-loader";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<VimsRequest> = {}): VimsRequest {
  return {
    method: "GET",
    path: "/test",
    params: {},
    query: {},
    body: {},
    headers: {},
    container: {},
    ...overrides,
  };
}

function makeRes(): VimsResponse & { _status: number; _body: unknown } {
  const res = {
    _status: 200,
    _body: undefined as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
    },
    send(body?: unknown) {
      res._body = body;
    },
    set(_field: string, _value: string) {
      return res;
    },
  };
  return res;
}

// ─── VimsMiddlewarePipeline ───────────────────────────────────────────────────

describe("VimsMiddlewarePipeline", () => {
  it("executes middleware in order and mutates shared state", async () => {
    const pipeline = new VimsMiddlewarePipeline()
      .use(async (ctx, next) => {
        ctx.state.step1 = true;
        await next();
      })
      .use(async (ctx, next) => {
        ctx.state.step2 = true;
        await next();
      });

    const state = await pipeline.execute(makeReq(), makeRes());
    expect(state.step1).toBe(true);
    expect(state.step2).toBe(true);
  });

  it("short-circuits when a middleware does not call next()", async () => {
    const step2 = vi.fn();

    const pipeline = new VimsMiddlewarePipeline()
      .use(async (_ctx, _next) => {
        // does not call next
      })
      .use(async (ctx, next) => {
        step2();
        await next();
      });

    await pipeline.execute(makeReq(), makeRes());
    expect(step2).not.toHaveBeenCalled();
  });

  it("merge() combines two pipelines into one ordered chain", async () => {
    const log: number[] = [];
    const p1 = new VimsMiddlewarePipeline().use(async (_ctx, next) => { log.push(1); await next(); });
    const p2 = new VimsMiddlewarePipeline().use(async (_ctx, next) => { log.push(2); await next(); });
    await p1.merge(p2).execute(makeReq(), makeRes());
    expect(log).toEqual([1, 2]);
  });

  it("length reflects the number of registered middlewares", () => {
    const p = new VimsMiddlewarePipeline()
      .use(async (_, next) => next())
      .use(async (_, next) => next());
    expect(p.length).toBe(2);
  });

  it("toHandler() produces a callable express-style handler", async () => {
    const pipeline = new VimsMiddlewarePipeline()
      .use(async (ctx, next) => {
        ctx.state.handled = true;
        await next();
      });

    const handler = pipeline.toHandler();
    const nextFn = vi.fn();
    handler(makeReq(), makeRes(), nextFn);
    // Allow microtask queue to flush
    await new Promise((r) => setTimeout(r, 0));
    expect(nextFn).toHaveBeenCalled();
  });

  it("useLazy() creates middleware from a builder function", async () => {
    const builder = (opts?: Record<string, unknown>) =>
      async (ctx: any, next: any) => {
        ctx.state.role = opts?.role;
        await next();
      };

    const pipeline = new VimsMiddlewarePipeline().useLazy(builder, { role: "admin" });
    const state = await pipeline.execute(makeReq(), makeRes());
    expect(state.role).toBe("admin");
  });
});

// ─── Built-in middleware factories ───────────────────────────────────────────

describe("attachState()", () => {
  it("attaches a value to ctx.state under the given key", async () => {
    const pipeline = new VimsMiddlewarePipeline().use(attachState("container", { ready: true }));
    const state = await pipeline.execute(makeReq(), makeRes());
    expect(state.container).toEqual({ ready: true });
  });
});

describe("guard()", () => {
  it("passes when predicate returns true", async () => {
    const next = vi.fn();
    const pipeline = new VimsMiddlewarePipeline()
      .use(guard(() => true))
      .use(async (_ctx, n) => { next(); await n(); });

    await pipeline.execute(makeReq(), makeRes());
    expect(next).toHaveBeenCalled();
  });

  it("blocks and returns 403 when predicate returns false", async () => {
    const next = vi.fn();
    const res = makeRes();
    const pipeline = new VimsMiddlewarePipeline()
      .use(guard(() => false, "Access denied"))
      .use(async (_ctx, n) => { next(); await n(); });

    await pipeline.execute(makeReq(), res);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
    expect(res._body).toEqual({ error: "Access denied" });
  });

  it("supports async predicates", async () => {
    const res = makeRes();
    const pipeline = new VimsMiddlewarePipeline()
      .use(guard(async () => Promise.resolve(false)));

    await pipeline.execute(makeReq(), res);
    expect(res._status).toBe(403);
  });
});

describe("requireAuth()", () => {
  it("allows through requests with a valid Bearer token", async () => {
    const next = vi.fn();
    const req = makeReq({ headers: { authorization: "Bearer my.jwt.token" } });
    const pipeline = new VimsMiddlewarePipeline()
      .use(requireAuth())
      .use(async (_ctx, n) => { next(); await n(); });

    await pipeline.execute(req, makeRes());
    expect(next).toHaveBeenCalled();
    // Attaches auth_context to request
    expect(req.auth_context).toEqual({ token: "my.jwt.token" });
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = makeRes();
    await new VimsMiddlewarePipeline()
      .use(requireAuth())
      .execute(makeReq(), res);

    expect(res._status).toBe(401);
    expect((res._body as any).type).toBe("unauthorized");
  });

  it("returns 401 when Authorization header does not start with Bearer", async () => {
    const res = makeRes();
    const req = makeReq({ headers: { authorization: "Basic dXNlcjpwYXNz" } });
    await new VimsMiddlewarePipeline()
      .use(requireAuth())
      .execute(req, res);

    expect(res._status).toBe(401);
  });
});

describe("requestLogger()", () => {
  it("calls next and writes to stdout", async () => {
    const written: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (buf: any) => { written.push(typeof buf === "string" ? buf : buf.toString()); return true; };

    await new VimsMiddlewarePipeline()
      .use(requestLogger())
      .execute(makeReq({ method: "GET", path: "/ping" }), makeRes());

    process.stdout.write = originalWrite;
    expect(written.some((line) => line.includes("GET") && line.includes("/ping"))).toBe(true);
  });
});
