import express from "express";
import cors from "cors";
import { initializeVimsApp } from "@vims/vims/loaders";
import { parseCorsOrigins, isCorsAllowed, handlePostgresError } from "@vims/utils";
export async function startCommand(options) {
    const port = parseInt(options.port, 10) || 9000;
    console.log(`Starting VIMS Backend on port ${port}...`);
    const app = express();
    const allowedOrigins = parseCorsOrigins(process.env.ADMIN_CORS || "http://localhost:7000");
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || isCorsAllowed(origin, allowedOrigins)) {
                callback(null, true);
            }
            else {
                callback(new Error(`Not allowed by CORS: ${origin}`));
            }
        },
        credentials: true,
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Create the API Router where Vims will mount everything
    const vimsRouter = express.Router();
    try {
        const { shutdown } = await initializeVimsApp({
            directory: process.cwd(),
            router: vimsRouter, // Duck-typing to VimsRouter
            workerMode: "shared",
        });
        // Mount Vims
        app.use("/", vimsRouter);
        // Global Error Handler Parity
        app.use((err, req, res, next) => {
            console.error(err);
            let statusCode = 500;
            let errorType = "api_error";
            let message = err.message || "An unexpected error occurred.";
            if (err.name === "VimsError") {
                statusCode = 400;
                if (err.type === "not_found")
                    statusCode = 404;
                if (err.type === "unauthorized")
                    statusCode = 401;
                errorType = err.type;
                res.status(statusCode).json({ type: errorType, message });
                return;
            }
            // Handle Postgres mapping via core util
            if (err.code) {
                const pgError = handlePostgresError(err);
                res.status(pgError.statusCode).json({
                    type: pgError.type,
                    message: pgError.message,
                });
                return;
            }
            res.status(statusCode).json({
                type: errorType,
                message: message
            });
        });
        const server = app.listen(port, () => {
            console.log(`🚀 VIMS Server listening at http://localhost:${port}`);
        });
        // Graceful Shutdown
        const gracefullyShutdown = async () => {
            console.log("Shutting down VIMS elegantly...");
            server.close(async () => {
                await shutdown();
                process.exit(0);
            });
        };
        process.on("SIGINT", gracefullyShutdown);
        process.on("SIGTERM", gracefullyShutdown);
    }
    catch (err) {
        console.error("Failed to start VIMS Server:", err);
        process.exit(1);
    }
}
