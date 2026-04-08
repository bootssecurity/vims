import express from "express";
import cors from "cors";
import request from "supertest";
import { initializeVimsApp } from "@vims/vims/loaders";
/**
 * Creates a real Express instance running Vims in test mode,
 * wrapped in Supertest for HTTP assertions.
 */
export async function createTestServer(options = {}) {
    var _a;
    const app = express();
    // Mirror production CLI middleware
    app.use(cors());
    app.use(express.json());
    // Force test environment variables if not set
    process.env.POSTGRES_URL = process.env.POSTGRES_URL || "postgres://localhost:5432/vims_test";
    process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
    const vimsRouter = express.Router();
    const { shutdown, container } = await initializeVimsApp({
        directory: process.cwd(),
        router: vimsRouter,
        containerOverwrites: (_a = options.vimsConfig) === null || _a === void 0 ? void 0 : _a.containerOverwrites,
        manifest: options.manifest, // PASS MANIFEST
    });
    // Custom routes if needed - MUST happen after initializeVimsApp so middleware is attached
    if (options.setupRoutes) {
        options.setupRoutes(vimsRouter);
    }
    app.use("/", vimsRouter);
    // 404 Handler for non-existent routes (Medusa standardized)
    app.use((req, res) => {
        res.status(404).json({
            type: "not_found",
            message: `Route ${req.method} ${req.path} not found`
        });
    });
    // Global Error Handler mirroring production CLI
    app.use((err, req, res, next) => {
        let statusCode = 500;
        let errorType = "api_error";
        let message = err.message || "An unexpected error occurred.";
        if (err.name === "MedusaError") {
            statusCode = 400;
            if (err.type === "not_found")
                statusCode = 404;
            if (err.type === "unauthorized")
                statusCode = 401;
            if (err.type === "conflict")
                statusCode = 409;
            errorType = err.type;
        }
        else if (err.code === "23505") { // Postgres Duplicate Key
            statusCode = 409;
            errorType = "duplicate_error";
            message = "A resource with this identifier already exists.";
        }
        res.status(statusCode).json({
            type: errorType,
            message: message
        });
    });
    return {
        app: request(app),
        shutdown,
        container,
    };
}
