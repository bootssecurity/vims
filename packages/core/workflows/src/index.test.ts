import { describe, expect, it } from "vitest";
import { defineWorkflow } from "./index";

describe("defineWorkflow", () => {
  it("runs steps in sequence and passes context forward", async () => {
    const wf = defineWorkflow<{ value: number }>("pipeline", [
      { name: "add-ten", run: (ctx) => ({ ...ctx, value: ctx.value + 10 }) },
      { name: "double", run: (ctx) => ({ ...ctx, value: ctx.value * 2 }) },
    ]);

    const result = await wf.run({ value: 5 });
    expect(result.value).toBe(30); // (5 + 10) * 2
  });

  it("returns the initial context unchanged when there are no steps", async () => {
    const wf = defineWorkflow<{ ready: boolean }>("empty", []);
    const result = await wf.run({ ready: false });
    expect(result.ready).toBe(false);
  });

  it("exposes workflow name and steps", () => {
    const steps = [
      { name: "step-a", run: async (ctx: any) => ctx },
      { name: "step-b", run: async (ctx: any) => ctx },
    ];
    const wf = defineWorkflow("my-workflow", steps);
    expect(wf.name).toBe("my-workflow");
    expect(wf.steps).toHaveLength(2);
    expect(wf.steps[0].name).toBe("step-a");
  });

  it("supports async step functions", async () => {
    const wf = defineWorkflow<{ items: string[] }>("async-pipeline", [
      {
        name: "fetch",
        run: async (ctx) => {
          await new Promise((r) => setTimeout(r, 1));
          return { ...ctx, items: [...ctx.items, "fetched"] };
        },
      },
      {
        name: "transform",
        run: async (ctx) => ({
          ...ctx,
          items: ctx.items.map((i) => i.toUpperCase()),
        }),
      },
    ]);

    const result = await wf.run({ items: [] });
    expect(result.items).toEqual(["FETCHED"]);
  });

  it("propagates errors from a failing step", async () => {
    const wf = defineWorkflow<{ v: number }>("failing", [
      { name: "boom", run: () => { throw new Error("step failed"); } },
    ]);
    await expect(wf.run({ v: 1 })).rejects.toThrow("step failed");
  });

  it("stops execution after a step throws — does not run subsequent steps", async () => {
    const ran: string[] = [];
    const wf = defineWorkflow<Record<string, never>>("abort-on-error", [
      { name: "step-1", run: (ctx) => { ran.push("step-1"); return ctx; } },
      { name: "step-2", run: () => { throw new Error("abort"); } },
      { name: "step-3", run: (ctx) => { ran.push("step-3"); return ctx; } },
    ]);

    await wf.run({}).catch(() => {});
    expect(ran).toEqual(["step-1"]);
    expect(ran).not.toContain("step-3");
  });

  it("mutates context correctly across multiple steps", async () => {
    type Ctx = { log: string[] };
    const wf = defineWorkflow<Ctx>("log-pipeline", [
      { name: "a", run: (ctx) => ({ log: [...ctx.log, "a"] }) },
      { name: "b", run: (ctx) => ({ log: [...ctx.log, "b"] }) },
      { name: "c", run: (ctx) => ({ log: [...ctx.log, "c"] }) },
    ]);

    const result = await wf.run({ log: [] });
    expect(result.log).toEqual(["a", "b", "c"]);
  });
});
