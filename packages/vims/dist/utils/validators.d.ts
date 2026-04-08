import { z } from "zod";
import type { VimsMiddlewareHandler } from "../loaders/api-loader";
export declare function validateBody<T extends z.ZodTypeAny>(schema: T): VimsMiddlewareHandler;
export declare function validateQuery<T extends z.ZodTypeAny>(schema: T): VimsMiddlewareHandler;
