export declare function createContainer(): {
    register<T>(key: string, value: T): void;
    resolve<T>(key: string, options?: {
        allowUnregistered?: boolean;
    }): T | undefined;
    has(key: string): boolean;
    entries(): [string, unknown][];
};
