export declare function createContainer(): {
    register<T>(key: string, value: T): void;
    resolve<T>(key: string): T;
    has(key: string): boolean;
    entries(): [string, unknown][];
};
