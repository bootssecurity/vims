interface Logger {
    info(msg: string, meta?: any): void;
    error(msg: string, meta?: any): void;
    warn(msg: string, meta?: any): void;
    debug?(msg: string, meta?: any): void;
}
type RedisLockingOptions = {
    redisUrl: string;
    prefix?: string;
};
export declare class RedisLocking {
    private readonly logger;
    private readonly client;
    private readonly prefix;
    constructor({ logger, options }: {
        logger: Logger;
        options: RedisLockingOptions;
    });
    acquire(keys: string | string[], options?: {
        expireTimeout?: number;
    }): Promise<string>;
    release(keys: string | string[], ownerToken: string): Promise<boolean>;
    destroy(): Promise<void>;
}
export {};
