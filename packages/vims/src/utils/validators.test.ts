import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validateBody, validateQuery } from "./validators";

describe("Zod Validators Middleware", () => {
  it("validates body and calls next on success", async () => {
    const schema = z.object({ id: z.number() });
    const middleware = validateBody(schema);
    
    const req = { body: { id: 123 } } as any;
    const res = {} as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ id: 123 });
  });

  it("returns 400 with errors on body validation failure", async () => {
    const schema = z.object({ id: z.number() });
    const middleware = validateBody(schema);
    
    const jsonFn = vi.fn();
    const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    const req = { body: { id: "wrong" } } as any;
    const res = { status: statusFn } as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
      type: "invalid_request_error",
      errors: expect.any(Array)
    }));
  });

  it("validates query and casts output", async () => {
    const schema = z.object({
      active: z.enum(["true", "false"]).transform(v => v === "true")
    });
    const middleware = validateQuery(schema);
    
    const req = { query: { active: "true" } } as any;
    const res = {} as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query.active).toBe(true);
  });
});
