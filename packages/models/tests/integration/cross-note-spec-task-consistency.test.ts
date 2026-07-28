/**
 * Cross-note integration test — SPEC root vs child TASK status consistency.
 *
 * Closes REQ-007-SPEC-008 AC-2 (Audit E SPEC-vs-TASK rollup drift). The
 * cross-note rule: for every child TASK with frontmatter status === DONE,
 * the parent SPEC's `## Artifact Status` row referencing that TASK MUST be
 * checked ([x]) or deferred-with-rationale. The schema enforces this only
 * when SPEC status === DONE; this test extends the contract to any SPEC
 * regardless of status, catching drift early.
 *
 * Two fixture pairs:
 *   - aligned: SPEC-200 + TASK-001-SPEC-200 (TASK DONE, SPEC row [x])
 *     → consistency check PASSes
 *   - drifted: SPEC-201 + TASK-001-SPEC-201 (TASK DONE, SPEC row [ ])
 *     → consistency check FAILs with a diagnostic citing the TASK id
 *
 * The "test fails on drift" wording in REQ-007 AC-2 and TASK-025 DoD means
 * the CONSISTENCY ASSERTION fails for the drifted pair — i.e., the test
 * code verifies that the cross-note check returns FAIL for that pair. The
 * test ITSELF passes by demonstrating the drift is caught.
 */

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseSpecRootNote } from "@acmelabs/models/parsers/spec-root-note";
import { parseTaskNote } from "@acmelabs/models/parsers/task-note";
import type { SpecRootNote } from "@acmelabs/models/schemas/spec-root-note";
import type { TaskNote } from "@acmelabs/models/schemas/task-note";

const integrationFixtureDir = join(import.meta.dir, "..", "..", "..", "fixtures", "integration");

async function loadIntegrationFixture(name: string): Promise<string> {
  return Bun.file(join(integrationFixtureDir, name)).text();
}

interface ConsistencyResult {
  verdict: "PASS" | "FAIL";
  reason?: string;
}

/**
 * Cross-note consistency check. Given a parsed SPEC root note and a parsed
 * child TASK note, verify the rule:
 *
 *   If TASK frontmatter.status === "DONE", then the SPEC's artifact_status
 *   section MUST contain a row whose text references this TASK id AND that
 *   row MUST be done OR deferred-with-rationale.
 *
 * Returns FAIL with a diagnostic when the rule is violated; otherwise PASS.
 */
function checkSpecTaskConsistency(spec: SpecRootNote, task: TaskNote): ConsistencyResult {
  if (task.frontmatter.status !== "DONE") {
    return { verdict: "PASS" };
  }

  // Extract the TASK id from its frontmatter title — e.g.
  // "TASK-001-SPEC-200: Aligned Task" → "TASK-001-SPEC-200".
  const idMatch = task.frontmatter.title.match(/^(TASK-\d{3,}-SPEC-\d{3,}):/);
  if (!idMatch?.[1]) {
    return {
      verdict: "FAIL",
      reason: `Unable to derive TASK id from title "${task.frontmatter.title}"`,
    };
  }
  const taskId = idMatch[1];

  const rows = spec.artifact_status;
  if (!rows || rows.length === 0) {
    return {
      verdict: "FAIL",
      reason: `SPEC ${spec.frontmatter.title} has no artifact_status section; cannot rollup DONE TASK ${taskId}`,
    };
  }

  const matchingRow = rows.find((row) => row.text.includes(taskId));
  if (!matchingRow) {
    return {
      verdict: "FAIL",
      reason: `SPEC ${spec.frontmatter.title} artifact_status has no row referencing TASK ${taskId}`,
    };
  }

  if (!matchingRow.done && !matchingRow.deferred_rationale) {
    return {
      verdict: "FAIL",
      reason: `TASK ${taskId} status DONE but SPEC artifact_status row is unchecked: "${matchingRow.text}"`,
    };
  }

  return { verdict: "PASS" };
}

describe("Cross-note SPEC ↔ TASK consistency", () => {
  // drift-marker: SPEC-002/003-rollup-drift — SPEC-vs-TASK rollup drift surfaced at Phase X close on SPEC-002 and SPEC-003 (RETRO-003)
  test("aligned pair: DONE TASK with [x] SPEC artifact_status row → PASS", async () => {
    const specMd = await loadIntegrationFixture("SPEC-200-clean-spec-root.md");
    const taskMd = await loadIntegrationFixture("TASK-001-SPEC-200-aligned-task.md");

    const spec = parseSpecRootNote(specMd);
    const task = parseTaskNote(taskMd);

    expect(task.frontmatter.status).toBe("DONE");

    const result = checkSpecTaskConsistency(spec, task);
    expect(result.verdict).toBe("PASS");
  });

  test("drifted pair: DONE TASK with [ ] SPEC artifact_status row → FAIL", async () => {
    const specMd = await loadIntegrationFixture("SPEC-201-drifted-spec-root.md");
    const taskMd = await loadIntegrationFixture("TASK-001-SPEC-201-drifted-task.md");

    const spec = parseSpecRootNote(specMd);
    const task = parseTaskNote(taskMd);

    expect(task.frontmatter.status).toBe("DONE");

    const result = checkSpecTaskConsistency(spec, task);
    expect(result.verdict).toBe("FAIL");
    if (result.verdict === "FAIL") {
      expect(result.reason).toContain("TASK-001-SPEC-201");
      expect(result.reason).toContain("unchecked");
    }
  });
});
