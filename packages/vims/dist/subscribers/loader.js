import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
/**
 * SubscriberLoader
 *
 * File-system scanner that discovers subscriber modules from one or more
 * source directories and registers them against the event bus.
 *
 * Subscriber file shape:
 * ```ts
 * export default async function myHandler({ event, container }) { ... }
 * export const config: VimsSubscriberConfig = {
 *   event: ["order.created", "order.updated"],
 *   context: { subscriberId: "my-handler" },
 * }
 * ```
 *
 * Usage:
 * ```ts
 * const loader = new SubscriberLoader([join(cwd, "src/subscribers")], container);
 * await loader.load();
 * ```
 */
export class SubscriberLoader {
    constructor(sourcePaths, container, pluginOptions = {}) {
        this.entries = [];
        this.registered = [];
        this.sourcePaths = sourcePaths;
        this.container = container;
        this.pluginOptions = pluginOptions;
    }
    // ── Public ─────────────────────────────────────────────────────────────────
    /**
     * Scan all source directories, import subscriber modules, and register them
     * on the event bus resolved from the container.
     */
    async load() {
        await this.scanAll();
        this.registerAll();
    }
    /** Returns all currently registered subscribers (useful for inspection/tests) */
    getRegistered() {
        return [...this.registered];
    }
    // ── Private ─────────────────────────────────────────────────────────────────
    async scanAll() {
        const results = await Promise.allSettled(this.sourcePaths.map((p) => this.scanDir(p)));
        for (const result of results) {
            if (result.status === "rejected") {
                // Directory doesn't exist or failed to scan — skip silently
            }
        }
    }
    async scanDir(dir) {
        let entries;
        try {
            entries = await readdir(dir);
        }
        catch (_a) {
            return; // directory doesn't exist — not an error
        }
        const validExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);
        await Promise.all(entries.map(async (entry) => {
            const fullPath = join(dir, entry);
            const ext = extname(entry);
            if (!validExtensions.has(ext))
                return;
            // Skip test/spec files and type declaration files
            if (entry.endsWith(".test.ts") ||
                entry.endsWith(".spec.ts") ||
                entry.endsWith(".d.ts")) {
                return;
            }
            try {
                const fileStat = await stat(fullPath);
                if (!fileStat.isFile())
                    return;
                const mod = await import(fullPath);
                const handler = mod.default;
                const config = mod.config;
                if (typeof handler !== "function")
                    return;
                if (!(config === null || config === void 0 ? void 0 : config.event))
                    return;
                this.entries.push({ handler, config, sourcePath: fullPath });
            }
            catch (_a) {
                // Import failed — log but don't crash
            }
        }));
    }
    registerAll() {
        var _a, _b;
        // Resolve event bus from container (optional — may not be registered yet)
        const eventBus = ((_b = (_a = this.container).resolve) === null || _b === void 0 ? void 0 : _b.call(_a, "module:eventBus", { allowUnregistered: true }));
        for (const entry of this.entries) {
            const events = Array.isArray(entry.config.event)
                ? entry.config.event
                : [entry.config.event];
            const registeredEntry = Object.assign(Object.assign({}, entry), { events });
            this.registered.push(registeredEntry);
            // Register on the event bus if available
            if (eventBus === null || eventBus === void 0 ? void 0 : eventBus.subscribe) {
                for (const eventName of events) {
                    eventBus.subscribe(eventName, async (rawEvent) => {
                        await entry.handler({
                            event: rawEvent,
                            container: this.container,
                            pluginOptions: this.pluginOptions,
                        });
                    }, entry.config.context);
                }
            }
        }
    }
}
