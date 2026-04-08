import { type JobsOptions } from "bullmq";
export type VimsEvent<T = unknown> = {
    name: string;
    payload: T;
    options?: Record<string, unknown>;
    metadata?: {
        eventGroupId?: string;
        [key: string]: unknown;
    };
};
export type SubscriberFunction = (payload: any, eventName: string) => Promise<unknown> | unknown;
export type SubscriberRegistryEntry = {
    id: string;
    subscriber: SubscriberFunction;
};
interface Logger {
    info(msg: string, meta?: any): void;
    error(msg: string, meta?: any): void;
    warn(msg: string, meta?: any): void;
    debug?(msg: string, meta?: any): void;
}
type RedisEventBusOptions = {
    redisUrl: string;
    queueName?: string;
    jobOptions?: JobsOptions;
};
export declare class RedisEventBus {
    private readonly logger;
    private readonly queueName;
    private readonly connection;
    private readonly queue;
    private readonly worker;
    private readonly subscribers;
    private readonly jobOptions;
    constructor({ logger, options }: {
        logger: Logger;
        options: RedisEventBusOptions;
    });
    emit<T = unknown>(eventOrEvents: VimsEvent<T> | VimsEvent<T>[], options?: {
        groupedEventsTTL?: number;
    } & JobsOptions): Promise<void>;
    releaseGroupedEvents(eventGroupId: string): Promise<void>;
    clearGroupedEvents(eventGroupId: string): Promise<void>;
    subscribe(eventName: string | symbol, subscriber: SubscriberFunction, context?: Record<string, unknown>): Promise<this>;
    unsubscribe(eventName: string | symbol, subscriber: SubscriberFunction): Promise<this>;
    private workerJobHandler;
    destroy(): Promise<void>;
}
export {};
