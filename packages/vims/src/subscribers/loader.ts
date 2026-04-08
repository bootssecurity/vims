import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
import type {
  VimsSubscriberConfig,
  VimsSubscriberArgs,
  VimsContainer,
} from "../types/index";

type SubscriberEntry = {
  handler: (args: VimsSubscriberArgs<any>) => Promise<void>;
  config: VimsSubscriberConfig;
  sourcePath: string;
};

type RegisteredSubscriber = SubscriberEntry & {
  events: string[];
};

type MinimalEventBus = {
  subscribe(
    event: string,
    handler: (args: VimsSubscriberArgs<any>) => Promise<void>,
    context?: Record<string, unknown>
  ): void;
};

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
  private readonly sourcePaths: string[];
  private readonly container: VimsContainer;
  private readonly pluginOptions: Record<string, unknown>;
  private readonly entries: SubscriberEntry[] = [];
  private readonly registered: RegisteredSubscriber[] = [];

  constructor(sourcePaths: string[], container: any, pluginOptions: any = {}) {
    this.sourcePaths = sourcePaths;
    this.container = container;
    this.pluginOptions = pluginOptions;
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  /**
   * Scan all source directories, import subscriber modules, and register them
   * on the event bus resolved from the container.
   */
  async load(): Promise<void> {
    await this.scanAll();
    this.registerAll();
  }

  /** Returns all currently registered subscribers (useful for inspection/tests) */
  getRegistered(): RegisteredSubscriber[] {
    return [...this.registered];
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async scanAll(): Promise<void> {
    const results = await Promise.allSettled(
      this.sourcePaths.map((p) => this.scanDir(p))
    );

    for (const result of results) {
      if (result.status === "rejected") {
        // Directory doesn't exist or failed to scan — skip silently
      }
    }
  }

  private async scanDir(dir: string): Promise<void> {
    let entries: string[];

    try {
      entries = await readdir(dir);
    } catch {
      return; // directory doesn't exist — not an error
    }

    const validExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry);
        const ext = extname(entry);

        if (!validExtensions.has(ext)) return;

        // Skip test/spec files and type declaration files
        if (
          entry.endsWith(".test.ts") ||
          entry.endsWith(".spec.ts") ||
          entry.endsWith(".d.ts")
        ) {
          return;
        }

        try {
          const fileStat = await stat(fullPath);
          if (!fileStat.isFile()) return;

          const mod = await import(fullPath);
          const handler = mod.default;
          const config: VimsSubscriberConfig | undefined = mod.config;

          if (typeof handler !== "function") return;
          if (!config?.event) return;

          this.entries.push({ handler, config, sourcePath: fullPath });
        } catch (error) {
          console.error("SubscriberLoader import failed:", fullPath, error);
        }
      })
    );
  }

  private registerAll(): void {
    // Resolve event bus from container
    let eventBus: MinimalEventBus | undefined;
    try {
      eventBus = this.container.resolve("provider:event-bus-redis") as any;
      if (!eventBus) {
        eventBus = this.container.resolve("provider:event-bus-local") as any;
      }
      // In tests, the redis provider registers the bus nested under .bus. Adjust if so.
      if (typeof eventBus?.subscribe !== "function" && (eventBus as any).bus) {
        eventBus = (eventBus as any).bus;
      }
    } catch {
      // Ignore if no event bus is registered
    }

    for (const entry of this.entries) {
      const events = Array.isArray(entry.config.event)
        ? entry.config.event
        : [entry.config.event];

      const registeredEntry: RegisteredSubscriber = { ...entry, events };
      this.registered.push(registeredEntry);

      // Register on the event bus if available
      if (eventBus?.subscribe) {
        for (const eventName of events) {
          eventBus.subscribe(
            eventName,
            async (rawEvent) => {
              await entry.handler({
                event: rawEvent as any,
                container: this.container,
                pluginOptions: this.pluginOptions,
              });
            },
            entry.config.context
          );
        }
      }
    }
  }
}
