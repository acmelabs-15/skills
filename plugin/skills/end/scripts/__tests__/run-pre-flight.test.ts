import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { checkDraft, main, runChecks } from "../run-pre-flight.ts";

/**
 * Conformant TASK-note markdown satisfying all 11 CONVENTIONS Section 8.1
 * pre-flight items. Individual tests mutate one field at a time to drive a
 * single check to FAIL while the rest pass.
 */
function conformantNote(overrides: Partial<Record<string, string>> = {}): string {
  const title = overrides["title"] ?? "TASK-001-SPEC-001: Fixture Task";
  const type = overrides["type"] ?? "task";
  const permalink =
    overrides["permalink"] ?? "specs/spec-001-fixture/tasks/task-001-spec-001-fixture-task";
  const status = overrides["status"] ?? "TODO";
  const tags = overrides["tags"] ?? "  - task\n  - spec-001";
  const h1 = overrides["h1"] ?? title;
  const observations =
    overrides["observations"] ?? "- [decision] one #a\n- [fact] two #b\n- [constraint] three #c";
  const relations =
    overrides["relations"] ??
    "- part_of [[SPEC-001: Fixture]]\n- implements [[REQ-001-SPEC-001: Test]]";
  const trailing = overrides["trailing"] ?? "";
  return `---
title: '${title}'
type: ${type}
permalink: ${permalink}
status: ${status}
tags:
${tags}
---

# ${h1}

## Objective

Exercise the pre-flight runner.

## Observations

${observations}

## Relations

${relations}
${trailing}`;
}

/**
 * Write `markdown` under a fresh `<cwd>/...tasks/` temp dir so the folder check
 * (item 8.1.10) matches a `task`-type note, and so the path-containment check
 * (ADR-005 D-8) accepts the fixture (it lives inside cwd, not the OS tmpdir).
 */
async function writeNoteFixture(
  markdown: string,
  fileName = "TASK-001-SPEC-001-fixture-task.md",
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const base = await mkdtemp(join(process.cwd(), ".run-pre-flight-tmp-"));
  const dir = join(base, "tasks");
  await mkdir(dir, { recursive: true });
  const path = join(dir, fileName);
  await Bun.write(path, markdown);
  return { path, cleanup: () => rm(base, { recursive: true, force: true }) };
}

describe("run-pre-flight main()", () => {
  test("exit 0 on a fully conformant note (all 11 items pass)", async () => {
    const { path, cleanup } = await writeNoteFixture(conformantNote());
    try {
      const rel = relative(process.cwd(), path);
      const code = await main([rel]);
      expect(code).toBe(0);
    } finally {
      await cleanup();
    }
  });

  test("exit 2 on missing path argument (usage error)", async () => {
    expect(await main([])).toBe(2);
  });

  test("exit 2 on relative-traversal path escaping cwd (ADR-005 D-8)", async () => {
    expect(await main([join("..", "..", "..", "..", "etc", "passwd")])).toBe(2);
  });

  test("exit 2 on an absolute path outside the project root (ADR-005 D-8)", async () => {
    expect(await main(["/etc/passwd"])).toBe(2);
  });

  test("exit 2 on a prefix-collision sibling path (ADR-005 D-8 false-negative guard)", async () => {
    expect(await main([`${process.cwd()}-sibling/x.md`])).toBe(2);
  });

  test("exit 2 on a file that does not exist", async () => {
    expect(await main(["does-not-exist-TASK-999.md"])).toBe(2);
  });
});

