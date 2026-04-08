import express from "express";
import { initializeVimsApp, VimsAppOutput } from "@vims/vims/loaders";

export async function setupServer(dbName: string = "vims_test"): Promise<{ app: express.Express; vims: VimsAppOutput }> {
  // Override environment to use local real test infrastructure
  process.env.POSTGRES_URL = `postgres://localhost/${dbName}`;
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
  
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const vimsRouter = express.Router();
  
  const vims = await initializeVimsApp({
    directory: process.cwd() + "/integration-tests",
    router: vimsRouter as any,
    workerMode: "shared", // Spin up API, DB, AND Redis Background Job loops
  });

  app.use("/", vimsRouter);

  // Global error handler mapped identical to CLI
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    let statusCode = 500;
    res.status(statusCode).json({ type: "api_error", message: err.message });
  });

  return { app, vims };
}
