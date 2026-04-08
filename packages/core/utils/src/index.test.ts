import { describe, expect, it } from "vitest";
import { formatNumber } from "./index";
import { parseCorsOrigins, isCorsAllowed, buildCorsOrigins } from "./cors";
import { handlePostgresError } from "./database";

// ── parseCorsOrigins ──────────────────────────────────────────────────────────

describe("parseCorsOrigins()", () => {
  it("parses a single origin", () => {
    expect(parseCorsOrigins("http://localhost:7000")).toEqual(["http://localhost:7000"]);
  });

  it("parses multiple comma-separated origins", () => {
    expect(parseCorsOrigins("http://localhost:7000,http://localhost:7001")).toEqual([
      "http://localhost:7000",
      "http://localhost:7001",
    ]);
  });

  it("trims whitespace around each origin", () => {
    expect(parseCorsOrigins(" http://localhost:7000 , http://localhost:8000 ")).toEqual([
      "http://localhost:7000",
      "http://localhost:8000",
    ]);
  });

  it("returns defaults when value is undefined", () => {
    const defaults = ["http://localhost:7000"];
    expect(parseCorsOrigins(undefined, defaults)).toEqual(defaults);
  });

  it("returns empty array when value is empty string and no defaults", () => {
    expect(parseCorsOrigins("")).toEqual([]);
  });

  it("filters out empty entries from trailing commas", () => {
    expect(parseCorsOrigins("http://a.com,,http://b.com,")).toEqual([
      "http://a.com",
      "http://b.com",
    ]);
  });
});

// ── isCorsAllowed ─────────────────────────────────────────────────────────────

describe("isCorsAllowed()", () => {
  it("allows an origin present in the list", () => {
    expect(isCorsAllowed("http://localhost:7001", ["http://localhost:7000", "http://localhost:7001"])).toBe(true);
  });

  it("blocks an origin not in the list", () => {
    expect(isCorsAllowed("http://evil.com", ["http://localhost:7000"])).toBe(false);
  });

  it("blocks when allowed list is empty", () => {
    expect(isCorsAllowed("http://localhost:3000", [])).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isCorsAllowed("HTTP://LOCALHOST:7000", ["http://localhost:7000"])).toBe(false);
  });
});

// ── buildCorsOrigins ──────────────────────────────────────────────────────────

describe("buildCorsOrigins()", () => {
  it("merges ADMIN_CORS and STORE_CORS env vars", () => {
    process.env.ADMIN_CORS = "http://admin.app.com";
    process.env.STORE_CORS = "http://store.app.com";

    const origins = buildCorsOrigins();
    expect(origins).toContain("http://admin.app.com");
    expect(origins).toContain("http://store.app.com");

    delete process.env.ADMIN_CORS;
    delete process.env.STORE_CORS;
  });

  it("uses provided defaults when env vars are not set", () => {
    delete process.env.ADMIN_CORS;
    delete process.env.STORE_CORS;

    const origins = buildCorsOrigins({
      adminDefaults: ["http://custom-admin.com"],
      storeDefaults: ["http://custom-store.com"],
    });
    expect(origins).toContain("http://custom-admin.com");
    expect(origins).toContain("http://custom-store.com");
  });

  it("env var is prioritized over defaults", () => {
    process.env.ADMIN_CORS = "http://env-admin.com";

    const origins = buildCorsOrigins({ adminDefaults: ["http://fallback-admin.com"] });
    expect(origins).toContain("http://env-admin.com");
    expect(origins).not.toContain("http://fallback-admin.com");

    delete process.env.ADMIN_CORS;
  });
});

// ── handlePostgresError ───────────────────────────────────────────────────────

describe("handlePostgresError()", () => {
  it("maps 23505 (unique violation) to 409 duplicate_error", () => {
    const result = handlePostgresError({ code: "23505" });
    expect(result.statusCode).toBe(409);
    expect(result.type).toBe("duplicate_error");
  });

  it("maps 23503 (foreign key violation) to 409 conflict", () => {
    const result = handlePostgresError({ code: "23503" });
    expect(result.statusCode).toBe(409);
    expect(result.type).toBe("conflict");
  });

  it("maps 23502 (not-null violation) to 400 invalid_data", () => {
    const result = handlePostgresError({ code: "23502" });
    expect(result.statusCode).toBe(400);
    expect(result.type).toBe("invalid_data");
  });

  it("maps unknown codes to 500 database_error", () => {
    const result = handlePostgresError({ code: "99999", message: "unknown pg error" });
    expect(result.statusCode).toBe(500);
    expect(result.type).toBe("database_error");
    expect(result.message).toBe("unknown pg error");
  });

  it("provides fallback message when message is absent", () => {
    const result = handlePostgresError({});
    expect(result.message).toBeTruthy();
    expect(result.statusCode).toBe(500);
  });
});

// ── formatNumber ──────────────────────────────────────────────────────────────

describe("formatNumber()", () => {
  it("formats integers with US locale", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("formats numbers below 1000 without separator", () => {
    expect(formatNumber(999)).toBe("999");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats negative numbers", () => {
    expect(formatNumber(-5000)).toBe("-5,000");
  });
});
