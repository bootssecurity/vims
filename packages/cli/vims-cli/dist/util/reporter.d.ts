export declare class Reporter {
    private activities;
    activity(message: string): string;
    success(id: string, message?: string): void;
    error(id: string, message: string): void;
    info(message: string): void;
    warn(message: string): void;
    log(message: string): void;
}
export declare const reporter: Reporter;
