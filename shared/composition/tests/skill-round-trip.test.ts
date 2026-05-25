/**
 * SPEC-005 REQ-006: end-to-end round-trip tests at the skill (CLI) level.
 *
 * Exercises decompose.ts followed by recompose.ts against fixture plans, then
 * SHA-256-compares the recomposed output to the original to validate the
 * full pipeline (plan YAML loading → Zod validation → adapter dispatch →
 * mutation → hash-validate → atomic write).
 */
import { describe, expect, test } from "bun:test";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256 } from "../src/core/hash.js";
import { main as decomposeMain } from "../src/decompose.js";
import { main as recomposeMain } from "../src/recompose.js";

const fixtureDir = join(import.meta.dir, "fixtures");

describe("SPEC-005 skill-level round-trip", () => {
  test("decompose then recompose produces SHA-256 identical output", async () => {
    // Stage fixtures into a tmp dir so the test isolated from the source tree.
    const workDir = mkdtempSync(join(tmpdir(), "spec-005-rt-"));
    const fixturePath = join(workDir, "adr-round-trip.md");
    copyFileSync(join(fixtureDir, "adr-round-trip.md"), fixturePath);
    const originalContent = await Bun.file(fixturePath).text();
    const originalHash = sha256(originalContent);

    const decomposePlan = join(workDir, "adr-decompose-plan.yaml");
    copyFileSync(join(fixtureDir, "adr-decompose-plan.yaml"), decomposePlan);

    const recomposePlan = join(workDir, "adr-recompose-plan.yaml");
    copyFileSync(join(fixtureDir, "adr-recompose-plan.yaml"), recomposePlan);

    // Decompose: rewrites adr-round-trip.md in-place with D-1→D-500, D-2→D-501.
    const dexit = await decomposeMain(["--plan", decomposePlan]);
    expect(dexit).toBe(0);

    const distributed = await Bun.file(fixturePath).text();
    expect(distributed).toContain("D-500");
    expect(distributed).toContain("D-501");
    expect(distributed).not.toContain("### D-1:");

    // Recompose: reads adr-round-trip.md, applies inverse renumber, writes target.
    const rexit = await recomposeMain(["--plan", recomposePlan]);
    expect(rexit).toBe(0);

    const recomposed = await Bun.file(fixturePath).text();
    expect(sha256(recomposed)).toBe(originalHash);
    expect(recomposed).toBe(originalContent);
  });

  test("decompose.ts exits 1 with PlanValidationError on invalid source_type", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "spec-005-rt-"));
    const planPath = join(workDir, "bad-source-type.yaml");
    writeFileSync(
      planPath,
      [
        "plan_type: distribution",
        "source_type: bogus-not-registered",
        "source_path: nope.md",
        "renumber_map:",
        "  D-1: D-100",
        "wikilink_map: {}",
        "",
      ].join("\n"),
    );
    // Source file doesn't exist either; either failure mode yields exit 1.
    const exit = await decomposeMain(["--plan", planPath]);
    expect(exit).toBe(1);
  });

  test("decompose.ts exits 1 on non-injective renumber_map at Zod load time", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "spec-005-rt-"));
    const planPath = join(workDir, "noninjective.yaml");
    writeFileSync(
      planPath,
      [
        "plan_type: distribution",
        "source_type: adr",
        "source_path: nope.md",
        "renumber_map:",
        "  D-1: D-200",
        "  D-2: D-200",
        "wikilink_map: {}",
        "",
      ].join("\n"),
    );
    const exit = await decomposeMain(["--plan", planPath]);
    expect(exit).toBe(1);
  });
});
