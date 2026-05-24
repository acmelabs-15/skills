import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { type PlanMutation, applyPlanMutation } from "../src/mutations/plan-mutations.js";
import { applySessionMutation } from "../src/mutations/session-mutations.js";
import { parsePlanNote } from "../src/parsers/plan-note.js";
import { parseSessionNote } from "../src/parsers/session-note.js";
import { renderSessionNote } from "../src/renderers/session-note.js";
import type { Event, SessionNote } from "../src/schemas/session-note.js";

/**
 * Mutation invariant tests (TASK-026-SPEC-008).
 *
 * Closes two of the three gaps surfaced in ADR-005 D-3 Phase 3 critic P1.2
 * (REQ-007 AC-4): backward-transition rejection and double-apply idempotency.
 * The third gap (duplicate-event-number rejection) lives in TASK-027.
 *
 * Discovered semantics (probed against the real applyPlanMutation, NOT assumed):
 *
 * 1. Backward transition has NO standalone direction guard in the mutation
 *    layer. `transition-impl-item` uses its `from` field as an
 *    optimistic-concurrency check — it throws only when `from` mismatches the
 *    item's current status. Declaring `from: "DONE", to: "IN_PROGRESS"` on an
 *    item that is genuinely DONE passes the `from` check and, in isolation,
 *    mutates the item backward without error.
 *
 *    The REAL backward-transition rejection comes from the PlanNoteSchema
 *    cross-field invariant: once the paired qa item is DONE, the schema
 *    requires its paired impl item to remain DONE. Walking impl backward
 *    (DONE → IN_PROGRESS) while qa is DONE orphans that pairing, so the
 *    re-validation inside applyPlanMutation rejects it with a recognizable
 *    message: "qa item ... status DONE requires paired impl ... to be DONE".
 *    That is the direction-specific, invariant-backed rejection asserted below.
 */

const fixturePath = join(import.meta.dir, "fixtures", "plan-note-sample.md");

async function loadFixture(): Promise<string> {
  return Bun.file(fixturePath).text();
}

function applyChain(md: string, mutations: PlanMutation[]): string {
  return mutations.reduce((acc, m) => applyPlanMutation(acc, m), md);
}

const BUILD_PART = "build.SPEC-007";
const TASK_REF = "TASK-001-SPEC-007";
const SESSION = "SESSION-2026-05-20_04";

/** Drive impl DONE, then qa DONE — the all-DONE precondition for a build part. */
function driveImplAndQaToDone(md: string): string {
  return applyChain(md, [
    {
      type: "transition-impl-item",
      partId: BUILD_PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: SESSION,
      at_event: 5,
    },
    {
      type: "transition-qa-item",
      partId: BUILD_PART,
      taskRef: TASK_REF,
      from: "PENDING",
      to: "IN_PROGRESS",
      owning_session: SESSION,
      at_event: 6,
    },
    {
      type: "transition-qa-item",
      partId: BUILD_PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: SESSION,
      at_event: 7,
      test_report_ref: "TEST-REPORT-001-SPEC-007",
    },
  ]);
}

function implStatus(md: string): string | undefined {
  const part = parsePlanNote(md).parts.find((p) => p.id === BUILD_PART);
  return part?.build_workflow_items?.find((i) => i.type === "impl")?.status;
}

describe("mutation invariants — backward transition", () => {
  test("rejects backward impl transition DONE → IN_PROGRESS when paired qa is DONE", async () => {
    const md = await loadFixture();
    const allDone = driveImplAndQaToDone(md);
    // Sanity: precondition reached.
    expect(implStatus(allDone)).toBe("DONE");

    // Backward move: impl DONE → IN_PROGRESS. The schema cross-field invariant
    // (qa-DONE requires paired impl-DONE) rejects the re-validation. The `from`
    // is declared honestly as "DONE", so the optimistic-concurrency check
    // passes and the invariant — not a from-mismatch — is what fires.
    expect(() =>
      applyPlanMutation(allDone, {
        type: "transition-impl-item",
        partId: BUILD_PART,
        taskRef: TASK_REF,
        from: "DONE",
        to: "IN_PROGRESS",
        owning_session: SESSION,
        at_event: 8,
      }),
    ).toThrow(/requires paired impl-TASK-001-SPEC-007 to be DONE/);
  });

  test("forward impl transition IN_PROGRESS → DONE succeeds (rejection is direction-specific)", async () => {
    const md = await loadFixture();
    // Positive control: the same item, same mutation type, opposite direction,
    // from the fixture's initial IN_PROGRESS state — must succeed, proving the
    // rejection above is direction-specific, not an absolute block on the item.
    const out = applyPlanMutation(md, {
      type: "transition-impl-item",
      partId: BUILD_PART,
      taskRef: TASK_REF,
      from: "IN_PROGRESS",
      to: "DONE",
      owning_session: SESSION,
      at_event: 5,
    });
    expect(implStatus(out)).toBe("DONE");
  });

  test("forward → backward asymmetry holds on the same item within one chain", async () => {
    const md = await loadFixture();
    // Forward leg succeeds (impl + qa driven to DONE).
    const forward = driveImplAndQaToDone(md);
    expect(implStatus(forward)).toBe("DONE");
    // Backward leg on that same item is rejected — same item, both directions,
    // proving the asymmetry is in the transition, not the item.
    expect(() =>
      applyPlanMutation(forward, {
        type: "transition-impl-item",
        partId: BUILD_PART,
        taskRef: TASK_REF,
        from: "DONE",
        to: "IN_PROGRESS",
        owning_session: SESSION,
        at_event: 9,
      }),
    ).toThrow(/requires paired impl-TASK-001-SPEC-007 to be DONE/);
  });
});

