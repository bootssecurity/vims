export declare function createMockEventCollector(): {
    emit(name: string, payload: unknown): void;
    all(): {
        name: string;
        payload: unknown;
    }[];
};
