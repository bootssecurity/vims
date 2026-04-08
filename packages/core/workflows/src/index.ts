export type WorkflowStep<TContext> = {
  name: string;
  run: (context: TContext) => Promise<TContext> | TContext;
};

export function defineWorkflow<TContext>(
  name: string,
  steps: WorkflowStep<TContext>[],
) {
  return {
    name,
    steps,
    async run(initialContext: TContext) {
      let context = initialContext;

      for (const step of steps) {
        context = await step.run(context);
      }

      return context;
    },
  };
}