describe("run-pre-flight runChecks() — per-item failures cite the 8.1 number", () => {
  const file = "/repo/specs/spec-001-fixture/tasks/TASK-001-SPEC-001-fixture-task.md";

  function fail(item: number, markdown: string, filePath = file): void {
    const findings = runChecks(markdown, filePath);
    const finding = findings.find((f) => f.item === item);
    expect(finding).toBeDefined();
    expect(finding?.ok).toBe(false);
  }

  function passAll(markdown: string, filePath: string): void {
    const findings = runChecks(markdown, filePath);
    expect(findings.filter((f) => !f.ok)).toEqual([]);
  }

  test("conformant note passes every check (item-by-item)", () => {
    passAll(conformantNote(), file);
  });

  test("item 1: title without colon fails", () => {
    fail(
      1,
      conformantNote({ title: "TASK-001-SPEC-001 No Colon", h1: "TASK-001-SPEC-001 No Colon" }),
    );
  });

  test("item 2: filename with spaces / lowercase prefix fails", () => {
    fail(2, conformantNote(), "/repo/specs/tasks/task-001 fixture task.md");
  });

  test("item 3: uppercase permalink fails", () => {
    fail(3, conformantNote({ permalink: "specs/SPEC-001/Tasks/Task-001" }));
  });

  test("item 4: H1 not matching frontmatter title fails", () => {
    fail(4, conformantNote({ h1: "TASK-001-SPEC-001: Different Title" }));
  });

  test("item 5: non-canonical type fails", () => {
    fail(5, conformantNote({ type: "outcome" }), "/repo/notes/TASK-001-SPEC-001-fixture-task.md");
  });

  test("item 6: invalid status fails", () => {
    fail(6, conformantNote({ status: "WIP" }));
  });

  test("item 7: only one tag fails (min 2)", () => {
    fail(7, conformantNote({ tags: "  - task" }));
  });

  test("item 8: fewer than 3 observations fails", () => {
    fail(8, conformantNote({ observations: "- [decision] one #a\n- [fact] two #b" }));
  });

  test("item 8: observation missing #tags fails", () => {
    fail(
      8,
      conformantNote({
        observations: "- [decision] no tags here\n- [fact] two #b\n- [constraint] three #c",
      }),
    );
  });

  test("item 9: fewer than 2 relations fails", () => {
    fail(9, conformantNote({ relations: "- part_of [[SPEC-001: Fixture]]" }));
  });

  test("item 9: invalid relation verb fails", () => {
    fail(
      9,
      conformantNote({
        relations: "- reviews [[SPEC-001: Fixture]]\n- implements [[REQ-001-SPEC-001: Test]]",
      }),
    );
  });

  test("item 9: wikilink without colon fails", () => {
    fail(
      9,
      conformantNote({
        relations: "- part_of [[SPEC-001 Fixture]]\n- implements [[REQ-001-SPEC-001: Test]]",
      }),
    );
  });

  test("item 10: folder not matching type fails", () => {
    fail(10, conformantNote(), "/repo/wrong-folder/TASK-001-SPEC-001-fixture-task.md");
  });

  test("item 11: section after Relations fails", () => {
    fail(
      11,
      conformantNote({ trailing: "\n## Clarifications\n\nextra section after relations.\n" }),
    );
  });
});

describe("checkFolder — every canonical entity type has a folder", () => {
  /**
   * A type absent from the folder table yields `expected === undefined`, and the
   * check ANDs against that — so the note fails permanently, with a detail line
   * reading `expects folder containing "?"`. `feature` was the one canonical
   * type missing, which made every feature note unfixable.
   */
  test("a feature note resolves to roadmap/ rather than failing forever", () => {
    const findings = runChecks(
      conformantNote({
        type: "feature",
        title: "FEAT-001: Fixture Feature",
        h1: "FEAT-001: Fixture Feature",
      }),
      "/repo/docs/roadmap/FEAT-001-fixture-feature.md",
    );
    const folder = findings.find((f) => f.item === 10);
    expect(folder?.detail).not.toContain('"?"');
    expect(folder?.ok).toBe(true);
  });

  test("an unknown type still fails, naming the type it could not place", () => {
    const findings = runChecks(
      conformantNote({ type: "not-a-real-type" }),
      "/repo/docs/analysis/x.md",
    );
    const folder = findings.find((f) => f.item === 10);
    expect(folder?.ok).toBe(false);
    expect(folder?.detail).toContain("not-a-real-type");
  });
});

describe("checkDraft — note text with no file yet", () => {
  test("the two path-dependent checks report skipped, not failed", () => {
    const findings = checkDraft(conformantNote());
    const skipped = findings.filter((f) => f.skipped === true).map((f) => f.item);
    expect(skipped.sort((a, b) => a - b)).toEqual([2, 10]);
    for (const f of findings.filter((f) => f.skipped === true)) {
      expect(f.ok).toBe(true);
      expect(f.detail).toContain("draft has no path");
    }
  });

  test("a conformant draft passes every check that can be evaluated", () => {
    expect(checkDraft(conformantNote()).filter((f) => !f.ok)).toEqual([]);
  });

  test("content defects still fail — skipping paths is not skipping substance", () => {
    const thin = checkDraft(conformantNote({ observations: "- [fact] only one #a" }));
    expect(thin.find((f) => f.item === 8)?.ok).toBe(false);
  });

  test("section order is still enforced without a path", () => {
    const misordered = checkDraft(
      conformantNote({ trailing: "\n## Clarifications\n\nafter relations.\n" }),
    );
    expect(misordered.find((f) => f.item === 11)?.ok).toBe(false);
  });

  test("the same eleven checks run as for a written note", () => {
    expect(checkDraft(conformantNote()).length).toBe(
      runChecks(conformantNote(), "/repo/docs/analysis/x.md").length,
    );
  });
});
