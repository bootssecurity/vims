import { defineWorkflow } from "@vims/workflows";
import { createWorkflowManager, } from "@vims/orchestration";
export function createWorkflowStep(name, run) {
    return {
        name,
        run,
    };
}
export function createWorkflowDefinition(name, steps) {
    const workflow = defineWorkflow(name, steps);
    return Object.assign(Object.assign({}, workflow), { async run(initialContext) {
            return workflow.run(initialContext);
        } });
}
export function createWorkflowRegistry() {
    return createWorkflowManager();
}
