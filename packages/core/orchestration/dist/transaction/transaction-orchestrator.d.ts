export type TransactionStep<TContext> = {
    name: string;
    invoke: (context: TContext) => Promise<TContext> | TContext;
    compensate?: (context: TContext) => Promise<TContext> | TContext;
};
export declare function createTransactionOrchestrator<TContext>(steps: TransactionStep<TContext>[]): {
    steps: TransactionStep<TContext>[];
    run(initialContext: TContext): Promise<TContext>;
};