describe("mutation invariants — double-apply idempotency", () => {
  /**
   * Idempotency contract: applying a mutation that sets a value to a target,
   * then applying the identical mutation again on the once-mutated state,
   * yields byte-identical rendered output. State hash via Bun.hash over the
   * rendered markdown is the simplest equality witness (per TASK observation).
   *
   * Three mutation types where idempotency is the genuine intended contract:
   *
   * - flip-dod-item (done: true): sets a checkbox to a fixed boolean. No
   *   precondition on prior state; re-applying re-sets the same value.
   * - lock-decision (same topic): upserts a decision to LOCKED with a topic.
   *   The upsert finds the existing LOCKED entry and rewrites identical fields.
   * - set-part-substatus (DONE → DONE): the `from` guard accepts the current
   *   substatus and writes the same target. A no-op transition by design.
   *
   * Excluded as NON-idempotent by design: transition-impl-item /
   * transition-qa-item / transition-task all consume the `from` state — a
   * second apply with the same `from` throws (the first apply changed the
   * status), so they are intentionally single-shot. add-task throws on
   * duplicate id. add-blocker appends unconditionally (grows on each apply).
   */

  function hashOf(md: string): bigint {
    return Bun.hash(md) as bigint;
  }

  test("flip-dod-item (done:true) is idempotent on double apply", async () => {
    const md = await loadFixture();
    const once = applyPlanMutation(md, {
      type: "flip-dod-item",
      partId: BUILD_PART,
      dodIndex: 0,
      done: true,
    });
    const twice = applyPlanMutation(once, {
      type: "flip-dod-item",
      partId: BUILD_PART,
      dodIndex: 0,
      done: true,
    });
    expect(hashOf(twice)).toBe(hashOf(once));
    expect(twice).toBe(once);
  });

  test("lock-decision (same topic) is idempotent on double apply", async () => {
    const md = await loadFixture();
    const once = applyPlanMutation(md, {
      type: "lock-decision",
      partId: "decisions.1",
      decisionId: "D-1",
      topic: "Use Zod",
    });
    const twice = applyPlanMutation(once, {
      type: "lock-decision",
      partId: "decisions.1",
      decisionId: "D-1",
      topic: "Use Zod",
    });
    expect(hashOf(twice)).toBe(hashOf(once));
    expect(twice).toBe(once);
  });

  test("set-part-substatus (DONE → DONE) is idempotent on double apply", async () => {
    const md = await loadFixture();
    // The fixture's `research` part is already DONE with an outcome; a
    // DONE → DONE transition restating the outcome is a structural no-op.
    const once = applyPlanMutation(md, {
      type: "set-part-substatus",
      partId: "research",
      from: "DONE",
      to: "DONE",
      outcome: "[[ANALYSIS-001: Sample]]",
    });
    const twice = applyPlanMutation(once, {
      type: "set-part-substatus",
      partId: "research",
      from: "DONE",
      to: "DONE",
      outcome: "[[ANALYSIS-001: Sample]]",
    });
    expect(hashOf(twice)).toBe(hashOf(once));
    expect(twice).toBe(once);
  });
});

