export type DomainModule = {
    name: string;
    description: string;
    owns: string[];
};
export type ServiceCandidate = {
    name: string;
    trigger: string;
    boundary: string;
};
export declare const domainModules: DomainModule[];
export declare const serviceExtractionPlan: ServiceCandidate[];
