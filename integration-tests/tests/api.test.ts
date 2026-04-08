import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { setupServer } from "../helpers/setup-server";
import { resetDatabase } from "../helpers/use-db";

let app: any;
let vims: any;

describe("Architecture Parity: API & DB Routing", () => {
  beforeAll(async () => {
    await resetDatabase("vims_test_api");
    const internals = await setupServer("vims_test_api");
    app = internals.app;
    vims = internals.vims;
  });

  afterAll(async () => {
    if (vims) {
      await vims.shutdown();
    }
  });

  it("injects MikroORM request context scopes into Express endpoints", async () => {
    const response = await request(app).get("/health");
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      hasManager: true, // Proves ApiLoader dynamically injected req.container and resolved it
    });
  });
});
