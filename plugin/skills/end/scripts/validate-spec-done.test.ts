import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { main } from "./validate-spec-done.ts";

/**
 * Fixture SPEC-root markdown. `status`, `## Success Criteria`, and
 * `## Artifact Status` vary per test; everything else is the minimal shape
 * `parseSpecRootNote` + `SpecRootNoteSchema` accept (frontmatter with the
 * SPEC-NNN title/permalink, non-empty Context, 3 observations, 2 relations).
 */
function specMarkdown(opts: { status: string; gate?: string }): string {
  return `---
title: 'SPEC-001: Fixture Spec'
type: spec
permalink: specs/spec-001-fixture/spec-001-fixture
status: ${opts.status}
tags:
  - spec
  - fixture
---

# SPEC-001: Fixture Spec

## Context

Exercise the validate-spec-done gate.
${opts.gate ?? ""}

## Observations

- [decision] one #a
- [fact] two #b
- [constraint] three #c

## Relations

- contains [[REQ-001-SPEC-001: Test]]
- implements [[ADR-001: Test]]
`;
}

/**
 * Write `markdown` to a fresh temp file UNDER process.cwd() and return its
 * absolute path. The fixture must live inside cwd so the script's
 * path-containment check (ADR-005 D-8) accepts it — the OS tmpdir resolves
 * outside the repo and would be rejected as a containment violation.
 */
async function writeSpecFixture(
  markdown: string,
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(process.cwd(), ".validate-spec-done-tmp-"));
  const path = join(dir, "SPEC-001-fixture.md");
  await Bun.write(path, markdown);
  return { path, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

describe("validate-spec-done main()", () => {
  test("exit 0 when no gate sections exist (author opted out, DoD #1)", async () => {
    const { path, cleanup } = await writeSpecFixture(specMarkdown({ status: "ACCEPTED" }));
    try {
      const rel = relative(process.cwd(), path);
      const code = await main([rel]);
      expect(code).toBe(0);
    } finally {
      await cleanup();
    }
  });

  test("exit 0 when every gate item is checked (DoD #1)", async () => {
    const gate = "\n## Success Criteria\n\n- [x] First\n- [x] Second\n";
    const { path, cleanup } = await writeSpecFixture(specMarkdown({ status: "ACCEPTED", gate }));
    try {
      const rel = relative(process.cwd(), path);
      const code = await main([rel]);
      expect(code).toBe(0);
    } finally {
      await cleanup();
    }
  });

  test("exit 1 when a gate item is unchecked but the note still parses (DoD #1, #4)", async () => {
    // status ACCEPTED (not DONE) so SpecRootNoteSchema.superRefine does NOT
    // reject at parse time; validateSpecDoneClaim then returns FAIL -> exit 1.
    const gate = "\n## Artifact Status\n\n- [x] First\n- [ ] Second\n";
    const { path, cleanup } = await writeSpecFixture(specMarkdown({ status: "ACCEPTED", gate }));
    try {
      const rel = relative(process.cwd(), path);
      const code = await main([rel]);
      expect(code).toBe(1);
    } finally {
      await cleanup();
    }
  });

  test("exit 2 when status DONE has an unchecked gate item (schema parse failure)", async () => {
    // The SpecRootNoteSchema superRefine rejects status:DONE with an
    // unsatisfied gate item at PARSE time. Per the CLI contract a parse failure
    // is exit 2 (not exit 1) — mirrors the validate-task-done precedent.
    const gate = "\n## Success Criteria\n\n- [x] First\n- [ ] Second\n";
    const { path, cleanup } = await writeSpecFixture(specMarkdown({ status: "DONE", gate }));
    try {
      const rel = relative(process.cwd(), path);
      const code = await main([rel]);
      expect(code).toBe(2);
    } finally {
      await cleanup();
    }
  });

  test("exit 2 on a relative-traversal path that escapes cwd (ADR-005 D-8)", async () => {
    const escaping = join("..", "..", "..", "..", "..", "etc", "passwd");
    const code = await main([escaping]);
    expect(code).toBe(2);
  });

  test("exit 2 on an absolute path outside the project root (ADR-005 D-8)", async () => {
    const code = await main(["/etc/passwd"]);
    expect(code).toBe(2);
  });

  test("exit 2 on a prefix-collision sibling path (ADR-005 D-8 false-negative guard)", async () => {
    // `<cwd>-sibling/x.md` shares the cwd string prefix but is NOT contained.
    // The bare `.startsWith(projectRoot)` form would false-accept this; the
    // `+ sep` guard rejects it.
    const sibling = `${process.cwd()}-sibling/x.md`;
    const code = await main([sibling]);
    expect(code).toBe(2);
  });

  test("exit 2 on missing path argument (usage error)", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });

  test("exit 2 on a file that does not exist", async () => {
    const code = await main(["does-not-exist-SPEC-999.md"]);
    expect(code).toBe(2);
  });
});
