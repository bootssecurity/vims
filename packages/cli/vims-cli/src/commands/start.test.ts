import { describe, expect, it, vi, beforeEach } from "vitest";
import { startCommand } from "./start.js";
import express from "express";

vi.mock("express", () => {
  const mockApp = {
    use: vi.fn(),
    listen: vi.fn((port, cb) => {
      // simulate async callback
      if (cb) setImmediate(cb);
      return { close: vi.fn((closeCb) => { if (closeCb) setImmediate(closeCb); }) };
    }),
  };
  const mockExpress = vi.fn(() => mockApp) as any;
  mockExpress.json = vi.fn(() => "json-middleware");
  mockExpress.urlencoded = vi.fn(() => "urlencoded-middleware");
  mockExpress.Router = vi.fn(() => "router-instance");
  return { default: mockExpress };
});

vi.mock("cors", () => ({ default: vi.fn(() => "cors-middleware") }));

vi.mock("@vims/vims/loaders", () => ({
  initializeVimsApp: vi.fn().mockResolvedValue({
    shutdown: vi.fn().mockResolvedValue(true),
  }),
}));

describe("CLI: startCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_CORS = "http://localhost:7000";
    process.env.STORE_CORS = "http://localhost:8000";
  });

  it("initializes express, cors, and vims router on specified port", async () => {
    const expressApp = express();

    // Prevent process from actually exiting in tests if SIGINT handlers fire
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    await startCommand({ port: "9999" });

    expect(expressApp.use).toHaveBeenCalledWith("cors-middleware");
    expect(expressApp.use).toHaveBeenCalledWith("json-middleware");
    expect(expressApp.use).toHaveBeenCalledWith("urlencoded-middleware");
    
    // The Vims router is mounted on "/"
    expect(expressApp.use).toHaveBeenCalledWith("/", "router-instance");
    
    expect(expressApp.listen).toHaveBeenCalledWith(9999, expect.any(Function));

    exitSpy.mockRestore();
  });

  it("falls back to port 9000 if not specified", async () => {
    const expressApp = express();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    await startCommand({ port: "" }); // Invalid/empty port

    expect(expressApp.listen).toHaveBeenCalledWith(9000, expect.any(Function));
    
    exitSpy.mockRestore();
  });

  it("exits with status 1 if initialization fails", async () => {
    const initMock = await import("@vims/vims/loaders");
    vi.mocked(initMock.initializeVimsApp).mockRejectedValueOnce(new Error("Boot failed"));
    
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await startCommand({ port: "9000" });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to start VIMS Server:", expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
