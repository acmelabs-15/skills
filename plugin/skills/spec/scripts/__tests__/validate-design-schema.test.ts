import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CaptureResult, validateDesignSchema } from "../validate-design-schema.ts";

/**
 * Conformant DESIGN markdown — derived from the composition-layer parser test
 * (shared/composition/tests/design-note-parser.test.ts). status DRAFT, no
 * compliance section; parses cleanly against DesignNoteSchema.
 */
const CONFORMANT = `---
title: 'DESIGN-002-SPEC-001: No Compliance'
type: design
permalink: specs/spec-001-test/design/design-002-spec-001-no-compliance
status: DRAFT
tags:
  - design
  - spec-001
---

# DESIGN-002-SPEC-001: No Compliance

## Context

Some context.

## Module Structure

Some module structure.

## Observations

- [decision] one #a
- [decision] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;

/**
 * Malformed DESIGN markdown — status ACCEPTED with a present-but-unsatisfied
 * Compliance section. Trips DesignNoteSchema superRefine invariant 3 (ACCEPTED
 * requires every Compliance item satisfied when the section exists), producing
 * a Zod issue tree.
 */
const MALFORMED = `---
title: 'DESIGN-003-SPEC-001: Premature Accept'
type: design
permalink: specs/spec-001-test/design/design-003-spec-001-premature-accept
status: ACCEPTED
tags:
  - design
  - spec-001
---

# DESIGN-003-SPEC-001: Premature Accept

## Context

Some context.

## Compliance

- [ ] Honors the interface contract

## Observations

- [decision] one #a
- [decision] two #b
- [constraint] three #c

## Relations

- part_of [[SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;

async function withTempFile<T>(
  contents: string,
  fn: (path: string, root: string) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "validate-design-"));
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

describe("validateDesignSchema", () => {
  test("exit 0 on a conformant note, stdout 'ok'", async () => {
    await withTempFile(CONFORMANT, async (path, root) => {
      const cap = capture();
      try {
        const code = await validateDesignSchema([path], root);
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
        const code = await validateDesignSchema([path], root);
        expect(code).toBe(2);
        const errText = cap.result.err.join("\n");
        expect(errText).toContain("Compliance");
        expect(errText.length).toBeGreaterThan(0);
      } finally {
        cap.restore();
      }
    });
  });

  test("exit 2 on missing path argument (usage error)", async () => {
    const cap = capture();
    try {
      const code = await validateDesignSchema([], process.cwd());
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
        const code = await validateDesignSchema([escaping], root);
        expect(code).toBe(2);
        expect(cap.result.err.join("\n").toLowerCase()).toContain("outside");
      } finally {
        cap.restore();
      }
      void path;
    });
  });

  test("exit 2 (not crash) on a contained-but-missing file", async () => {
    const root = await mkdtemp(join(tmpdir(), "validate-design-missing-"));
    const cap = capture();
    try {
      const code = await validateDesignSchema([join(root, "absent.md")], root);
      expect(code).toBe(2);
      expect(cap.result.err.join("\n").length).toBeGreaterThan(0);
    } finally {
      cap.restore();
      await rm(root, { recursive: true, force: true });
    }
  });
});
