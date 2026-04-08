export declare const localEventBusProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    bus: {
        emit<T>(name: string, payload: T): {
            name: string;
            payload: T;
        };
        subscribe(eventName: string, handler: import("@vims/events").VimsEventSubscriber): void;
        unsubscribe(eventName: string, handler: import("@vims/events").VimsEventSubscriber): void;
        all(): import("@vims/events").VimsEvent<unknown>[];
        count(name?: string): number;
    };
}>;
