import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderPlanNote } from "@acmelabs/models/renderers/plan-note";
import type { BuildWorkflowStatus, PlanNote } from "@acmelabs/models/schemas/plan-note";
import { transitionImplItemCli } from "./transition-impl-item.ts";

const SESSION = "SESSION-2026-05-23_01";

/**
 * Build a round-trippable PLAN fixture with a `build.SPEC-008` part in
 * IN_PROGRESS that carries an impl + qa pair for TASK-012-SPEC-008. The impl
 * item starts PENDING. Rendered via the canonical renderer so it parses and
 * re-renders without drift — the mutation wrapper round-trips through the same
 * parser/renderer the model came from.
 */
function planFixture(implStatus: BuildWorkflowStatus = "PENDING"): string {
  const plan: PlanNote = {
    frontmatter: {
      title: "PLAN-001: Transition Impl Item Fixture",
      type: "plan",
      status: "IN_PROGRESS",
      complexity_tier: "TIER_3",
      branches: ["feat/plan-001-transition-impl-item"],
      permalink: "planning/plan-001-transition-impl-item",
      tags: ["plan", "fixture", "build"],
    },
    scope: "Fixture exercising the transition-impl-item mutation wrapper.",
    objectives: [{ id: "OBJ-1", text: "Transition impl items in build.SPEC-008", done: false }],
    parts: [
      {
        id: "build.SPEC-008",
        phase: "build",
        title: "Build SPEC-008",
        substatus: "IN_PROGRESS",
        owning_session: SESSION,
        source_artifacts: ["[[SPEC-008: Sample]]"],
        depends_on: [],
        dod: [{ text: "All tasks DONE", done: false }],
        build_workflow_items: [
          {
            id: "impl-TASK-012-SPEC-008",
            type: "impl",
            task_ref: "TASK-012-SPEC-008",
            status: implStatus,
            failed_iterations: 0,
          },
          {
            id: "qa-TASK-012-SPEC-008",
            type: "qa",
            task_ref: "TASK-012-SPEC-008",
            status: "PENDING",
            failed_iterations: 0,
          },
        ],
      },
    ],
    tasks: [],
    pending_decisions: [],
    editor_mirror: [],
    blockers: [],
    observations: [
      { category: "decision", text: "Markdown is authoritative state", tags: ["adr-003"] },
      { category: "fact", text: "Round-trip property test gates correctness", tags: ["proof"] },
      {
        category: "constraint",
        text: "Session context mandated on transition",
        tags: ["invariant"],
      },
    ],
    relations: [
      { verb: "implements", target: "[[SPEC-008: Sample]]" },
      { verb: "depends_on", target: "[[ANALYSIS-001: Sample]]" },
    ],
  };
  return renderPlanNote(plan);
}

/**
 * Variant where the impl item is DONE and its paired qa is IN_PROGRESS — a
 * valid starting state (qa IN_PROGRESS requires impl DONE). Transitioning the
 * impl DONE → PENDING leaves qa IN_PROGRESS with a non-DONE impl, which trips
 * the PlanNoteSchema cross-field invariant at re-validation time → exit 1.
 */
