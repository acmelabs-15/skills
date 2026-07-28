import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setPartDoneCli } from "./set-part-done.ts";

/**
 * Round-trippable PLAN fixture with a spec-phase part `spec.SPEC-001` in
 * IN_PROGRESS. set-part-done flips that part substatus to a terminal state.
 * Authored from the canonical renderer output shape so it parses and re-renders
 * without drift.
 */
function planFixture(): string {
  return [
    "---",
    'title: "PLAN-001: Set Part Done Fixture"',
    "type: plan",
    "status: IN_PROGRESS",
    "complexity_tier: TIER_3",
    "branches:",
    "  - feat/plan-001-set-part-done",
    "permalink: planning/plan-001-set-part-done",
    "tags:",
    "  - plan",
    "  - fixture",
    "  - build",
    "---",
    "",
    "# PLAN-001: Set Part Done Fixture",
    "",
    "## Scope",
    "",
    "Fixture exercising the set-part-done CLI.",
    "",
    "## Objectives",
    "",
    "- [ ] Complete spec.SPEC-001",
    "",
    "## Phase Progression",
    "",
    "### research",
    "",
    "- **Phase**: research",
    "- **Title**: Research",
    "- **Substatus**: DONE",
    "- **Completing Session**: SESSION-2026-05-23_01",
    "- **Outcome**: [[ANALYSIS-001: Sample]]",
    "- **Source Artifacts**: (none)",
    "- **Depends On**: (none)",
    "",
    "**DoD**:",
    "",
    "- [x] Findings captured",
    "",
    "### spec.SPEC-001",
    "",
    "- **Phase**: spec",
    "- **Title**: Author SPEC-001",
    "- **Substatus**: IN_PROGRESS",
    "- **Owning Session**: SESSION-2026-05-23_01",
    "- **Source Artifacts**: [[ADR-001: Sample]]",
    "- **Depends On**: research",
    "",
    "**DoD**:",
    "",
    "- [ ] SPEC ACCEPTED",
    "",
    "## Tasks",
    "",
    "### Active",
    "",
    "(none)",
    "",
    "### Backlog",
    "",
    "(none)",
    "",
    "### Archive",
    "",
    "(none)",
    "",
    "## Pending User Decisions",
    "",
    "(none)",
    "",
    "## Editor Mirror IDs",
    "",
    "(none)",
    "",
    "## Blockers",
    "",
    "(none)",
    "",
    "## Observations",
    "",
    "- [decision] Markdown is authoritative state #adr-003 #render",
    "- [fact] Completion signal flips part substatus #contract-1",
    "- [constraint] Non-DONE terminal needs rationale #invariant",
    "",
    "## Relations",
    "",
    "- implements [[ADR-005: Per-Skill Scripts]]",
    "- depends_on [[ANALYSIS-002: Sample]]",
    "",
  ].join("\n");
}

const PART = "spec.SPEC-001";
const SESSION = "SESSION-2026-05-23_01";
const OUTCOME = "[[SPEC-001: Sample]]";

function baseArgs(planPath: string, projectRoot: string): string[] {
  return [
    "--plan-path",
    planPath,
    "--part-id",
    PART,
    "--outcome",
    OUTCOME,
    "--owning-session",
    SESSION,
    "--at-event",
    "42",
    "--project-root",
    projectRoot,
  ];
}

