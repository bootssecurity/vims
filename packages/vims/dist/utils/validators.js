import { z } from "zod";
export function validateBody(schema) {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({
                    type: "invalid_request_error",
                    message: "Invalid request payload",
                    errors: err.issues,
                });
                return;
            }
            next(err);
        }
    };
}
export function validateQuery(schema) {
    return async (req, res, next) => {
        try {
            req.query = (await schema.parseAsync(req.query));
            next();
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({
                    type: "invalid_request_error",
                    message: "Invalid request parameters",
                    errors: err.issues,
                });
                return;
            }
            next(err);
        }
    };
}
