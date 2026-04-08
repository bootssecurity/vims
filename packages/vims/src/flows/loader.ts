import { readdir, stat } from "fs/promises";
import { join, extname } from "path";

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
export class WorkflowLoader {
  private readonly sourcePaths: string[];
  private readonly workflows: WorkflowEntry[] = [];

  constructor(sourcePaths: string[]) {
    this.sourcePaths = sourcePaths;
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  async load(): Promise<void> {
    await this.scanAll();
  }

  getWorkflows(): WorkflowEntry[] {
    return [...this.workflows];
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async scanAll(): Promise<void> {
    await Promise.allSettled(this.sourcePaths.map((p) => this.scanDir(p)));
  }

  private async scanDir(dir: string): Promise<void> {
    let entries: string[];

    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    const validExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);

    await Promise.all(
      entries.map(async (entry) => {
        if (!validExtensions.has(extname(entry))) return;
        if (
          entry.endsWith(".test.ts") ||
          entry.endsWith(".spec.ts") ||
          entry.endsWith(".d.ts")
        )
          return;

        const fullPath = join(dir, entry);

        try {
          const fileStat = await stat(fullPath);
          if (!fileStat.isFile()) return;

          const mod = await import(fullPath);
          const workflow = mod.default;

          if (!workflow) return;

          // Resolve the workflow ID from:
          //  1. Named export `workflowId`
          //  2. `workflow.__name` (set by createWorkflow)
          //  3. filename without extension
          const workflowId: string =
            mod.workflowId ??
            (workflow as any)?.__name ??
            entry.replace(/\.[^.]+$/, "");

          this.workflows.push({ workflowId, workflow, sourcePath: fullPath });
        } catch {
          // skip broken modules
        }
      })
    );
  }
}
