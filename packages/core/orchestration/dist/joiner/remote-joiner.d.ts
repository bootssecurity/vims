export type JoinRecord = Record<string, unknown>;
export declare function createRemoteJoiner(): {
    merge(left: JoinRecord, right: JoinRecord): {
        [x: string]: unknown;
    };
};
