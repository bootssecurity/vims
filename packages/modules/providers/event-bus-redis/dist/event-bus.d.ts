export type VimsEvent<T = unknown> = {
    name: string;
    payload: T;
};
export type SubscriberFunction = (payload: any, eventName: string) => Promise<void>;
interface Logger {
    info(msg: string, meta?: any): void;
    error(msg: string, meta?: any): void;
    warn(msg: string, meta?: any): void;
    debug?(msg: string, meta?: any): void;
}
type RedisEventBusOptions = {
    redisUrl: string;
    queueName?: string;
};
export declare class RedisEventBus {
    private readonly logger;
    private readonly queueName;
    private readonly connection;
    private readonly queue;
    private readonly worker;
    private readonly subscribers;
    constructor({ logger, options }: {
        logger: Logger;
        options: RedisEventBusOptions;
    });
    emit<T = unknown>(eventOrEvents: VimsEvent<T> | VimsEvent<T>[], options?: {
        delay?: number;
        attempts?: number;
    }): Promise<void>;
    subscribe(eventName: string | symbol, subscriber: SubscriberFunction, context?: Record<string, unknown>): Promise<this>;
    unsubscribe(eventName: string | symbol, subscriber: SubscriberFunction): Promise<this>;
    private processJob;
    destroy(): Promise<void>;
}
export {};
