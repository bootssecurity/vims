export type VimsEvent<T = unknown> = {
    name: string;
    payload: T;
};
export type VimsEventSubscriber = (payload: unknown, eventName: string) => void | Promise<void>;
export declare function createEventBus(): {
    emit<T>(name: string, payload: T): {
        name: string;
        payload: T;
    };
    subscribe(eventName: string, handler: VimsEventSubscriber): void;
    unsubscribe(eventName: string, handler: VimsEventSubscriber): void;
    all(): VimsEvent<unknown>[];
    count(name?: string): number;
};
