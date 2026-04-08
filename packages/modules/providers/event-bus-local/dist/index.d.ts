export declare const localEventBusProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    bus: {
        emit<T>(name: string, payload: T): {
            name: string;
            payload: T;
        };
        all(): import("@vims/events").VimsEvent<unknown>[];
        count(name?: string): number;
    };
}>;
