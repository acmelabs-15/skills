import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { main } from "../validate-task-done.ts";

/**
 * Fixture TASK-note markdown. `status` and the DoD block vary per test;
 * everything else is the minimal shape `parseTaskNote` + `TaskNoteSchema`
 * accept (frontmatter + Objective + Scope + Definition of Done + 3
 * observations + 2 relations). Mirrors the canonical sample in
 * shared/composition/tests/task-note-parser.test.ts.
 */
function taskMarkdown(opts: { status: string; dod: string }): string {
  return `---
title: 'TASK-001-SPEC-001: Fixture Task'
type: task
permalink: specs/spec-001-test/tasks/task-001-spec-001-fixture-task
status: ${opts.status}
tags:
  - task
  - spec-001
---

# TASK-001-SPEC-001: Fixture Task

## Objective

Exercise the validate-task-done gate.

## Scope

- one

## Definition of Done

${opts.dod}

## Observations

- [decision] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[REQ-001-SPEC-001: Test]]
`;
}

/**
 * Write `markdown` to a fresh temp file UNDER process.cwd() and return its
 * absolute path. The fixture must live inside cwd so the script's
 * path-containment check (ADR-005 D-8) accepts it — the OS tmpdir (/var/... on
 * macOS) resolves outside the repo and would be rejected as a containment
 * violation, defeating the happy-path tests.
 */
async function writeTaskFixture(
  markdown: string,
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(process.cwd(), ".validate-task-done-tmp-"));
  const path = join(dir, "TASK-001-SPEC-001-fixture-task.md");
  await Bun.write(path, markdown);
  return { path, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

describe("validate-task-done main()", () => {
  test("exit 0 when every DoD item is checked (DoD #3)", async () => {
    const { path, cleanup } = await writeTaskFixture(
      taskMarkdown({ status: "DONE", dod: "- [x] First item\n- [x] Second item" }),
    );
    try {
      // main resolves user paths against process.cwd(); pass a cwd-relative path.
      const rel = relative(process.cwd(), path);
      const code = await main([rel]);
      expect(code).toBe(0);
    } finally {
      await cleanup();
    }
  });

  test("exit 1 when a DoD item is unchecked and the note still parses (DoD #4)", async () => {
    // status IN_PROGRESS so the note parses; validateTaskDoneClaim then
    // returns FAIL for the unchecked item -> exit 1 (validation failure).
    const { path, cleanup } = await writeTaskFixture(
      taskMarkdown({ status: "IN_PROGRESS", dod: "- [x] First item\n- [ ] Second item" }),
    );
    try {
      const rel = relative(process.cwd(), path);
      const code = await main([rel]);
      expect(code).toBe(1);
    } finally {
      await cleanup();
    }
  });

  test("exit 2 on a path containing '..' segments that escapes cwd (DoD #5, ADR-005 D-8)", async () => {
    // Construct a path with a leading '..' that resolves outside process.cwd().
    const escaping = join("..", "..", "..", "..", "..", "etc", "passwd");
    const code = await main([escaping]);
    expect(code).toBe(2);
  });

  test("exit 2 on missing path argument (usage error)", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });

  test("exit 2 on a file that does not exist", async () => {
    const code = await main(["does-not-exist-TASK-999.md"]);
    expect(code).toBe(2);
  });

  test("exit 2 when status DONE has an unchecked non-deferred DoD (schema parse failure)", async () => {
    // The TaskNoteSchema superRefine rejects status:DONE with an unsatisfied
    // DoD item at PARSE time. Per the CLI contract, a schema parse failure is
    // exit 2 (not exit 1). This documents resolution of the DoD #4 wording
    // ("unchecked DoD AND status DONE") against the authoritative exit
    // contract: that combination is mechanically a parse failure.
    const { path, cleanup } = await writeTaskFixture(
      taskMarkdown({ status: "DONE", dod: "- [x] First item\n- [ ] Second item" }),
    );
    try {
      const rel = relative(process.cwd(), path);
      const code = await main([rel]);
      expect(code).toBe(2);
    } finally {
      await cleanup();
    }
  });
});
