/**
 * A locked decision records the chosen option verbatim.
 *
 * The gap this closes: the schema had `topic` and no field for the decision itself,
 * while the spec called for `{id, status, decision: <verbatim text>}`. The lock
 * script was passing the chosen option's full text as `topic` — so the question
 * ("which parser strategy") was being overwritten by the answer, and the verbatim
 * text had nowhere to live.
 *
 * That matters beyond tidiness. A later phase audits whether an authored ADR carries
 * the same detail as the decision it records. With no field to compare against, that
 * audit was measuring a short label against a full document and passing trivially —
 * it was comparing against nothing.
 *
 * Enforcement sits at the WRITING edge, not the reading edge: `LockDecision.decision`
 * is non-optional so a caller cannot omit it, while the schema keeps the field
 * optional so notes locked before it existed still parse. Requiring it on read was
 * tried and reverted — it failed 45 tests and every real plan note, and a schema that
 * rejects a whole document validates none of the state inside it.
 */
import { describe, expect, test } from "bun:test";
import { applyPlanMutation } from "@acmelabs/models/mutations/plan-mutations";
import { parsePlanNote } from "@acmelabs/models/parsers/plan-note";
import { renderPlanNote } from "@acmelabs/models/renderers/plan-note";
import { missingDecisionText } from "@acmelabs/models/schemas/plan-note";

const PLAN = `---
title: "PLAN-010: Decision Verbatim"
type: plan
status: IN_PROGRESS
complexity_tier: TIER_2
branches:
  - feat/decision-verbatim
permalink: planning/plan-010-decision-verbatim
tags:
  - plan
  - fixture
---

# PLAN-010: Decision Verbatim

## Scope

Prove a locked decision keeps the chosen option's exact wording.

## Objectives

- [ ] O-1 Verbatim decision text survives a round trip

## Phase Progression

### decisions.1

- **Phase**: decisions
- **Title**: Lock the parser strategy
- **Substatus**: IN_PROGRESS
- **Source Artifacts**: (none)
- **Depends On**: (none)

**DoD**:

- [ ] D-1 locked

**Decisions**:

| ID | Status | Topic | Decision |
|:--|:--|:--|:--|
| D-1 | PENDING | Parser strategy | — |

## Blockers

(none)

## Observations

- [fact] A decision's topic and its answer are different things #decisions
- [constraint] The chosen option is recorded verbatim #verbatim
- [insight] Enforcing on write beats enforcing on read #schema

## Relations

- part_of [[SPEC-007: Plan/Session Render]]
- relates_to [[ADR-003: Plan/Session Render Architecture]]
`;

/** Long enough that a short label could not plausibly stand in for it. */
const CHOSEN =
  "Use an AST parser (remark) rather than regex, because heading nesting and table structure are not regular and a regex parser silently mis-reads both";

describe("locked decisions record the chosen option verbatim", () => {
  test("the topic survives the lock; it is not overwritten by the answer", () => {
    const after = applyPlanMutation(PLAN, {
      type: "lock-decision",
      partId: "decisions.1",
      decisionId: "D-1",
      decision: CHOSEN,
    });
    const decision = parsePlanNote(after).parts[0]?.decisions?.[0];
    // The regression this guards: `topic` used to receive the option text.
    expect(decision?.topic).toBe("Parser strategy");
    expect(decision?.decision).toBe(CHOSEN);
    expect(decision?.status).toBe("LOCKED");
  });

  test("the verbatim text survives a parse-render round trip", () => {
    const after = applyPlanMutation(PLAN, {
      type: "lock-decision",
      partId: "decisions.1",
      decisionId: "D-1",
      decision: CHOSEN,
    });
    const reparsed = parsePlanNote(renderPlanNote(parsePlanNote(after)));
    // Character-for-character: an audit comparing an ADR against this needs the
    // exact wording, so any truncation or normalisation defeats the purpose.
    expect(reparsed.parts[0]?.decisions?.[0]?.decision).toBe(CHOSEN);
  });

  test("a pipe in the decision text does not break the table", () => {
    const withPipe = "Accept both forms | bare and prefixed | and report the legacy one";
    const after = applyPlanMutation(PLAN, {
      type: "lock-decision",
      partId: "decisions.1",
      decisionId: "D-1",
      decision: withPipe,
    });
    // Renders, re-parses, and the row is still one row rather than three columns of
    // fragments.
    const reparsed = parsePlanNote(renderPlanNote(parsePlanNote(after)));
    expect(reparsed.parts[0]?.decisions).toHaveLength(1);
    expect(reparsed.parts[0]?.decisions?.[0]?.status).toBe("LOCKED");
  });

  test("missingDecisionText reports a LOCKED decision with no text, and stays quiet otherwise", () => {
    // A note locked before the field existed: parses fine, and is reportable.
    const legacy = PLAN.replace(
      "| D-1 | PENDING | Parser strategy | — |",
      "| D-1 | LOCKED | Parser strategy | — |",
    );
    expect(missingDecisionText(parsePlanNote(legacy))).toEqual([
      { partId: "decisions.1", id: "D-1" },
    ]);

    const locked = applyPlanMutation(PLAN, {
      type: "lock-decision",
      partId: "decisions.1",
      decisionId: "D-1",
      decision: CHOSEN,
    });
    expect(missingDecisionText(parsePlanNote(locked))).toEqual([]);

    // PENDING is not reported: nothing has been decided, so nothing is missing.
    expect(missingDecisionText(parsePlanNote(PLAN))).toEqual([]);
  });
});
