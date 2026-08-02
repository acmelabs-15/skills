/**
 * Inter-plan dependencies and BLOCKED-with-a-pointer (R-10, data model only).
 *
 * `BLOCKED` was a substatus with nothing attached. A part could say it was stuck and
 * not what would unstick it, so opening a plan surfaced a dead end and the reader had
 * to remember why. A pointer makes the block followable.
 *
 * Two shapes, because blocks come in two kinds: a part in this plan, or work in
 * another one. Cross-plan references live in their own field rather than widening
 * `depends_on`, which holds part ids and is checked against this plan's own parts —
 * a cross-plan id put there is correctly reported as dangling, and relaxing that
 * check to tolerate unknown ids would lose the guard for the commoner intra-plan case.
 *
 * Enforcement is on WRITE here, unlike the part-id grammar and the verbatim-decision
 * field. BLOCKED is a state something transitions INTO, so there is no corpus of
 * pre-existing blocked parts a requirement could retroactively fail.
 *
 * Routing — who detects out-of-scope work, who spawns the dependency plan — is
 * explicitly not here. This is the data model those decisions will read.
 */
import { describe, expect, test } from "bun:test";
import { parsePlanNote } from "@acmelabs/models/parsers/plan-note";
import { renderPlanNote } from "@acmelabs/models/renderers/plan-note";
import { PlanNoteSchema } from "@acmelabs/models/schemas/plan-note";

/** Two parts, so an intra-plan block has something real to point at. */
const PLAN = `---
title: "PLAN-011: Inter Plan Deps"
type: plan
status: IN_PROGRESS
complexity_tier: TIER_2
branches:
  - feat/inter-plan-deps
permalink: planning/plan-011-inter-plan-deps
tags:
  - plan
  - fixture
---

# PLAN-011: Inter Plan Deps

## Scope

Prove a blocked part records what is blocking it.

## Objectives

- [ ] O-1 Blocks are followable

## Phase Progression

### research

- **Phase**: research
- **Title**: Research
- **Substatus**: DONE
- **Outcome**: ANALYSIS-001 authored
- **Source Artifacts**: (none)
- **Depends On**: (none)

**DoD**:

- [x] done

### review

- **Phase**: review
- **Title**: Review the thing
- **Substatus**: PENDING
- **Source Artifacts**: (none)
- **Depends On**: research

**DoD**:

- [ ] reviewed

## Blockers

(none)

## Observations

- [fact] A blocked part names what blocks it #blocking
- [constraint] Cross-plan refs are a separate field from depends_on #schema
- [insight] Enforced on write, since BLOCKED is transitioned into #validation

## Relations

- part_of [[SPEC-007: Plan/Session Render]]
- relates_to [[ADR-003: Plan/Session Render Architecture]]
`;

/**
 * Set the review part BLOCKED, with whatever `Blocked By` line is given.
 *
 * A review part rather than a build one: `build.SPEC-NNN` parts leaving PENDING must
 * carry per-TASK impl+qa pairs, which is a real rule and unrelated to blocking.
 */
const blocked = (blockedByLine: string): string =>
  PLAN.replace(
    "- **Title**: Review the thing\n- **Substatus**: PENDING",
    `- **Title**: Review the thing\n- **Substatus**: BLOCKED\n${blockedByLine}`,
  );

