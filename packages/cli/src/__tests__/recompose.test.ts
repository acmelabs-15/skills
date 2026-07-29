import { describe, expect, test } from "bun:test";
// mkdtemp is a directory op with no Bun equivalent; content writes are Bun-native.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, parseArgs } from "@acmelabs/cli/recompose";
import { PlanValidationError } from "@acmelabs/core/schemas/plan-yaml";

describe("recompose.ts CLI", () => {
  test("rejects invalid --plan argument with usage message", () => {
    expect(() => parseArgs([])).toThrow(PlanValidationError);
    // The usage string names the file actually invoked, not a hardcoded `.ts`,
    // so the shipped `.js` does not tell a user to run a file that is not there.
    // Under `bun test` the invoked file is the test runner, so assert the shape.
    expect(() => parseArgs(["--plan"])).toThrow(/Usage: \S+ --plan/);
  });

  test("main() exits 1 on plan YAML failing Zod validation", async () => {
    const dir = mkdtempSync(join(tmpdir(), "recompose-test-"));
    const planPath = join(dir, "bad.yaml");
    // Wrong plan_type — composition expected.
    await Bun.write(
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
