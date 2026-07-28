import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CaptureResult, validateTaskSchema } from "./validate-task-schema.ts";

/**
 * Conformant TASK markdown — derived verbatim from the composition-layer
 * parser test (shared/composition/tests/task-note-parser.test.ts). Parses
 * cleanly against TaskNoteSchema (status TODO, single DoD item).
 */
const CONFORMANT = `---
title: 'TASK-009-SPEC-001: Looser Scope'
type: task
permalink: specs/spec-001-test/tasks/task-009-spec-001-looser-scope
status: TODO
tags:
  - task
  - spec-001
---

# TASK-009-SPEC-001: Looser Scope

## Objective

Demonstrate the looser scope form.

## Scope

- Bullet A
- Bullet B

## Definition of Done

- [ ] Done

## Observations

- [decision] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[REQ-001-SPEC-001: Test]]
`;

/**
 * Malformed TASK markdown — status DONE with an unchecked, non-deferred DoD
 * item. Trips TaskNoteSchema superRefine invariant 2 (DONE requires every DoD
 * satisfied), producing a Zod issue tree.
 */
const MALFORMED = `---
title: 'TASK-010-SPEC-001: Premature Done'
type: task
permalink: specs/spec-001-test/tasks/task-010-spec-001-premature-done
status: DONE
tags:
  - task
  - spec-001
---

# TASK-010-SPEC-001: Premature Done

## Objective

Trigger the DONE invariant.

## Scope

- one

## Definition of Done

- [ ] Not actually done

## Observations

- [decision] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[REQ-001-SPEC-001: Test]]
`;

async function withTempFile<T>(
  contents: string,
  fn: (path: string, root: string) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "validate-task-"));
  const filePath = join(root, "note.md");
  await writeFile(filePath, contents, "utf-8");
  try {
    return await fn(filePath, root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function capture(): { result: CaptureResult; restore: () => void } {
  const out: string[] = [];
  const err: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a: unknown[]) => out.push(a.join(" "));
  console.error = (...a: unknown[]) => err.push(a.join(" "));
  return {
    result: { out, err },
    restore: () => {
      console.log = origLog;
      console.error = origErr;
    },
  };
}

describe("validateTaskSchema", () => {
  test("exit 0 on a conformant note, stdout 'ok'", async () => {
    await withTempFile(CONFORMANT, async (path, root) => {
      const cap = capture();
      try {
        const code = await validateTaskSchema([path], root);
        expect(code).toBe(0);
        expect(cap.result.out.join("\n")).toContain("ok");
      } finally {
        cap.restore();
      }
    });
  });

  test("exit 2 with Zod issue payload on a malformed note", async () => {
    await withTempFile(MALFORMED, async (path, root) => {
      const cap = capture();
      try {
        const code = await validateTaskSchema([path], root);
        expect(code).toBe(2);
        const errText = cap.result.err.join("\n");
        // Zod issue tree surfaced to stderr: includes the custom DONE message.
        expect(errText).toContain("Definition of Done");
        expect(errText.length).toBeGreaterThan(0);
      } finally {
        cap.restore();
      }
    });
  });

  test("exit 2 on missing path argument (usage error)", async () => {
    const cap = capture();
    try {
      const code = await validateTaskSchema([], process.cwd());
      expect(code).toBe(2);
      expect(cap.result.err.join("\n").toLowerCase()).toContain("usage");
    } finally {
      cap.restore();
    }
  });

  test("exit 2 on path-containment violation (escapes project root)", async () => {
    await withTempFile(CONFORMANT, async (path, root) => {
      const cap = capture();
      try {
        // Pass an absolute path that resolves OUTSIDE the supplied root.
        const escaping = join(root, "..", "elsewhere.md");
        const code = await validateTaskSchema([escaping], root);
        expect(code).toBe(2);
        expect(cap.result.err.join("\n").toLowerCase()).toContain("outside");
      } finally {
        cap.restore();
      }
      // path is intentionally unused beyond keeping the temp note on disk.
      void path;
    });
  });

  test("exit 2 (not crash) on a contained-but-missing file", async () => {
    const root = await mkdtemp(join(tmpdir(), "validate-task-missing-"));
    const cap = capture();
    try {
      const code = await validateTaskSchema([join(root, "absent.md")], root);
      expect(code).toBe(2);
      expect(cap.result.err.join("\n").length).toBeGreaterThan(0);
    } finally {
      cap.restore();
      await rm(root, { recursive: true, force: true });
    }
  });
});
