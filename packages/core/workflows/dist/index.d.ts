export type WorkflowStep<TContext> = {
    name: string;
    run: (context: TContext) => Promise<TContext> | TContext;
};
export declare function defineWorkflow<TContext>(name: string, steps: WorkflowStep<TContext>[]): {
    name: string;
    steps: WorkflowStep<TContext>[];
    run(initialContext: TContext): Promise<TContext>;
};
