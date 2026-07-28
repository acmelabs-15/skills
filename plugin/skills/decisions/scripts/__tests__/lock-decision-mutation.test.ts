import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lockDecisionCli } from "../lock-decision-mutation.ts";

/**
 * Round-trippable PLAN fixture with a `decisions.1` part in IN_PROGRESS that
 * carries two pending decisions. Locking the final decision (D-2) flips the
 * part substatus IN_PROGRESS → DONE. Authored from the canonical renderer
 * output shape (shared/composition/src/renderers/plan-note.ts) so it parses
 * and re-renders without drift.
 */
function planFixture(): string {
  return [
    "---",
    'title: "PLAN-001: Lock Decision Fixture"',
    "type: plan",
    "status: IN_PROGRESS",
    "complexity_tier: TIER_3",
    "branches:",
    "  - feat/plan-001-lock-decision",
    "permalink: planning/plan-001-lock-decision",
    "tags:",
    "  - plan",
    "  - fixture",
    "  - decisions",
    "---",
    "",
    "# PLAN-001: Lock Decision Fixture",
    "",
    "## Scope",
    "",
    "Fixture exercising the lock-decision mutation wrapper.",
    "",
    "## Objectives",
    "",
    "- [ ] Lock every decision in decisions.1",
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
    "### decisions.1",
    "",
    "- **Phase**: decisions",
    "- **Title**: Lock ADR-001",
    "- **Substatus**: IN_PROGRESS",
    "- **Owning Session**: SESSION-2026-05-23_01",
    "- **Source Artifacts**: [[ANALYSIS-001: Sample]]",
    "- **Depends On**: research",
    "",
    "**DoD**:",
    "",
    "- [ ] ADR ACCEPTED",
    "",
    "**Decisions**:",
    "",
    "| ID | Status | Topic |",
    "|:--|:--|:--|",
    "| D-1 | LOCKED | Use Zod |",
    "| D-2 | PENDING | Use unified+remark |",
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
    "- [fact] Round-trip property test gates correctness #proof",
    "- [constraint] SHA-256 char-identity required #invariant",
    "",
    "## Relations",
    "",
    "- implements [[ADR-005: Per-Skill Scripts]]",
    "- depends_on [[ANALYSIS-002: Sample]]",
    "",
  ].join("\n");
}

describe("lockDecisionCli", () => {
  let projectRoot: string;
  let planPath: string;
  const session = "SESSION-2026-05-23_01";

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "lock-decision-"));
    planPath = join(projectRoot, "docs", "planning", "PLAN-001-fixture.md");
    await Bun.write(planPath, planFixture());
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  test("locking the final pending decision flips decisions.1 substatus IN_PROGRESS → DONE", async () => {
    const code = await lockDecisionCli([
      "--plan-path",
      planPath,
      "--decision-id",
      "D-2",
      "--option-text",
      "Use unified+remark",
      "--part-id",
      "decisions.1",
      "--owning-session",
      session,
      "--at-event",
      "12",
      "--project-root",
      projectRoot,
    ]);

    expect(code).toBe(0);
    const after = await Bun.file(planPath).text();
    // Decision entry is now LOCKED.
    expect(after).toContain("| D-2 | LOCKED | Use unified+remark |");
    // Part substatus flipped to DONE (all decisions locked).
    expect(after).toMatch(/### decisions\.1[\s\S]*?- \*\*Substatus\*\*: DONE/);
  });

  test("idempotency: re-running the same lock is a byte-identical no-op (exit 0, no rewrite)", async () => {
    const args = [
      "--plan-path",
      planPath,
      "--decision-id",
      "D-2",
      "--option-text",
      "Use unified+remark",
      "--part-id",
      "decisions.1",
      "--owning-session",
      session,
      "--at-event",
      "12",
      "--project-root",
      projectRoot,
    ];

    const first = await lockDecisionCli(args);
    expect(first).toBe(0);
    const afterFirst = await Bun.file(planPath).text();

    const second = await lockDecisionCli(args);
    expect(second).toBe(0);
    const afterSecond = await Bun.file(planPath).text();

    expect(afterSecond).toBe(afterFirst);
  });

  test("locking a non-final decision leaves substatus IN_PROGRESS", async () => {
    // Reset D-1 to PENDING by re-writing a variant where neither is locked.
    const variant = planFixture().replace(
      "| D-1 | LOCKED | Use Zod |",
      "| D-1 | PENDING | Use Zod |",
    );
    await Bun.write(planPath, variant);

    const code = await lockDecisionCli([
      "--plan-path",
      planPath,
      "--decision-id",
      "D-1",
      "--option-text",
      "Use Zod",
      "--part-id",
      "decisions.1",
      "--owning-session",
      session,
      "--at-event",
      "12",
      "--project-root",
      projectRoot,
    ]);

    expect(code).toBe(0);
    const after = await Bun.file(planPath).text();
    expect(after).toContain("| D-1 | LOCKED | Use Zod |");
    expect(after).toMatch(/### decisions\.1[\s\S]*?- \*\*Substatus\*\*: IN_PROGRESS/);
  });

  test("exit 2 on missing required flag", async () => {
    const code = await lockDecisionCli([
      "--plan-path",
      planPath,
      "--decision-id",
      "D-2",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(2);
  });

  test("exit 2 on path-containment violation (plan outside project root)", async () => {
    const outside = await mkdtemp(join(tmpdir(), "lock-decision-outside-"));
    try {
      const code = await lockDecisionCli([
        "--plan-path",
        join(outside, "PLAN-001-evil.md"),
        "--decision-id",
        "D-2",
        "--option-text",
        "Use unified+remark",
        "--part-id",
        "decisions.1",
        "--owning-session",
        session,
        "--at-event",
        "12",
        "--project-root",
        projectRoot,
      ]);
      expect(code).toBe(2);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  test("exit 2 on traversal path that escapes project root", async () => {
    const code = await lockDecisionCli([
      "--plan-path",
      join(projectRoot, "..", "escape.md"),
      "--decision-id",
      "D-2",
      "--option-text",
      "Use unified+remark",
      "--part-id",
      "decisions.1",
      "--owning-session",
      session,
      "--at-event",
      "12",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(2);
  });

  test("exit 1 on mutation failure (unknown part-id)", async () => {
    const code = await lockDecisionCli([
      "--plan-path",
      planPath,
      "--decision-id",
      "D-2",
      "--option-text",
      "Use unified+remark",
      "--part-id",
      "decisions.99",
      "--owning-session",
      session,
      "--at-event",
      "12",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(1);
  });
});
