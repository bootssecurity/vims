export declare function createContainer(initialValues?: Map<string, unknown>): {
    register<T>(key: string, value: T): void;
    resolve<T>(key: string): T;
    has(key: string): boolean;
    entries(): [string, unknown][];
    createScope(): /*elided*/ any;
};
