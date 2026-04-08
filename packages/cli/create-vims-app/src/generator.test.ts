import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createScaffoldFiles,
  createPackageJson,
  createReadme,
  createRuntimeTemplate,
  normalizeModules,
  writeScaffold,
} from "./generator";

describe("create-vims-app generator", () => {
  it("normalizes module lists", () => {
    expect(normalizeModules("tenancy, inventory ,crm")).toEqual([
      "tenancy",
      "inventory",
      "crm",
    ]);
  });

  it("creates a package.json template", () => {
    expect(createPackageJson("dealer-app")).toContain('"name": "dealer-app"');
  });

  it("creates runtime and readme templates", () => {
    expect(
      createRuntimeTemplate({ name: "dealer-app", modules: ["tenancy", "crm"] }),
    ).toContain('"crm"');
    expect(createReadme({ name: "dealer-app", modules: ["tenancy"] })).toContain(
      "- tenancy",
    );
  });

  it("creates a scaffold file list", () => {
    expect(
      createScaffoldFiles({ name: "dealer-app", modules: ["tenancy", "crm"] }).map(
        (file) => file.path,
      ),
    ).toContain("src/app/page.tsx");
  });

  it("writes scaffold files to disk", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "create-vims-app-"));
    const result = await writeScaffold(outputDir, {
      name: "dealer-app",
      modules: ["tenancy", "crm"],
    });

    expect(result.files.length).toBeGreaterThan(3);
    await expect(
      readFile(join(result.targetDir, "src/lib/app-definition.ts"), "utf8"),
    ).resolves.toContain('"crm"');
  });
});
