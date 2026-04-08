type WorkflowEntry = {
    workflowId: string;
    workflow: unknown;
    sourcePath: string;
};
/**
 * WorkflowLoader
 *
 * File-system scanner that discovers and registers workflow modules.
 *
 * Workflow file shape:
 * ```ts
 * import { createWorkflow } from "@vims/workflows-sdk";
 *
 * export default createWorkflow("my-workflow", function myWorkflow(input) {
 *   // steps...
 * });
 * // OR explicitly:
 * export const workflowId = "my-workflow";
 * export default myWorkflowFn;
 * ```
 *
 * Usage:
 * ```ts
 * const loader = new WorkflowLoader([join(cwd, "src/workflows")]);
 * await loader.load();
 * ```
 */
export declare class WorkflowLoader {
    private readonly sourcePaths;
    private readonly workflows;
    constructor(sourcePaths: string[]);
    load(): Promise<void>;
    getWorkflows(): WorkflowEntry[];
    private scanAll;
    private scanDir;
}
export {};
