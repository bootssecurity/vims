export function defineWorkflow(name, steps) {
    return {
        name,
        steps,
        async run(initialContext) {
            let context = initialContext;
            for (const step of steps) {
                context = await step.run(context);
            }
            return context;
        },
    };
}