describe("setPartDoneCli", () => {
  let projectRoot: string;
  let planPath: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "set-part-done-"));
    planPath = join(projectRoot, "docs", "planning", "PLAN-001-fixture.md");
    await Bun.write(planPath, planFixture());
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  test("default status DONE flips spec.SPEC-001 substatus IN_PROGRESS → DONE", async () => {
    const code = await setPartDoneCli(baseArgs(planPath, projectRoot));
    expect(code).toBe(0);
    const after = await Bun.file(planPath).text();
    expect(after).toMatch(/### spec\.SPEC-001[\s\S]*?- \*\*Substatus\*\*: DONE/);
    // Outcome wikilink + completing session persisted on the part.
    expect(after).toMatch(/### spec\.SPEC-001[\s\S]*?- \*\*Outcome\*\*: \[\[SPEC-001: Sample\]\]/);
    expect(after).toMatch(
      /### spec\.SPEC-001[\s\S]*?- \*\*Completing Session\*\*: SESSION-2026-05-23_01/,
    );
  });

  test("status DEFERRED with rationale flips to DEFERRED and folds rationale into outcome", async () => {
    const code = await setPartDoneCli([
      ...baseArgs(planPath, projectRoot),
      "--status",
      "DEFERRED",
      "--rationale",
      "blocked on upstream ADR",
    ]);
    expect(code).toBe(0);
    const after = await Bun.file(planPath).text();
    expect(after).toMatch(/### spec\.SPEC-001[\s\S]*?- \*\*Substatus\*\*: DEFERRED/);
    expect(after).toContain("(deferred: blocked on upstream ADR)");
  });

  test("status ABANDONED with rationale flips to ABANDONED", async () => {
    const code = await setPartDoneCli([
      ...baseArgs(planPath, projectRoot),
      "--status",
      "ABANDONED",
      "--rationale",
      "scope cut",
    ]);
    expect(code).toBe(0);
    const after = await Bun.file(planPath).text();
    expect(after).toMatch(/### spec\.SPEC-001[\s\S]*?- \*\*Substatus\*\*: ABANDONED/);
    expect(after).toContain("(abandoned: scope cut)");
  });

  test("exit 2: DEFERRED without rationale (rationale-required invariant)", async () => {
    const code = await setPartDoneCli([...baseArgs(planPath, projectRoot), "--status", "DEFERRED"]);
    expect(code).toBe(2);
    // PLAN unchanged — no mutation ran.
    expect(await Bun.file(planPath).text()).toBe(planFixture());
  });

  test("exit 2: ABANDONED with blank rationale (rationale-required invariant)", async () => {
    const code = await setPartDoneCli([
      ...baseArgs(planPath, projectRoot),
      "--status",
      "ABANDONED",
      "--rationale",
      "   ",
    ]);
    expect(code).toBe(2);
    expect(await Bun.file(planPath).text()).toBe(planFixture());
  });

  test("idempotency: re-running DONE is a byte-identical no-op (exit 0)", async () => {
    const first = await setPartDoneCli(baseArgs(planPath, projectRoot));
    expect(first).toBe(0);
    const afterFirst = await Bun.file(planPath).text();

    const second = await setPartDoneCli(baseArgs(planPath, projectRoot));
    expect(second).toBe(0);
    const afterSecond = await Bun.file(planPath).text();

    expect(afterSecond).toBe(afterFirst);
  });

  test("exit 2 on invalid --status value", async () => {
    const code = await setPartDoneCli([...baseArgs(planPath, projectRoot), "--status", "WIP"]);
    expect(code).toBe(2);
  });

  test("exit 2 on missing required flag (--outcome omitted)", async () => {
    const code = await setPartDoneCli([
      "--plan-path",
      planPath,
      "--part-id",
      PART,
      "--owning-session",
      SESSION,
      "--at-event",
      "42",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(2);
  });

  test("exit 2 on non-positive --at-event", async () => {
    const code = await setPartDoneCli([
      "--plan-path",
      planPath,
      "--part-id",
      PART,
      "--outcome",
      OUTCOME,
      "--owning-session",
      SESSION,
      "--at-event",
      "0",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(2);
  });

  test("exit 2 on path-containment violation (plan outside project root)", async () => {
    const outside = await mkdtemp(join(tmpdir(), "set-part-done-outside-"));
    try {
      const code = await setPartDoneCli([
        ...baseArgs(join(outside, "PLAN-001-evil.md"), projectRoot),
      ]);
      expect(code).toBe(2);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  test("exit 2 on traversal path that escapes project root", async () => {
    const code = await setPartDoneCli([
      ...baseArgs(join(projectRoot, "..", "escape.md"), projectRoot),
    ]);
    expect(code).toBe(2);
  });

  test("exit 2 when the plan file does not exist", async () => {
    const code = await setPartDoneCli([
      ...baseArgs(join(projectRoot, "docs", "planning", "PLAN-999-missing.md"), projectRoot),
    ]);
    expect(code).toBe(2);
  });

  test("exit 1 on mutation failure (unknown part-id)", async () => {
    const code = await setPartDoneCli([
      "--plan-path",
      planPath,
      "--part-id",
      "spec.SPEC-999",
      "--outcome",
      OUTCOME,
      "--owning-session",
      SESSION,
      "--at-event",
      "42",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(1);
  });

  test("exit 1 on mutation failure (part not IN_PROGRESS — from mismatch)", async () => {
    // research is DONE; targeting a DIFFERENT terminal status forces the
    // mutation's `from: IN_PROGRESS` guard to fire (DONE ≠ IN_PROGRESS).
    const code = await setPartDoneCli([
      "--plan-path",
      planPath,
      "--part-id",
      "research",
      "--outcome",
      OUTCOME,
      "--owning-session",
      SESSION,
      "--at-event",
      "42",
      "--status",
      "ABANDONED",
      "--rationale",
      "force from-mismatch",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(1);
  });
});