describe("BLOCKED parts carry a pointer", () => {
  test("an intra-plan block parses and names the part", () => {
    const parsed = parsePlanNote(blocked("- **Blocked By**: research"));
    const part = parsed.parts.find((p) => p.id === "review");
    expect(part?.substatus).toBe("BLOCKED");
    expect(part?.blocked_by?.part).toBe("research");
  });

  test("a cross-plan block parses into plan and part", () => {
    const parsed = parsePlanNote(
      blocked("- **Blocked By**: planning/plan-004-datatable#build.SPEC-003"),
    );
    const blockedBy = parsed.parts.find((p) => p.id === "review")?.blocked_by;
    expect(blockedBy?.plan?.plan).toBe("planning/plan-004-datatable");
    expect(blockedBy?.plan?.part).toBe("build.SPEC-003");
    // Not misread as an intra-plan part id, which would then fail the dangling check.
    expect(blockedBy?.part).toBeUndefined();
  });

  test("a whole-plan block needs no part", () => {
    const parsed = parsePlanNote(blocked("- **Blocked By**: planning/plan-004-datatable"));
    const blockedBy = parsed.parts.find((p) => p.id === "review")?.blocked_by;
    expect(blockedBy?.plan?.plan).toBe("planning/plan-004-datatable");
    expect(blockedBy?.plan?.part).toBeUndefined();
  });

  test("BLOCKED with no pointer is REJECTED", () => {
    // The whole point. A block with nothing attached is the dead end this closes.
    expect(() => parsePlanNote(blocked(""))).toThrow(/records nothing blocking it/);
  });

  test("a part cannot be blocked by itself", () => {
    expect(() => parsePlanNote(blocked("- **Blocked By**: review"))).toThrow(
      /cannot be blocked by itself/,
    );
  });

  test("an intra-plan pointer at a part that does not exist is REJECTED", () => {
    // A pointer at nothing is worse than no pointer: it reads as followable.
    expect(() => parsePlanNote(blocked("- **Blocked By**: spec.SPEC-999"))).toThrow(
      /blocked_by part spec\.SPEC-999 not found/,
    );
  });

  test("a CROSS-plan pointer is not dangling-checked", () => {
    // The other plan is a separate document this schema cannot see. Checking it would
    // make every legitimate cross-plan block an error.
    expect(() =>
      parsePlanNote(blocked("- **Blocked By**: planning/plan-999-does-not-exist#review")),
    ).not.toThrow();
  });

  test("the pointer survives a parse-render round trip, both shapes", () => {
    for (const line of [
      "- **Blocked By**: research",
      "- **Blocked By**: planning/plan-004-datatable#build.SPEC-003",
    ]) {
      const once = renderPlanNote(parsePlanNote(blocked(line)));
      const twice = renderPlanNote(parsePlanNote(once));
      expect(twice).toBe(once);
      expect(once).toContain(line.replace("- **Blocked By**: ", ""));
    }
  });

  test("an unblocked part emits no Blocked By line", () => {
    // Optional fields should cost nothing when unset, or every part gains noise.
    const rendered = renderPlanNote(parsePlanNote(PLAN));
    expect(rendered).not.toContain("Blocked By");
  });
});

describe("plan-level cross-plan relations", () => {
  test("both directions are accepted, and are separate from depends_on", () => {
    const parsed = parsePlanNote(PLAN);
    const withEdges = {
      ...parsed,
      depends_on_plans: [
        { plan: "planning/plan-004-datatable", part: "build.SPEC-003", reason: "needs the engine" },
      ],
      blocks_plans: [{ plan: "planning/plan-006-polar-ui-mcp" }],
    };
    const result = PlanNoteSchema.safeParse(withEdges);
    expect(result.success).toBe(true);
  });

  test("a cross-plan ref requires a plan, not just a part", () => {
    // A bare part id is ambiguous across plans, which is why the permalink is the
    // required half and the part is the optional one.
    const parsed = parsePlanNote(PLAN);
    const result = PlanNoteSchema.safeParse({
      ...parsed,
      depends_on_plans: [{ part: "build.SPEC-003" }],
    });
    expect(result.success).toBe(false);
  });

  test("intra-plan depends_on keeps its dangling check", () => {
    // The reason cross-plan refs got their own field: this guard stays intact.
    const broken = PLAN.replace("- **Depends On**: research", "- **Depends On**: spec.SPEC-999");
    expect(() => parsePlanNote(broken)).toThrow(/depends_on spec\.SPEC-999 not found/);
  });
});
