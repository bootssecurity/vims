export type VimsLogLevel = "debug" | "info" | "warn" | "error";
export type VimsLogEntry = {
    level: VimsLogLevel;
    message: string;
    context?: Record<string, unknown>;
};
export declare function createLogger(): {
    debug(message: string, context?: Record<string, unknown>): {
        level: VimsLogLevel;
        message: string;
        context: Record<string, unknown> | undefined;
    };
    info(message: string, context?: Record<string, unknown>): {
        level: VimsLogLevel;
        message: string;
        context: Record<string, unknown> | undefined;
    };
    warn(message: string, context?: Record<string, unknown>): {
        level: VimsLogLevel;
        message: string;
        context: Record<string, unknown> | undefined;
    };
    error(message: string, context?: Record<string, unknown>): {
        level: VimsLogLevel;
        message: string;
        context: Record<string, unknown> | undefined;
    };
    all(): VimsLogEntry[];
};
