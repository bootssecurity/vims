import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { validateBody, validateQuery } from "./validators";
import type { VimsRequest, VimsResponse } from "../loaders/api-loader";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {
    _status: 200 as number,
    _body: undefined as unknown,
    status(code: number) { res._status = code; return res; },
    json(body: unknown) { res._body = body; },
    send(body?: unknown) { res._body = body; },
    set(_field: string, _value: string) { return res; },
  };
  return res as VimsResponse & { _status: number; _body: unknown };
}

function makeReq(overrides: Partial<VimsRequest> = {}): VimsRequest {
  return {
    method: "POST", path: "/test", params: {}, query: {}, body: {},
    headers: {}, container: {}, ...overrides,
  };
}

// ─── validateBody ─────────────────────────────────────────────────────────────

describe("validateBody()", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it("passes valid body and calls next()", async () => {
    const req = makeReq({ body: { name: "Alice", age: 30 } });
    const res = makeRes();
    const next = vi.fn();

    await validateBody(schema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // called with no args = success
    expect(req.body).toEqual({ name: "Alice", age: 30 }); // body replaced with parsed value
  });

  it("returns 400 with structured errors for invalid body", async () => {
    const req = makeReq({ body: { name: "", age: -5 } });
    const res = makeRes();
    const next = vi.fn();

    await validateBody(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect((res._body as any).type).toBe("invalid_request_error");
    expect((res._body as any).message).toBe("Invalid request payload");
    expect(Array.isArray((res._body as any).errors)).toBe(true);
    expect((res._body as any).errors.length).toBeGreaterThan(0);
  });

  it("returns 400 when body is missing required fields", async () => {
    const req = makeReq({ body: {} });
    const res = makeRes();
    const next = vi.fn();

    await validateBody(schema)(req, res, next);

    expect(res._status).toBe(400);
    const body = res._body as any;
    expect(body.errors.some((e: any) => e.path.includes("name"))).toBe(true);
    expect(body.errors.some((e: any) => e.path.includes("age"))).toBe(true);
  });

  it("calls next(err) for non-Zod errors", async () => {
    const throwingSchema = z.object({}).transform(() => { throw new Error("unexpected"); });
    const req = makeReq({ body: {} });
    const res = makeRes();
    const next = vi.fn();

    await validateBody(throwingSchema)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("strips unknown fields when schema uses .strict()", async () => {
    const strictSchema = z.object({ name: z.string() }).strict();
    const req = makeReq({ body: { name: "Bob", extra: "unwanted" } });
    const res = makeRes();
    const next = vi.fn();

    await validateBody(strictSchema)(req, res, next);

    // strict() rejects unknown keys → 400
    expect(res._status).toBe(400);
  });

  it("coerces types when schema uses z.coerce", async () => {
    const coerceSchema = z.object({ count: z.coerce.number() });
    const req = makeReq({ body: { count: "42" } }); // string "42" coerced to number
    const res = makeRes();
    const next = vi.fn();

    await validateBody(coerceSchema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req.body as any).count).toBe(42);
  });
});

// ─── validateQuery ────────────────────────────────────────────────────────────

describe("validateQuery()", () => {
  const schema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().max(100).default(20),
    status: z.enum(["active", "inactive"]).optional(),
  });

  it("passes valid query and calls next()", async () => {
    const req = makeReq({ query: { page: "2", limit: "10", status: "active" } });
    const res = makeRes();
    const next = vi.fn();

    await validateQuery(schema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req.query as any).page).toBe(2);
    expect((req.query as any).limit).toBe(10);
    expect((req.query as any).status).toBe("active");
  });

  it("applies defaults for missing optional query params", async () => {
    const req = makeReq({ query: {} });
    const res = makeRes();
    const next = vi.fn();

    await validateQuery(schema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req.query as any).page).toBe(1);
    expect((req.query as any).limit).toBe(20);
  });

  it("returns 400 for invalid query params", async () => {
    const req = makeReq({ query: { limit: "999" } }); // exceeds max(100)
    const res = makeRes();
    const next = vi.fn();

    await validateQuery(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect((res._body as any).type).toBe("invalid_request_error");
    expect((res._body as any).message).toBe("Invalid request parameters");
  });

  it("returns 400 for invalid enum value", async () => {
    const req = makeReq({ query: { status: "deleted" } });
    const res = makeRes();
    const next = vi.fn();

    await validateQuery(schema)(req, res, next);

    expect(res._status).toBe(400);
  });
});
