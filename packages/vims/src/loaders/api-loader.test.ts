import { describe, expect, it, vi } from "vitest";
import { ApiLoader } from "./api-loader";
import type { VimsRequest, VimsResponse } from "./api-loader";
import { join } from "path";
import { mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRouter() {
  const registered: Array<{ method: string; path: string; handlers: unknown[] }> = [];

  const router: Record<string, (...args: unknown[]) => void> = {};
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    router[method] = (path: unknown, ...handlers: unknown[]) => {
      registered.push({ method, path: path as string, handlers });
    };
  }

  return { router, registered };
}

function makeLogger() {
  const messages: string[] = [];
  return {
    info: (msg: string) => { messages.push(`info:${msg}`); },
    warn: (msg: string) => { messages.push(`warn:${msg}`); },
    error: (msg: string) => { messages.push(`error:${msg}`); },
    messages,
  };
}

async function makeTmpRouteDir(base: string, routes: Record<string, string>) {
  await mkdir(base, { recursive: true });
  for (const [relPath, content] of Object.entries(routes)) {
    const full = join(base, relPath);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, content, "utf-8");
  }
  return base;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ApiLoader — route scanning", () => {
  it("loads no routes when the source directory does not exist", async () => {
    const { router, registered } = makeRouter();
    const loader = new ApiLoader({
      sourceDirs: ["/non/existent/directory"],
      router,
    });
    await loader.load();
    expect(registered).toHaveLength(0);
    expect(loader.getRoutes()).toHaveLength(0);
  });

  it("registers routes from a real route.mjs file", async () => {
    const base = join(__dirname, `.tmp-api-loader-test-${Date.now()}`);
    await makeTmpRouteDir(base, {
      "admin/tenants/route.mjs": `
        export const GET = async (req, res) => { res.json({ tenants: [] }); };
        export const POST = async (req, res) => { res.status(201).json({ id: "t_1" }); };
      `,
    });

    const { router, registered } = makeRouter();
    const loader = new ApiLoader({ sourceDirs: [base], router });
    await loader.load();

    await rm(base, { recursive: true, force: true });

    const paths = registered.map((r) => `${r.method}:${r.path}`);
    expect(paths).toContain("get:/admin/tenants");
    expect(paths).toContain("post:/admin/tenants");
  });

  it("maps [id] directory segments to Express :id params", async () => {
    const base = join(__dirname, `.tmp-api-loader-params-${Date.now()}`);
    await makeTmpRouteDir(base, {
      "admin/tenants/[id]/route.mjs": `
        export const GET = async (req, res) => { res.json({}); };
        export const DELETE = async (req, res) => { res.status(204).send(); };
      `,
    });

    const { router, registered } = makeRouter();
    const loader = new ApiLoader({ sourceDirs: [base], router });
    await loader.load();

    await rm(base, { recursive: true, force: true });

    const paths = registered.map((r) => r.path);
    expect(paths).toContain("/admin/tenants/:id");
  });

  it("sorts static routes before dynamic :param routes", async () => {
    const base = join(__dirname, `.tmp-api-loader-sort-${Date.now()}`);
    await makeTmpRouteDir(base, {
      "admin/tenants/[id]/route.mjs": `export const GET = async (req, res) => res.json({});`,
      "admin/tenants/count/route.mjs": `export const GET = async (req, res) => res.json({ count: 0 });`,
    });

    const { router, registered } = makeRouter();
    const loader = new ApiLoader({ sourceDirs: [base], router });
    await loader.load();

    await rm(base, { recursive: true, force: true });

    const paths = registered.map((r) => r.path);
    const staticIdx = paths.indexOf("/admin/tenants/count");
    const dynamicIdx = paths.indexOf("/admin/tenants/:id");
    expect(staticIdx).toBeLessThan(dynamicIdx);
  });

  it("ignores non-route.mjs files", async () => {
    const base = join(__dirname, `.tmp-api-loader-ignore-${Date.now()}`);
    await makeTmpRouteDir(base, {
      "admin/helper.mjs": `export const GET = async (req, res) => res.json({});`,
      "admin/route.mjs": `export const GET = async (req, res) => res.json({});`,
    });

    const { router, registered } = makeRouter();
    const loader = new ApiLoader({ sourceDirs: [base], router });
    await loader.load();

    await rm(base, { recursive: true, force: true });

    // Only the route.ts at /admin should be picked up
    expect(registered.every((r) => r.path === "/admin")).toBe(true);
  });

  it("ignores exports that are not valid HTTP methods", async () => {
    const base = join(__dirname, `.tmp-api-loader-methods-${Date.now()}`);
    await makeTmpRouteDir(base, {
      "store/products/route.mjs": `
        export const GET = async (req, res) => res.json({});
        export const HELPER = "not a handler";
        export const config = { auth: false };
      `,
    });

    const { router, registered } = makeRouter();
    const loader = new ApiLoader({ sourceDirs: [base], router });
    await loader.load();

    await rm(base, { recursive: true, force: true });

    expect(registered).toHaveLength(1);
    expect(registered[0].method).toBe("get");
  });

  it("works without a router (preview-only mode)", async () => {
    const loader = new ApiLoader({ sourceDirs: ["/non/existent"] });
    await expect(loader.load()).resolves.toBeUndefined();
    expect(loader.getRoutes()).toHaveLength(0);
  });

  it("logs route count via logger.info after load", async () => {
    const logger = makeLogger();
    const loader = new ApiLoader({ sourceDirs: ["/non/existent"], logger });
    await loader.load();
    expect(logger.messages.some((m) => m.includes("api.loader.loaded"))).toBe(true);
  });
});
