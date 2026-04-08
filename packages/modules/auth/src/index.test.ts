import { describe, expect, it } from "vitest";
import { authModule, authStrategies } from "./index";

// Helper to build a minimal runtime context
function makeContext(overrides: Record<string, unknown> = {}) {
  const services: Record<string, unknown> = {};
  const mockEventBus = {
    bus: { emit: (_name: string, _payload: unknown) => {} },
  };

  return {
    context: {
      config: {} as any,
      providers: new Map([["event-bus-local", mockEventBus]]),
      modules: new Map(),
      plugins: new Map(),
      services,
      registerService: (key: string, value: unknown) => { services[key] = value; },
      resolveProvider: (key: string) => {
        if (key === "event-bus-local") return mockEventBus as any;
        throw new Error(`Provider "${key}" not found`);
      },
      resolveModule: () => { throw new Error("not wired"); },
      resolvePlugin: () => { throw new Error("not wired"); },
      ...overrides,
    },
    services,
  };
}

describe("auth module", () => {
  it("has correct key and label", () => {
    expect(authModule.key).toBe("auth");
    expect(authModule.label).toBe("Auth");
    expect(authModule.dependsOn).toContain("tenancy");
  });

  it("registers auth.strategies service with all three strategies", () => {
    const { context, services } = makeContext();
    authModule.register(context);
    expect(services["auth.strategies"]).toEqual(["password", "magic-link", "sso"]);
  });

  it("exposes all authStrategies", () => {
    expect(authStrategies).toContain("password");
    expect(authStrategies).toContain("magic-link");
    expect(authStrategies).toContain("sso");
  });

  describe("issueSessionToken()", () => {
    it("returns a non-empty JWT string", () => {
      const { context } = makeContext();
      const api = authModule.register(context);
      const token = api.issueSessionToken("user_123");
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // header.payload.signature
    });

    it("encodes userId in the payload", () => {
      const { context } = makeContext();
      const api = authModule.register(context);
      const token = api.issueSessionToken("user_abc");
      // Decode the payload (middle segment) without verifying signature
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
      expect(payload.userId).toBe("user_abc");
    });
  });

  describe("verifySessionToken()", () => {
    it("verifies a token issued by the same module", () => {
      const { context } = makeContext();
      const api = authModule.register(context);
      const token = api.issueSessionToken("user_456");
      const decoded = api.verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe("user_456");
    });

    it("returns null for a tampered token", () => {
      const { context } = makeContext();
      const api = authModule.register(context);
      const token = api.issueSessionToken("user_789");
      const tampered = token.slice(0, -5) + "XXXXX";
      expect(api.verifySessionToken(tampered)).toBeNull();
    });

    it("returns null for a completely invalid token", () => {
      const { context } = makeContext();
      const api = authModule.register(context);
      expect(api.verifySessionToken("not.a.jwt")).toBeNull();
    });

    it("returns null for an empty string", () => {
      const { context } = makeContext();
      const api = authModule.register(context);
      expect(api.verifySessionToken("")).toBeNull();
    });
  });

  it("emits 'auth.booted' event on boot via event bus", () => {
    const emittedEvents: Array<{ name: string; payload: unknown }> = [];
    const mockBus = {
      bus: {
        emit(name: string, payload: unknown) {
          emittedEvents.push({ name, payload });
        },
      },
    };

    authModule.register({
      config: {} as any,
      providers: new Map([["event-bus-local", mockBus]]),
      modules: new Map(),
      plugins: new Map(),
      services: {},
      registerService: () => {},
      resolveProvider: (key: string) => {
        if (key === "event-bus-local") return mockBus as any;
        throw new Error(`Provider "${key}" not found`);
      },
      resolveModule: () => { throw new Error("not wired"); },
      resolvePlugin: () => { throw new Error("not wired"); },
    });

    expect(emittedEvents).toContainEqual(
      expect.objectContaining({ name: "auth.booted" })
    );
  });
});
