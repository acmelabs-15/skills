import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, parseArgs } from "../src/recompose.js";
import { PlanValidationError } from "../src/schemas/plan-yaml.js";

describe("recompose.ts CLI", () => {
  test("rejects invalid --plan argument with usage message", () => {
    expect(() => parseArgs([])).toThrow(PlanValidationError);
    expect(() => parseArgs(["--plan"])).toThrow(/Usage: recompose.ts/);
  });

  test("main() exits 1 on plan YAML failing Zod validation", async () => {
    const dir = mkdtempSync(join(tmpdir(), "recompose-test-"));
    const planPath = join(dir, "bad.yaml");
    // Wrong plan_type — composition expected.
    writeFileSync(
      planPath,
      [
        "plan_type: distribution",
        "source_type: adr",
        "target_path: foo.md",
        "renumber_map: {}",
        "",
      ].join("\n"),
    );
    const exit = await main(["--plan", planPath]);
    expect(exit).toBe(1);
  });
});
