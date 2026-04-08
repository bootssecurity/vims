export type PolicyResult = {
    allowed: boolean;
    reason?: string;
};
export declare function allow(): PolicyResult;
export declare function deny(reason: string): PolicyResult;
export declare function definePolicy<TArgs>(handler: (args: TArgs) => PolicyResult): (args: TArgs) => PolicyResult;
