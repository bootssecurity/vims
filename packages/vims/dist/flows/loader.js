import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
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
export class WorkflowLoader {
    constructor(sourcePaths) {
        this.workflows = [];
        this.sourcePaths = sourcePaths;
    }
    // ── Public ──────────────────────────────────────────────────────────────────
    async load() {
        await this.scanAll();
    }
    getWorkflows() {
        return [...this.workflows];
    }
    // ── Private ─────────────────────────────────────────────────────────────────
    async scanAll() {
        await Promise.allSettled(this.sourcePaths.map((p) => this.scanDir(p)));
    }
    async scanDir(dir) {
        let entries;
        try {
            entries = await readdir(dir);
        }
        catch (_a) {
            return;
        }
        const validExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);
        await Promise.all(entries.map(async (entry) => {
            var _a, _b;
            if (!validExtensions.has(extname(entry)))
                return;
            if (entry.endsWith(".test.ts") ||
                entry.endsWith(".spec.ts") ||
                entry.endsWith(".d.ts"))
                return;
            const fullPath = join(dir, entry);
            try {
                const fileStat = await stat(fullPath);
                if (!fileStat.isFile())
                    return;
                const mod = await import(fullPath);
                const workflow = mod.default;
                if (!workflow)
                    return;
                // Resolve the workflow ID from:
                //  1. Named export `workflowId`
                //  2. `workflow.__name` (set by createWorkflow)
                //  3. filename without extension
                const workflowId = (_b = (_a = mod.workflowId) !== null && _a !== void 0 ? _a : workflow === null || workflow === void 0 ? void 0 : workflow.__name) !== null && _b !== void 0 ? _b : entry.replace(/\.[^.]+$/, "");
                this.workflows.push({ workflowId, workflow, sourcePath: fullPath });
            }
            catch (_c) {
                // skip broken modules
            }
        }));
    }
}
