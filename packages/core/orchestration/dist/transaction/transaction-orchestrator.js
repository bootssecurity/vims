export function createTransactionOrchestrator(steps) {
    return {
        steps,
        async run(initialContext) {
            const completed = [];
            let context = initialContext;
            try {
                for (const step of steps) {
                    context = await step.invoke(context);
                    completed.push(step);
                }
                return context;
            }
            catch (error) {
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
