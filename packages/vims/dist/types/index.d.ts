/**
 * Subscriber types for VIMS.
 */
import type { VimsFrameworkRuntime } from "@vims/framework";
export type VimsEvent<TData = unknown> = {
    name: string;
    data: TData;
    metadata?: Record<string, unknown>;
};
export type VimsContainer = VimsFrameworkRuntime["container"];
export type VimsSubscriberArgs<TData = unknown> = {
    event: VimsEvent<TData>;
    container: VimsContainer;
    pluginOptions?: Record<string, unknown>;
};
export type VimsSubscriberConfig = {
    /** One or more event names this subscriber handles */
    event: string | string[];
    context?: {
        /** Stable, unique ID to prevent duplicate registrations across hot-reloads */
        subscriberId: string;
        [key: string]: unknown;
    };
};
/**
 * A subscriber module must export:
 *  - `default`: the async handler function
 *  - `config`: a VimsSubscriberConfig declaration
 */
export type VimsSubscriberModule<TData = unknown> = {
    default: (args: VimsSubscriberArgs<TData>) => Promise<void>;
    config: VimsSubscriberConfig;
};
export type VimsJobArgs = {
    container: VimsContainer;
};
export type VimsJobConfig = {
    /** node-cron schedule expression e.g. "0 * * * *" */
    schedule: string;
    /** Stable unique ID for this job */
    name: string;
};
export type VimsJobModule = {
    default: (args: VimsJobArgs) => Promise<void>;
    config: VimsJobConfig;
};
export type VimsWorkflowModule = {
    /** The workflow function/definition to register */
    default: unknown;
    /** Optional workflow ID override; falls back to function.name */
    workflowId?: string;
};
