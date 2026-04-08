import express from "express";
import request from "supertest";
export interface TestServerOptions {
    vimsConfig?: any;
    port?: number;
    setupRoutes?: (router: express.Router) => void;
    manifest?: any;
}
/**
 * Creates a real Express instance running Vims in test mode,
 * wrapped in Supertest for HTTP assertions.
 */
export declare function createTestServer(options?: TestServerOptions): Promise<{
    app: import("supertest/lib/agent")<request.SuperTestStatic.Test>;
    shutdown: () => Promise<void>;
    container: any;
}>;
