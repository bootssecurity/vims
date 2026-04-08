export type TransactionStep<TContext> = {
  name: string;
  invoke: (context: TContext) => Promise<TContext> | TContext;
  compensate?: (context: TContext) => Promise<TContext> | TContext;
};

export function createTransactionOrchestrator<TContext>(
  steps: TransactionStep<TContext>[],
) {
  return {
    steps,
    async run(initialContext: TContext) {
      const completed: TransactionStep<TContext>[] = [];
      let context = initialContext;

      try {
        for (const step of steps) {
          context = await step.invoke(context);
          completed.push(step);
        }

        return context;
      } catch (error) {
        for (const step of completed.reverse()) {
          if (step.compensate) {
            context = await step.compensate(context);
          }
        }

        throw error;
      }
    },
  };
}
