import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CaptureResult, validateReqSchema } from "./validate-req-schema.ts";

/**
 * Conformant REQ markdown — derived from the composition-layer parser test
 * (shared/composition/tests/requirement-note-parser.test.ts). status DRAFT, a
 * single AC item; parses cleanly against RequirementNoteSchema.
 */
const CONFORMANT = `---
title: 'REQ-002-SPEC-001: Deferred AC'
type: requirement
permalink: specs/spec-001-test/requirements/req-002-spec-001-deferred-ac
status: DRAFT
tags:
  - requirement
  - spec-001
---

# REQ-002-SPEC-001: Deferred AC

## Requirement Statement

WHEN x THE SYSTEM SHALL y SO THAT z.

## Acceptance Criteria

- [ ] GIVEN a thing WHEN it happens THEN result (deferred: blocked on upstream)
- [x] GIVEN another thing WHEN it happens THEN result

## Observations

- [requirement] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;

/**
 * Malformed REQ markdown — status ACCEPTED with an unchecked, non-deferred AC
 * item. Trips RequirementNoteSchema superRefine invariant 2 (ACCEPTED requires
 * every AC satisfied), producing a Zod issue tree.
 */
const MALFORMED = `---
title: 'REQ-003-SPEC-001: Premature Accept'
type: requirement
permalink: specs/spec-001-test/requirements/req-003-spec-001-premature-accept
status: ACCEPTED
tags:
  - requirement
  - spec-001
---

# REQ-003-SPEC-001: Premature Accept

## Requirement Statement

WHEN x THE SYSTEM SHALL y SO THAT z.

## Acceptance Criteria

- [ ] GIVEN a thing WHEN it happens THEN it is not yet satisfied

## Observations

- [requirement] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;

async function withTempFile<T>(
  contents: string,
  fn: (path: string, root: string) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "validate-req-"));
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

describe("validateReqSchema", () => {
  test("exit 0 on a conformant note, stdout 'ok'", async () => {
    await withTempFile(CONFORMANT, async (path, root) => {
      const cap = capture();
      try {
        const code = await validateReqSchema([path], root);
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
        const code = await validateReqSchema([path], root);
        expect(code).toBe(2);
        const errText = cap.result.err.join("\n");
        expect(errText).toContain("Acceptance Criteria");
        expect(errText.length).toBeGreaterThan(0);
      } finally {
        cap.restore();
      }
    });
  });

  test("exit 2 on missing path argument (usage error)", async () => {
    const cap = capture();
    try {
      const code = await validateReqSchema([], process.cwd());
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
        const escaping = join(root, "..", "elsewhere.md");
        const code = await validateReqSchema([escaping], root);
        expect(code).toBe(2);
        expect(cap.result.err.join("\n").toLowerCase()).toContain("outside");
      } finally {
        cap.restore();
      }
      void path;
    });
  });

  test("exit 2 (not crash) on a contained-but-missing file", async () => {
    const root = await mkdtemp(join(tmpdir(), "validate-req-missing-"));
    const cap = capture();
    try {
      const code = await validateReqSchema([join(root, "absent.md")], root);
      expect(code).toBe(2);
      expect(cap.result.err.join("\n").length).toBeGreaterThan(0);
    } finally {
      cap.restore();
      await rm(root, { recursive: true, force: true });
    }
  });
});
