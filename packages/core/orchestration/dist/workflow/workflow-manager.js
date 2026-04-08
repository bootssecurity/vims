export function createWorkflowManager() {
    const workflows = new Map();
    return {
        register(workflow) {
            workflows.set(workflow.name, workflow);
        },
        get(name) {
            return workflows.get(name);
        },
        list() {
            return [...workflows.values()];
        },
    };
}
