export type VimsEvent<T = unknown> = {
    name: string;
    payload: T;
};
export declare function createEventBus(): {
    emit<T>(name: string, payload: T): {
        name: string;
        payload: T;
    };
    all(): VimsEvent<unknown>[];
    count(name?: string): number;
};
