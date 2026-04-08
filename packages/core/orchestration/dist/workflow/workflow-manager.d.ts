export type RegisteredWorkflow = {
    name: string;
    run: (input: any) => Promise<any> | any;
};
export declare function createWorkflowManager(): {
    register(workflow: RegisteredWorkflow): void;
    get(name: string): RegisteredWorkflow | undefined;
    list(): RegisteredWorkflow[];
};
