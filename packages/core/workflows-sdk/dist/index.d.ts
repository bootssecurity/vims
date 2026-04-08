import { type WorkflowStep } from "@vims/workflows";
import { type RegisteredWorkflow } from "@vims/orchestration";
export declare function createWorkflowStep<TContext>(name: string, run: WorkflowStep<TContext>["run"]): WorkflowStep<TContext>;
export declare function createWorkflowDefinition<TContext>(name: string, steps: WorkflowStep<TContext>[]): RegisteredWorkflow & {
    run: (initialContext: TContext) => Promise<TContext>;
};
export declare function createWorkflowRegistry(): {
    register(workflow: RegisteredWorkflow): void;
    get(name: string): RegisteredWorkflow | undefined;
    list(): RegisteredWorkflow[];
};
