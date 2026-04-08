import express from "express";
import cors from "cors";
import { initializeVimsApp } from "@vims/vims/loaders";

export async function startCommand(options: { port: string }) {
  const port = parseInt(options.port, 10) || 9000;
  
  console.log(`Starting VIMS Backend on port ${port}...`);

  const app = express();
  
  // Strict Medusa Parity CORS
  const adminCors = process.env.ADMIN_CORS?.split(",") || ["http://localhost:7000", "http://localhost:7001"];
  const storeCors = process.env.STORE_CORS?.split(",") || ["http://localhost:8000"];
  const allowedOrigins = [...adminCors, ...storeCors];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
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
      router: vimsRouter as any, // Duck-typing to VimsRouter
      workerMode: "shared",
    });

    // Mount Vims
    app.use("/", vimsRouter);

    // Global Error Handler Parity
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error(err);
      
      let statusCode = 500;
      let errorType = "api_error";
      let message = err.message || "An unexpected error occurred.";

      // MedusaError integration
      if (err.name === "MedusaError") {
        statusCode = 400;
        if (err.type === "not_found") statusCode = 404;
        if (err.type === "unauthorized") statusCode = 401;
        errorType = err.type;
      }
      
      // Standard Postgres duplication mapping
      if (err.code === "23505") {
        statusCode = 409;
        errorType = "duplicate_error";
        message = "A record with these unique details already exists.";
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
  } catch (err) {
    console.error("Failed to start VIMS Server:", err);
    process.exit(1);
  }
}
