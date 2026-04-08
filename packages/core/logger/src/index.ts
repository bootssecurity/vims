export type VimsLogLevel = "debug" | "info" | "warn" | "error";

export type VimsLogEntry = {
  level: VimsLogLevel;
  message: string;
  context?: Record<string, unknown>;
};

export function createLogger() {
  const entries: VimsLogEntry[] = [];

  function write(level: VimsLogLevel, message: string, context?: Record<string, unknown>) {
    const entry = { level, message, context };
    entries.push(entry);
    return entry;
  }

  return {
    debug(message: string, context?: Record<string, unknown>) {
      return write("debug", message, context);
    },
    info(message: string, context?: Record<string, unknown>) {
      return write("info", message, context);
    },
    warn(message: string, context?: Record<string, unknown>) {
      return write("warn", message, context);
    },
    error(message: string, context?: Record<string, unknown>) {
      return write("error", message, context);
    },
    all() {
      return [...entries];
    },
  };
}
