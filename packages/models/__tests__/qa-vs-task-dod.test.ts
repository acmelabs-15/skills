/**
 * Cross-note integration test — QA verdict vs TASK DoD state.
 *
 * Closes REQ-007-SPEC-008 AC-3 (Audit E QA-vs-TASK-DoD coverage
 * gap). The cross-note rule: every QA note whose summary.verdict === "PASS"
 * MUST correspond to a linked TASK whose Definition of Done items are ALL
 * checked or deferred-with-rationale. A QA PASS verdict over an
 * incomplete TASK DoD is a lying-claim drift.
 *
 * Two fixture pairs:
 *   - aligned: QA-001-SPEC-202 + TASK-001-SPEC-202 (PASS verdict, all DoD [x])
 *     → consistency check PASSes
 *   - drifted: QA-001-SPEC-203 + TASK-001-SPEC-203 (PASS verdict, one DoD [ ])
 *     → consistency check FAILs with a diagnostic citing the incomplete item
 *
 * "Test fails on drift" wording in REQ-007 AC-3: the CONSISTENCY ASSERTION
 * fails for the drifted pair. The test itself passes by verifying the drift
 * is caught.
 */

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseQaNote } from "@acmelabs/models/parsers/qa-note";
import { parseTaskNote } from "@acmelabs/models/parsers/task-note";
import type { QaNote } from "@acmelabs/models/schemas/qa-note";
import type { TaskNote } from "@acmelabs/models/schemas/task-note";

const integrationFixtureDir = join(import.meta.dir, "..", "..", "fixtures", "integration");

async function loadIntegrationFixture(name: string): Promise<string> {
  return Bun.file(join(integrationFixtureDir, name)).text();
}

interface ConsistencyResult {
  verdict: "PASS" | "FAIL";
  reason?: string;
  unsatisfied?: string[];
}

/**
 * Cross-note consistency check. Given a parsed QA note and a parsed TASK
 * note linked by reference, verify the rule:
 *
 *   If QA summary.verdict === "PASS", then every TASK DoD item
 *   MUST be done OR deferred-with-rationale.
 *
 * Returns FAIL with the list of unsatisfied DoD items when the rule is
 * violated; otherwise PASS.
 */
function checkQaVsTaskDoD(report: QaNote, task: TaskNote): ConsistencyResult {
  if (report.summary.verdict !== "PASS") {
    return { verdict: "PASS" };
  }

  const unsatisfied = task.definition_of_done
    .filter((item) => !item.done && !item.deferred_rationale)
    .map((item) => item.text);

  if (unsatisfied.length === 0) {
    return { verdict: "PASS" };
  }

  return {
    verdict: "FAIL",
    reason: `QA verdict PASS but TASK ${task.frontmatter.title} has ${unsatisfied.length} unsatisfied DoD item(s)`,
    unsatisfied,
  };
}

describe("Cross-note QA ↔ TASK DoD consistency", () => {
  test("aligned pair: PASS verdict with every DoD item [x] → PASS", async () => {
    const reportMd = await loadIntegrationFixture("QA-001-SPEC-202-clean-qa-report.md");
    const taskMd = await loadIntegrationFixture("TASK-001-SPEC-202-aligned-task-for-qa.md");

    const report = parseQaNote(reportMd);
    const task = parseTaskNote(taskMd);

    expect(report.summary.verdict).toBe("PASS");
    expect(task.definition_of_done.every((d) => d.done)).toBe(true);

    const result = checkQaVsTaskDoD(report, task);
    expect(result.verdict).toBe("PASS");
  });

  test("drifted pair: PASS verdict with [ ] DoD item → FAIL", async () => {
    const reportMd = await loadIntegrationFixture("QA-001-SPEC-203-drifted-qa-report.md");
    const taskMd = await loadIntegrationFixture("TASK-001-SPEC-203-drifted-task-for-qa.md");

    const report = parseQaNote(reportMd);
    const task = parseTaskNote(taskMd);

    expect(report.summary.verdict).toBe("PASS");
    const incomplete = task.definition_of_done.filter((d) => !d.done && !d.deferred_rationale);
    expect(incomplete.length).toBeGreaterThanOrEqual(1);

    const result = checkQaVsTaskDoD(report, task);
    expect(result.verdict).toBe("FAIL");
    if (result.verdict === "FAIL") {
      expect(result.unsatisfied).toBeDefined();
      expect(result.unsatisfied?.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(result.reason).toContain("TASK-001-SPEC-203");
    }
  });
});
