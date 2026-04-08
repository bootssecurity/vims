export function createLogger() {
    const entries = [];
    function write(level, message, context) {
        const entry = { level, message, context };
        entries.push(entry);
        return entry;
    }
    return {
        debug(message, context) {
            return write("debug", message, context);
        },
        info(message, context) {
            return write("info", message, context);
        },
        warn(message, context) {
            return write("warn", message, context);
        },
        error(message, context) {
            return write("error", message, context);
        },
        all() {
            return [...entries];
        },
    };
}