// drift-marker: SESSION-2026-05-21_01-duplicate-events — killed-agent re-entry produced Event 36/37/38 duplicates
describe("session mutation duplicate-event-number rejection", () => {
  /**
   * Regression-locks the Phase X drift surface where SESSION-2026-05-21_01
   * acquired duplicate Event 36 / 37 / 38 after a killed-agent re-entry.
   *
   * As-built semantics (probed against the real applySessionMutation /
   * SessionNoteSchema, NOT assumed — DoD amended 2026-05-24 to match):
   *
   * The append API auto-assigns `n` (`nextN = events.length + 1`), so a caller
   * CANNOT request a duplicate number directly. A duplicate is realized by
   * feeding a session note whose markdown ALREADY contains two `## Event 05`
   * headings (the killed-agent re-entry failure mode). The two headings carry
   * distinct titles so they are distinct H2 sections, but both parse to n=5.
   * The events array becomes [1,2,3,4,5,5,6,7,8,9,10]; the SessionNoteSchema
   * continuity superRefine fires at index 5 (event.n=5, expected n=6) with the
   * message `Event n=5 at index 5: expected n=6`. applySessionMutation parses
   * the note first, so the rejection surfaces at that parse step — before any
   * append is applied.
   */

  const EVENT_COUNT = 10;
  const DUPLICATE_N = 5;

  /** Build a valid session-note model with session-start + (count-1) state-change events. */
  function buildSessionModel(count: number): SessionNote {
    const events: Event[] = [{ n: 1, type: "session-start", title: "Kickoff", project: "skills" }];
    for (let n = 2; n <= count; n++) {
      events.push({
        n,
        type: "state-change",
        title: `Change ${n}`,
        scope: "plan",
        target: "PLAN-001-SPEC-008",
      });
    }
    return {
      frontmatter: {
        title: "SESSION-2026-05-21_01: Duplicate Event Regression",
        type: "session",
        status: "IN_PROGRESS",
        binds_to: ["PLAN-001-SPEC-008"],
        permalink: "sessions/session-2026-05-21_01-duplicate-event-regression",
        tags: ["session", "spec-008"],
      },
      scope: "Regression fixture for duplicate-event-number rejection.",
      bound_plans: [{ ref: "[[PLAN-001-SPEC-008: Sample]]", worked_parts: ["build.SPEC-008"] }],
      events,
      observations: [
        { category: "fact", text: "Synthesized clean Event 01-10 ledger", tags: ["fixture"] },
        { category: "fact", text: "Continuity invariant holds when sequential", tags: ["fixture"] },
        { category: "fact", text: "Duplicate realized via string insertion", tags: ["fixture"] },
      ],
      relations: [
        { verb: "part_of", target: "PLAN-001-SPEC-008: Sample" },
        { verb: "relates_to", target: "SPEC-008: Protocol Hardening Wave 2" },
      ],
    };
  }

  /** Clean session note containing exactly `## Event 01` through `## Event 10`. */
  function cleanSessionMarkdown(): string {
    return renderSessionNote(buildSessionModel(EVENT_COUNT));
  }

  /**
   * Inject a SECOND `## Event 05` block (distinct title → distinct H2 section,
   * same parsed n=5) immediately after the first, producing the pre-duplicated
   * note a killed-agent re-entry would leave behind.
   */
  function withDuplicateEvent05(markdown: string): string {
    const dupeBlock = [
      `## Event ${String(DUPLICATE_N).padStart(2, "0")} — Dupe Five (killed-agent re-entry)`,
      "",
      "- **Type**: state-change",
      "- **Scope**: plan",
      "- **Target**: PLAN-001-SPEC-008",
      "",
    ].join("\n");
    // Anchor on the NEXT event's heading so the duplicate lands between Event 05
    // and Event 06, keeping the array order [1,2,3,4,5,5,6,...].
    const anchor = "## Event 06 — Change 6";
    expect(markdown).toContain(anchor);
    return markdown.replace(anchor, `${dupeBlock}${anchor}`);
  }

  test("synthesized clean note parses with a continuous Event 01-10 ledger", () => {
    const clean = cleanSessionMarkdown();
    const parsed = parseSessionNote(clean);
    expect(parsed.events).toHaveLength(EVENT_COUNT);
    expect(parsed.events.map((e) => e.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("rejects a session note containing a duplicate Event 05 with a continuity-violation message", () => {
    const duplicated = withDuplicateEvent05(cleanSessionMarkdown());
    // applySessionMutation parses first, so the duplicate surfaces at parse-time.
    // The continuity superRefine fires at the first out-of-sequence index: the
    // duplicate n=5 sits at index 5 where n=6 was expected. Message identifies
    // the conflicting number via `n=5`.
    expect(() =>
      applySessionMutation(duplicated, {
        type: "append-event",
        event: { type: "state-change", title: "Next", scope: "plan", target: "PLAN-001-SPEC-008" },
      }),
    ).toThrow(/expected n=\d+/);
    expect(() =>
      applySessionMutation(duplicated, {
        type: "append-event",
        event: { type: "state-change", title: "Next", scope: "plan", target: "PLAN-001-SPEC-008" },
      }),
    ).toThrow(/n=5/);
    // Direct parse surfaces the same continuity violation.
    expect(() => parseSessionNote(duplicated)).toThrow(/expected n=\d+/);
  });

  test("positive control: appending Event 11 to a clean ledger succeeds", () => {
    const clean = cleanSessionMarkdown();
    // Same mutation type, clean (non-duplicated) note → next sequential number
    // is auto-assigned and accepted, proving the rejection is duplicate-specific.
    const out = applySessionMutation(clean, {
      type: "append-event",
      event: {
        type: "state-change",
        title: "Eleventh",
        scope: "plan",
        target: "PLAN-001-SPEC-008",
      },
    });
    const reparsed = parseSessionNote(out);
    expect(reparsed.events).toHaveLength(EVENT_COUNT + 1);
    expect(reparsed.events.at(-1)?.n).toBe(EVENT_COUNT + 1);
    expect(out).toContain("## Event 11 — Eleventh");
  });
});
