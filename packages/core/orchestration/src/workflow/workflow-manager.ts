export type RegisteredWorkflow = {
  name: string;
  run: (input: any) => Promise<any> | any;
};

export function createWorkflowManager() {
  const workflows = new Map<string, RegisteredWorkflow>();

  return {
    register(workflow: RegisteredWorkflow) {
      workflows.set(workflow.name, workflow);
    },
    get(name: string) {
      return workflows.get(name);
    },
    list() {
      return [...workflows.values()];
    },
  };
}
