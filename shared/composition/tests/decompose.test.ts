import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, parseArgs } from "../src/decompose.js";
import { PlanValidationError } from "../src/schemas/plan-yaml.js";

describe("decompose.ts CLI", () => {
  test("rejects invalid --plan argument with usage message", () => {
    expect(() => parseArgs([])).toThrow(PlanValidationError);
    expect(() => parseArgs(["--plan"])).toThrow(/Usage: decompose.ts/);
  });

  test("main() exits 1 on plan YAML failing Zod validation", async () => {
    const dir = mkdtempSync(join(tmpdir(), "decompose-test-"));
    const planPath = join(dir, "bad.yaml");
    // Missing required `plan_type` and other fields → Zod rejects.
    writeFileSync(planPath, "source_type: adr\nrenumber_map: {}\n");
    const exit = await main(["--plan", planPath]);
    expect(exit).toBe(1);
  });

  test("main() exits 1 on non-injective renumber_map", async () => {
    const dir = mkdtempSync(join(tmpdir(), "decompose-test-"));
    const planPath = join(dir, "noninjective.yaml");
    writeFileSync(
      planPath,
      [
        "plan_type: distribution",
        "source_type: adr",
        "source_path: nope.md",
        "renumber_map:",
        "  D-1: D-100",
        "  D-2: D-100", // duplicate codomain value
        "wikilink_map: {}",
        "",
      ].join("\n"),
    );
    const exit = await main(["--plan", planPath]);
    expect(exit).toBe(1);
  });
});
