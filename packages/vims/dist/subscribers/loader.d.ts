import type { VimsSubscriberConfig, VimsSubscriberArgs, VimsContainer } from "../types/index";
type SubscriberEntry = {
    handler: (args: VimsSubscriberArgs<any>) => Promise<void>;
    config: VimsSubscriberConfig;
    sourcePath: string;
};
type RegisteredSubscriber = SubscriberEntry & {
    events: string[];
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
export declare class SubscriberLoader {
    private readonly sourcePaths;
    private readonly container;
    private readonly pluginOptions;
    private readonly entries;
    private readonly registered;
    constructor(sourcePaths: string[], container: VimsContainer, pluginOptions?: Record<string, unknown>);
    /**
     * Scan all source directories, import subscriber modules, and register them
     * on the event bus resolved from the container.
     */
    load(): Promise<void>;
    /** Returns all currently registered subscribers (useful for inspection/tests) */
    getRegistered(): RegisteredSubscriber[];
    private scanAll;
    private scanDir;
    private registerAll;
}
export {};
