import { defineWorkflow, type WorkflowStep } from "@vims/workflows";
import {
  createWorkflowManager,
  type RegisteredWorkflow,
} from "@vims/orchestration";

export function createWorkflowStep<TContext>(
  name: string,
  run: WorkflowStep<TContext>["run"],
): WorkflowStep<TContext> {
  return {
    name,
    run,
  };
}

export function createWorkflowDefinition<TContext>(
  name: string,
  steps: WorkflowStep<TContext>[],
): RegisteredWorkflow & {
  run: (initialContext: TContext) => Promise<TContext>;
} {
  const workflow = defineWorkflow(name, steps);

  return {
    ...workflow,
    async run(initialContext: TContext) {
      return workflow.run(initialContext);
    },
  };
}

export function createWorkflowRegistry() {
  return createWorkflowManager();
}