function planFixtureImplDoneQaInProgress(): string {
  const base = planFixture("DONE");
  return base.replace(
    /(#### qa-TASK-012-SPEC-008[\s\S]*?- \*\*Status\*\*: )PENDING/,
    "$1IN_PROGRESS",
  );
}

describe("transitionImplItemCli", () => {
  let projectRoot: string;
  let planPath: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "transition-impl-"));
    planPath = join(projectRoot, "docs", "planning", "PLAN-001-fixture.md");
    await Bun.write(planPath, planFixture());
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  function baseArgs(overrides: Record<string, string> = {}): string[] {
    const flags: Record<string, string> = {
      "--plan-path": planPath,
      "--part-id": "build.SPEC-008",
      "--task-ref": "TASK-012-SPEC-008",
      "--from": "PENDING",
      "--to": "IN_PROGRESS",
      "--owning-session": SESSION,
      "--at-event": "12",
      "--project-root": projectRoot,
      ...overrides,
    };
    return Object.entries(flags).flat();
  }

  // DoD #4 — exit 0 on a successful PENDING → IN_PROGRESS transition.
  test("exit 0 on successful PENDING → IN_PROGRESS transition with all required args", async () => {
    const code = await transitionImplItemCli(baseArgs());
    expect(code).toBe(0);

    const after = await Bun.file(planPath).text();
    expect(after).toMatch(/#### impl-TASK-012-SPEC-008[\s\S]*?- \*\*Status\*\*: IN_PROGRESS/);
    // Session context written through.
    expect(after).toMatch(
      /#### impl-TASK-012-SPEC-008[\s\S]*?- \*\*Owning Session\*\*: SESSION-2026-05-23_01/,
    );
    expect(after).toMatch(/#### impl-TASK-012-SPEC-008[\s\S]*?- \*\*Transitioned At Event\*\*: 12/);
  });

  // DoD #5 — exit 1 on a transition that violates PLAN schema cross-field
  // invariants at re-validation time. The on-disk fixture is valid (impl DONE,
  // qa IN_PROGRESS). Transitioning impl DONE → PENDING leaves qa IN_PROGRESS
  // with a non-DONE paired impl, tripping PlanNoteSchema.superRefine inside
  // applyPlanMutation → caught → exit 1.
  test("exit 1 on transition that violates PLAN schema cross-field invariant (qa IN_PROGRESS needs impl DONE)", async () => {
    await Bun.write(planPath, planFixtureImplDoneQaInProgress());
    const code = await transitionImplItemCli(baseArgs({ "--from": "DONE", "--to": "PENDING" }));
    expect(code).toBe(1);
  });

  // Companion mutation-failure path: the mutation's own pre-check fires when the
  // declared `from` does not match the item's actual status (also exit 1).
  test("exit 1 on transition whose declared 'from' mismatches the item status (mutation failure)", async () => {
    const code = await transitionImplItemCli(baseArgs({ "--from": "IN_PROGRESS" }));
    expect(code).toBe(1);
  });

  // DoD #6 — exit 2 on missing required arg (owning-session omitted).
  test("exit 2 on missing required --owning-session", async () => {
    const args = baseArgs();
    const idx = args.indexOf("--owning-session");
    args.splice(idx, 2); // remove flag + value
    const code = await transitionImplItemCli(args);
    expect(code).toBe(2);
  });

  // DoD #6 — exit 2 on missing required arg (at-event omitted).
  test("exit 2 on missing required --at-event", async () => {
    const args = baseArgs();
    const idx = args.indexOf("--at-event");
    args.splice(idx, 2);
    const code = await transitionImplItemCli(args);
    expect(code).toBe(2);
  });

  test("exit 2 on non-positive --at-event", async () => {
    const code = await transitionImplItemCli(baseArgs({ "--at-event": "0" }));
    expect(code).toBe(2);
  });

  test("exit 2 on path-containment violation (plan outside project root)", async () => {
    const outside = await mkdtemp(join(tmpdir(), "transition-impl-outside-"));
    try {
      const code = await transitionImplItemCli(
        baseArgs({ "--plan-path": join(outside, "PLAN-001-evil.md") }),
      );
      expect(code).toBe(2);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  test("exit 2 on traversal path that escapes project root", async () => {
    const code = await transitionImplItemCli(
      baseArgs({ "--plan-path": join(projectRoot, "..", "escape.md") }),
    );
    expect(code).toBe(2);
  });

  test("exit 1 on mutation failure (unknown part-id)", async () => {
    const code = await transitionImplItemCli(baseArgs({ "--part-id": "build.SPEC-999" }));
    expect(code).toBe(1);
  });

  test("exit 0 idempotent no-op when re-running after the transition", async () => {
    const first = await transitionImplItemCli(baseArgs());
    expect(first).toBe(0);
    // Re-running the same PENDING → IN_PROGRESS now fails (item is IN_PROGRESS,
    // not PENDING) — so a true idempotent re-run uses the new from/to.
    const after = await Bun.file(planPath).text();
    const reArgs = baseArgs({ "--from": "IN_PROGRESS", "--to": "IN_PROGRESS" });
    const second = await transitionImplItemCli(reArgs);
    expect(second).toBe(0);
    expect(await Bun.file(planPath).text()).toBe(after);
  });
});
