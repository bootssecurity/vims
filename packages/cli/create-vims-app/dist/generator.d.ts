export type CreateVimsAppOptions = {
    name: string;
    modules: string[];
};
export type GeneratedFile = {
    path: string;
    content: string;
};
export declare function normalizeModules(input?: string): string[];
export declare function createPackageJson(name: string): string;
export declare function createRuntimeTemplate(options: CreateVimsAppOptions): string;
export declare function createReadme(options: CreateVimsAppOptions): string;
export declare function createTsConfig(): string;
export declare function createNextConfig(): string;
export declare function createLayoutTemplate(name: string): string;
export declare function createPageTemplate(name: string): string;
export declare function createGlobalCss(): string;
export declare function createEnvExample(): string;
export declare function createScaffoldFiles(options: CreateVimsAppOptions): GeneratedFile[];
export declare function writeScaffold(outputDir: string, options: CreateVimsAppOptions): Promise<{
    targetDir: string;
    files: string[];
}>;
