import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyPlanMutation } from "../../../shared/composition/src/mutations/plan-mutations.ts";
import { transitionQaItemCli } from "./transition-qa-item.ts";

const SESSION = "SESSION-2026-05-24_01";
const PART = "build.SPEC-007";
const TASK_REF = "TASK-001-SPEC-007";
const TEST_REPORT = "TEST-REPORT-001-SPEC-007";

/**
 * Hermetic PLAN fixture with a `build.SPEC-007` part carrying a paired
 * impl + qa item. impl starts IN_PROGRESS, qa starts PENDING — the minimal
 * state for exercising every transition-qa-item invariant. Authored from the
 * canonical renderer output shape (shared/composition/src/renderers/plan-note.ts)
 * so it parses and re-renders without drift.
 */
function planFixture(): string {
  return [
    "---",
    'title: "PLAN-001: Transition QA Fixture"',
    "type: plan",
    "status: IN_PROGRESS",
    "complexity_tier: TIER_3",
    "branches:",
    "  - feat/plan-001-transition-qa",
    "permalink: planning/plan-001-transition-qa",
    "tags:",
    "  - plan",
    "  - fixture",
    "  - build",
    "---",
    "",
    "# PLAN-001: Transition QA Fixture",
    "",
    "## Scope",
    "",
    "Fixture exercising the transition-qa-item mutation wrapper.",
    "",
    "## Objectives",
    "",
    "- [ ] Advance qa items through the build cycle",
    "",
    "## Phase Progression",
    "",
    "### build.SPEC-007",
    "",
    "- **Phase**: build",
    "- **Title**: Build SPEC-007",
    "- **Substatus**: IN_PROGRESS",
    "- **Owning Session**: SESSION-2026-05-24_01",
    "- **Source Artifacts**: [[SPEC-007: Sample]]",
    "- **Depends On**: (none)",
    "",
    "**DoD**:",
    "",
    "- [ ] All tasks DONE",
    "",
    "**Build Workflow Items**:",
    "",
    "#### impl-TASK-001-SPEC-007",
    "",
    "- **Type**: impl",
    "- **Task Ref**: TASK-001-SPEC-007",
    "- **Status**: IN_PROGRESS",
    "- **Owning Session**: —",
    "- **Transitioned At Event**: —",
    "- **Failed Iterations**: 0",
    "- **Test Report Ref**: —",
    "- **Fix Brief For Event**: —",
    "",
    "#### qa-TASK-001-SPEC-007",
    "",
    "- **Type**: qa",
    "- **Task Ref**: TASK-001-SPEC-007",
    "- **Status**: PENDING",
    "- **Owning Session**: —",
    "- **Transitioned At Event**: —",
    "- **Failed Iterations**: 0",
    "- **Test Report Ref**: —",
    "- **Fix Brief For Event**: —",
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

/** Advance the paired impl item IN_PROGRESS → DONE (composition mutation, no sibling dependency). */
function implDoneMarkdown(markdown: string): string {
  return applyPlanMutation(markdown, {
    type: "transition-impl-item",
    partId: PART,
    taskRef: TASK_REF,
    from: "IN_PROGRESS",
    to: "DONE",
    owning_session: SESSION,
    at_event: 5,
  });
}

/** Advance the paired impl item IN_PROGRESS → DONE and advance qa PENDING → IN_PROGRESS. */
function readyForQaDone(markdown: string): string {
  return applyPlanMutation(implDoneMarkdown(markdown), {
    type: "transition-qa-item",
    partId: PART,
    taskRef: TASK_REF,
    from: "PENDING",
    to: "IN_PROGRESS",
    owning_session: SESSION,
    at_event: 6,
  });
}

describe("transitionQaItemCli", () => {
  let projectRoot: string;
  let planPath: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "transition-qa-"));
    planPath = join(projectRoot, "docs", "planning", "PLAN-001-fixture.md");
    await Bun.write(planPath, planFixture());
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  function baseArgs(overrides: string[]): string[] {
    return [
      "--plan-path",
      planPath,
      "--part-id",
      PART,
      "--task-ref",
      TASK_REF,
      "--owning-session",
      SESSION,
      "--project-root",
      projectRoot,
      ...overrides,
    ];
  }

  // DoD item 3: exit 1 when transitioning to DONE without test_report_ref.
  test("exit 1 transitioning to DONE without --test-report-ref", async () => {
    await Bun.write(planPath, readyForQaDone(planFixture()));
    const code = await transitionQaItemCli(
      baseArgs(["--from", "IN_PROGRESS", "--to", "DONE", "--at-event", "7"]),
    );
    expect(code).toBe(1);
  });

  // DoD item 4: exit 1 when the paired impl-item is not yet DONE.
  test("exit 1 transitioning qa to IN_PROGRESS while paired impl is not DONE", async () => {
    const code = await transitionQaItemCli(
      baseArgs(["--from", "PENDING", "--to", "IN_PROGRESS", "--at-event", "6"]),
    );
    expect(code).toBe(1);
  });

  // DoD item 5: exit 0 on a successful IN_PROGRESS → DONE transition, all invariants met.
  test("exit 0 on IN_PROGRESS → DONE with paired impl DONE and test_report_ref present", async () => {
    await Bun.write(planPath, readyForQaDone(planFixture()));
    const code = await transitionQaItemCli(
      baseArgs([
        "--from",
        "IN_PROGRESS",
        "--to",
        "DONE",
        "--at-event",
        "7",
        "--test-report-ref",
        TEST_REPORT,
      ]),
    );
    expect(code).toBe(0);
    const after = await Bun.file(planPath).text();
    expect(after).toMatch(/#### qa-TASK-001-SPEC-007[\s\S]*?- \*\*Status\*\*: DONE/);
    expect(after).toContain(`- **Test Report Ref**: ${TEST_REPORT}`);
  });

  test("exit 0 advancing qa PENDING → IN_PROGRESS once paired impl is DONE", async () => {
    await Bun.write(planPath, implDoneMarkdown(planFixture()));
    const code = await transitionQaItemCli(
      baseArgs(["--from", "PENDING", "--to", "IN_PROGRESS", "--at-event", "6"]),
    );
    expect(code).toBe(0);
    const after = await Bun.file(planPath).text();
    expect(after).toMatch(/#### qa-TASK-001-SPEC-007[\s\S]*?- \*\*Status\*\*: IN_PROGRESS/);
  });

  test("exit 2 on missing required flag (--part-id absent)", async () => {
    const code = await transitionQaItemCli([
      "--plan-path",
      planPath,
      "--task-ref",
      TASK_REF,
      "--from",
      "PENDING",
      "--to",
      "IN_PROGRESS",
      "--owning-session",
      SESSION,
      "--at-event",
      "6",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(2);
  });

  test("exit 2 on unknown flag", async () => {
    const code = await transitionQaItemCli(baseArgs(["--from", "PENDING", "--bogus", "x"]));
    expect(code).toBe(2);
  });

  test("exit 2 on non-positive --at-event", async () => {
    const code = await transitionQaItemCli(
      baseArgs(["--from", "PENDING", "--to", "IN_PROGRESS", "--at-event", "0"]),
    );
    expect(code).toBe(2);
  });

  test("exit 2 on path-containment violation (plan outside project root)", async () => {
    const outside = await mkdtemp(join(tmpdir(), "transition-qa-outside-"));
    try {
      const code = await transitionQaItemCli([
        "--plan-path",
        join(outside, "PLAN-001-evil.md"),
        "--part-id",
        PART,
        "--task-ref",
        TASK_REF,
        "--from",
        "PENDING",
        "--to",
        "IN_PROGRESS",
        "--owning-session",
        SESSION,
        "--at-event",
        "6",
        "--project-root",
        projectRoot,
      ]);
      expect(code).toBe(2);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  test("exit 2 on traversal path that escapes project root", async () => {
    const code = await transitionQaItemCli([
      "--plan-path",
      join(projectRoot, "..", "escape.md"),
      "--part-id",
      PART,
      "--task-ref",
      TASK_REF,
      "--from",
      "PENDING",
      "--to",
      "IN_PROGRESS",
      "--owning-session",
      SESSION,
      "--at-event",
      "6",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(2);
  });

  test("exit 2 when plan file does not exist", async () => {
    const code = await transitionQaItemCli([
      "--plan-path",
      join(projectRoot, "docs", "planning", "MISSING.md"),
      "--part-id",
      PART,
      "--task-ref",
      TASK_REF,
      "--from",
      "PENDING",
      "--to",
      "IN_PROGRESS",
      "--owning-session",
      SESSION,
      "--at-event",
      "6",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(2);
  });

  test("exit 1 on mutation failure (unknown part-id)", async () => {
    const code = await transitionQaItemCli([
      "--plan-path",
      planPath,
      "--part-id",
      "build.SPEC-999",
      "--task-ref",
      TASK_REF,
      "--from",
      "PENDING",
      "--to",
      "IN_PROGRESS",
      "--owning-session",
      SESSION,
      "--at-event",
      "6",
      "--project-root",
      projectRoot,
    ]);
    expect(code).toBe(1);
  });
});
