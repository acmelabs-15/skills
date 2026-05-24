import { describe, expect, test } from "bun:test";
import {
  type DispatchOutcome,
  UnparseableNoteError,
  dispatchValidator,
} from "../dispatch-validator.ts";

/**
 * Unit tests for the frontmatter-type-to-validator dispatch (SPEC-008
 * TASK-038). Each of the nine claim-bearing note types is exercised with one
 * passing input (verdict `allow` / `allow-with-warning`) and one denying input
 * (verdict `deny`), plus the unparseable-throws path and the non-blocking
 * warning path.
 *
 * Passing fixtures are the canonical composition-library sample notes, read at
 * runtime (read-only) so the fixtures stay authoritative as the schemas evolve.
 * Denying fixtures are derived by flipping the sample to its terminal status
 * (TASK DONE, REQ/DESIGN/ADR/ANALYSIS ACCEPTED, SPEC/PLAN/QA/EPIC DONE) with an
 * unsatisfied claim contract — the exact lying-claim transition the schemas and
 * claim validators reject. The EPIC denying fixture and all inline cases are
 * authored in-file.
 */

const FIXTURE_DIR = new URL("../../../shared/composition/tests/fixtures/", import.meta.url);

async function sample(name: string): Promise<string> {
  return Bun.file(new URL(name, FIXTURE_DIR)).text();
}

/** Replace the first `status:` frontmatter value. */
function withStatus(content: string, status: string): string {
  return content.replace(/^status:.*$/m, `status: ${status}`);
}

const PATH = "docs/sample.md";

describe("dispatchValidator — passing inputs allow", () => {
  test("task (IN_PROGRESS) allows", async () => {
    const out = dispatchValidator(await sample("task-note-sample.md"), PATH);
    expect(out.verdict).not.toBe("deny");
  });

  test("requirement (DRAFT) allows", async () => {
    const out = dispatchValidator(await sample("requirement-note-sample.md"), PATH);
    expect(out.verdict).not.toBe("deny");
  });

  test("design (DRAFT) allows", async () => {
    const out = dispatchValidator(await sample("design-note-sample.md"), PATH);
    expect(out.verdict).not.toBe("deny");
  });

  test("spec (ACCEPTED, gate fires only at DONE) allows", async () => {
    const out = dispatchValidator(await sample("spec-root-note-sample.md"), PATH);
    expect(out.verdict).not.toBe("deny");
  });

  test("qa (DONE, verdict PASS) allows", async () => {
    // The canonical sample uses the legacy `type: test-report`; the dispatch
    // routes the current `type: qa` value (TASK-038 DoD), so rewrite it.
    const note = (await sample("test-report-note-sample.md")).replace(
      "type: test-report",
      "type: qa",
    );
    const out = dispatchValidator(note, PATH);
    expect(out.verdict).not.toBe("deny");
  });

  test("decision/adr (ACCEPTED, clarifications checked) allows", () => {
    const out = dispatchValidator(ADR_PASSING, PATH);
    expect(out.verdict).not.toBe("deny");
  });

  test("plan (IN_PROGRESS) allows", async () => {
    const out = dispatchValidator(await sample("plan-note-sample.md"), PATH);
    expect(out.verdict).not.toBe("deny");
  });

  test("analysis (ACCEPTED, no Open Questions) allows", () => {
    const out = dispatchValidator(ANALYSIS_PASSING, PATH);
    expect(out.verdict).not.toBe("deny");
  });

  test("epic (DONE, contains resolves via no-op) allows", () => {
    const out = dispatchValidator(EPIC_PASSING, PATH);
    expect(out.verdict).not.toBe("deny");
  });
});

describe("dispatchValidator — status-flip claim failures deny", () => {
  function expectDeny(out: DispatchOutcome, schemaName: string, status: string): void {
    expect(out.verdict).toBe("deny");
    expect(out.reason).toContain(schemaName);
    expect(out.reason).toContain(`status=${status}`);
    expect(out.reason).toContain("failing:");
  }

  test("task DONE with unchecked DoD denies", async () => {
    const lying = withStatus(await sample("task-note-sample.md"), "DONE");
    expectDeny(dispatchValidator(lying, PATH), "TaskNoteSchema", "DONE");
  });

  test("requirement ACCEPTED with unchecked AC denies", async () => {
    const lying = withStatus(await sample("requirement-note-sample.md"), "ACCEPTED");
    expectDeny(dispatchValidator(lying, PATH), "RequirementNoteSchema", "ACCEPTED");
  });

  test("design ACCEPTED with unchecked Compliance denies", async () => {
    const lying = withStatus(await sample("design-note-sample.md"), "ACCEPTED");
    expectDeny(dispatchValidator(lying, PATH), "DesignNoteSchema", "ACCEPTED");
  });

  test("spec DONE with unchecked Success Criteria denies", async () => {
    const lying = withStatus(await sample("spec-root-note-sample.md"), "DONE");
    expectDeny(dispatchValidator(lying, PATH), "SpecNoteSchema", "DONE");
  });

  test("qa/test-report DONE with verdict mismatch denies", async () => {
    // Set the Failed summary count to 1 while the Failed-row Status marker
    // still reads [PASS] → declared verdict PASS but derived verdict FAIL →
    // the schema rejects the verdict mismatch at parse time (status DONE).
    const base = (await sample("test-report-note-sample.md")).replace(
      "type: test-report",
      "type: qa",
    );
    const lying = base.replace("| Failed | 0 | 0 | [PASS] |", "| Failed | 1 | 0 | [PASS] |");
    const out = dispatchValidator(lying, PATH);
    expect(out.verdict).toBe("deny");
    expect(out.reason).toContain("status=DONE");
  });

  test("decision/adr ACCEPTED with an unchecked Clarification denies", () => {
    // Turn a checked Clarifications item into an unchecked one.
    const lying = ADR_PASSING.replace(
      "- [x] 2026-05-18: corrected the sort order",
      "- [ ] 2026-05-18: corrected the sort order",
    );
    expectDeny(dispatchValidator(lying, PATH), "DecisionNoteSchema", "ACCEPTED");
  });

  test("plan DONE with a non-terminal part denies", async () => {
    const lying = withStatus(await sample("plan-note-sample.md"), "DONE");
    expectDeny(dispatchValidator(lying, PATH), "PlanNoteSchema", "DONE");
  });

  test("analysis ACCEPTED with an Open Questions section denies", () => {
    const lying = ANALYSIS_PASSING.replace(
      "## Observations",
      "## Open Questions\n\n- Is the renumber map always bijective?\n\n## Observations",
    );
    expectDeny(dispatchValidator(lying, PATH), "AnalysisNoteSchema", "ACCEPTED");
  });
});

describe("dispatchValidator — LAYERED-SEVERITY classification (REQ-011 amended)", () => {
  /**
   * The decisive cases the amendment adds. A claim-lie ALWAYS denies; a
   * hygiene-only issue (claim satisfied) is `allow-with-warning`; a claim-lie
   * WITH a co-occurring hygiene defect still denies (the CRITICAL INVARIANT —
   * the lie is never masked by the hygiene defect that fails the strict parse
   * first and suppresses the superRefine claim issue).
   */

  test("claim-lie ONLY (DONE + unchecked DoD) → deny", async () => {
    const lying = withStatus(await sample("task-note-sample.md"), "DONE");
    const out = dispatchValidator(lying, PATH);
    expect(out.verdict).toBe("deny");
    expect(out.reason).toContain("TaskNoteSchema");
  });

  test("hygiene ONLY (claim satisfied + bad observation category) → allow-with-warning", () => {
    const out = dispatchValidator(TASK_DRAFT_BAD_CATEGORY, PATH);
    expect(out.verdict).toBe("allow-with-warning");
    expect(out.warning).toContain("Schema warning:");
    expect(out.warning).toContain("(non-blocking)");
  });

  test("hygiene ONLY (claim satisfied + 6 frontmatter tags) → allow-with-warning", () => {
    const out = dispatchValidator(TASK_DRAFT_TOO_MANY_TAGS, PATH);
    expect(out.verdict).toBe("allow-with-warning");
  });

  test("CRITICAL INVARIANT: claim-lie + hygiene together (DONE + unchecked DoD + bad category) → deny", () => {
    const out = dispatchValidator(TASK_DONE_LYING_AND_BAD_CATEGORY, PATH);
    // The claim lie wins despite the co-occurring hygiene defect that fails the
    // strict parse first and suppresses the superRefine claim issue.
    expect(out.verdict).toBe("deny");
    expect(out.reason).toContain("TaskNoteSchema");
    expect(out.reason).toContain("status=DONE");
  });

  test("CRITICAL INVARIANT: claim-lie + hygiene together (DONE + unchecked DoD + 6 tags) → deny", () => {
    const out = dispatchValidator(TASK_DONE_LYING_AND_TOO_MANY_TAGS, PATH);
    expect(out.verdict).toBe("deny");
    expect(out.reason).toContain("status=DONE");
  });

  test("clean (DONE + all DoD checked, no hygiene issues) → allow", () => {
    const out = dispatchValidator(TASK_DONE_CLEAN, PATH);
    expect(out.verdict).toBe("allow");
  });

  test("requirement: claim-lie + bad category together → deny (claim wins)", () => {
    const out = dispatchValidator(REQ_ACCEPTED_LYING_AND_BAD_CATEGORY, PATH);
    expect(out.verdict).toBe("deny");
    expect(out.reason).toContain("RequirementNoteSchema");
  });

  test("requirement: hygiene only (ACCEPTED + all AC checked + bad category) → allow-with-warning", () => {
    const out = dispatchValidator(REQ_ACCEPTED_CLEAN_BAD_CATEGORY, PATH);
    expect(out.verdict).toBe("allow-with-warning");
  });

  test("epic structurally malformed (contains without Contained Specs) → allow-with-warning", () => {
    // Under the amendment this is a recoverable schema-rule violation, NOT a
    // claim-validator failure (the EPIC done-claim needs cross-note SPEC
    // resolution the hook boundary cannot perform), so it classifies
    // allow-with-warning. Boundary gates (L3/L4/L5/L6) still DENY it.
    const out = dispatchValidator(EPIC_DENYING, PATH);
    expect(out.verdict).toBe("allow-with-warning");
  });
});

describe("dispatchValidator — non-blocking warning path", () => {
  test("clean parse with claim pass but observations at the floor warns", () => {
    const out = dispatchValidator(REQUIREMENT_AT_FLOOR, PATH);
    expect(out.verdict).toBe("allow-with-warning");
    expect(out.warning).toContain("Schema warning:");
    expect(out.warning).toContain("(non-blocking)");
  });
});

describe("dispatchValidator — routing and error boundary", () => {
  test("unknown type (critique) allows without a claim contract", () => {
    const crit = `---
title: 'CRIT-001-ADR-001: Sample Critique'
type: critique
status: DRAFT
permalink: critique/crit-001-adr-001-sample
tags:
  - critique
---

# CRIT-001-ADR-001: Sample Critique
`;
    expect(dispatchValidator(crit, PATH).verdict).toBe("allow");
  });

  test("missing frontmatter throws UnparseableNoteError", () => {
    expect(() => dispatchValidator("# Not a note\n\nNo frontmatter here.", PATH)).toThrow(
      UnparseableNoteError,
    );
  });

  test("frontmatter without a type throws UnparseableNoteError", () => {
    const noType = "---\nstatus: DRAFT\n---\n\n# Body\n";
    expect(() => dispatchValidator(noType, PATH)).toThrow(UnparseableNoteError);
  });

  test("structurally broken non-terminal note throws UnparseableNoteError with issues", async () => {
    // A DRAFT task whose body is gutted: the task type is recognized and the
    // status is non-terminal, so the parse failure is a structural defect, not
    // a status-flip claim → throw.
    const broken = `---
title: 'TASK-001-SPEC-001: Broken'
type: task
status: TODO
permalink: specs/spec-001-x/tasks/task-001-spec-001-broken
tags:
  - task
  - spec-001
---

# TASK-001-SPEC-001: Broken
`;
    let thrown: unknown;
    try {
      dispatchValidator(broken, PATH);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(UnparseableNoteError);
    expect((thrown as UnparseableNoteError).issues.length).toBeGreaterThan(0);
  });
});

/**
 * Inline EPIC fixture (no canonical .md sample exists). Valid at status DONE:
 * `contains` relations are present with a matching `## Contained Specs` section,
 * so the schema parses; the dispatch swallows the no-resolver throw from
 * validateEpicDoneClaim and returns a non-deny verdict.
 */
const EPIC_PASSING = `---
title: 'EPIC-901: Protocol Hardening'
type: epic
status: DONE
permalink: roadmap/epic-901-protocol-hardening
tags:
  - epic
  - hardening
  - roadmap
---

# EPIC-901: Protocol Hardening

## Epic Statement

Harden the protocol surface across two waves of coverage work.

## Contained Specs

- [[SPEC-007: Plan/Session Render Implementation]]

## Observations

- [decision] Two-wave delivery locked #roadmap #decision
- [fact] Wave 1 shipped 2026-05-21 #milestone
- [insight] Coverage gaps tracked in ANALYSIS-004 #coverage

## Relations

- contains [[SPEC-007: Plan/Session Render Implementation]]
- part_of [[PLAN-001: Sample]]
`;

/**
 * Inline EPIC fixture that declares status DONE but is structurally malformed:
 * `contains` relations exist with NO `## Contained Specs` section, so the
 * schema rejects at parse. Because the declared status equals the terminal gate
 * (DONE), the dispatch classifies the throw as a status-flip claim failure.
 */
const EPIC_DENYING = `---
title: 'EPIC-902: Search Platform'
type: epic
status: DONE
permalink: roadmap/epic-902-search-platform
tags:
  - epic
  - search
---

# EPIC-902: Search Platform

## Vision

Deliver a unified hybrid search platform.

## Observations

- [decision] Hybrid search locked #search #decision
- [fact] Launch target 2026 #milestone
- [insight] Latency budget is 200ms #performance

## Relations

- contains [[SPEC-010: Search Index]]
- part_of [[PLAN-002: Sample]]
`;

/**
 * Inline ADR fixture: valid at status ACCEPTED. Considered Options carry
 * rationale and the single Clarifications item is checked, so both ACCEPTED
 * gates pass. No canonical .md sample carries the required `permalink`/`date`
 * frontmatter for the parser.
 */
const ADR_PASSING = `---
title: 'ADR-007: Sample Decision'
type: decision
status: ACCEPTED
date: 2026-05-15
updated: 2026-05-20
permalink: decisions/adr-007-sample-decision
tags:
  - decision
  - sample
---

# ADR-007: Sample Decision

## Overview

Sample ADR exercising the ACCEPTED gates.

## Considered Options

| Option | Rationale |
| --- | --- |
| Adopt remark | Structural awareness across code fences and links |
| Hand-rolled regex | Rejected: collides with code fences |

## Decision

Adopt remark for AST parsing.

## Clarifications

- [x] 2026-05-18: corrected the sort order

## Observations

- [decision] Remark chosen for structural awareness #parsing #decision
- [constraint] Round-trip must be byte-exact #correctness
- [insight] Regex pipelines need extra guards #parsing-fragility

## Relations

- implements [[SPEC-001: Sample]]
- part_of [[EPIC-007: Sample]]
`;

/**
 * Inline ANALYSIS fixture: valid at status ACCEPTED with no `## Open Questions`
 * section, so the accepted-claim validator passes. No canonical .md sample
 * carries the required `permalink` frontmatter for the parser.
 */
const ANALYSIS_PASSING = `---
title: 'ANALYSIS-007: Sample Survey'
type: analysis
status: ACCEPTED
permalink: analysis/analysis-007-sample-survey
tags:
  - analysis
  - sample
---

# ANALYSIS-007: Sample Survey

## Overview

Sample analysis with every open question resolved before locking.

## Findings

### item-1: A finding

A resolved finding with no lingering questions.

## Observations

- [fact] item-1 captures the survey scope #survey
- [insight] No open questions remain at ACCEPTED #closure
- [decision] Locked after resolution #status

## Relations

- implements [[SPEC-001: Sample]]
- part_of [[EPIC-007: Sample]]
`;

/**
 * Inline REQUIREMENT fixture that parses cleanly with a passing claim (status
 * DRAFT, so the AC gate does not fire) but carries exactly three observations —
 * the bare structural floor — to exercise the non-blocking warning path.
 */
const REQUIREMENT_AT_FLOOR = `---
title: 'REQ-001-SPEC-001: Minimal Requirement'
type: requirement
status: DRAFT
permalink: specs/spec-001-x/requirements/req-001-spec-001-minimal
tags:
  - requirement
  - spec-001
---

# REQ-001-SPEC-001: Minimal Requirement

## Requirement Statement

WHEN a minimal requirement is authored THE SYSTEM SHALL accept it SO THAT the
floor warning path is exercised.

## Acceptance Criteria

- [ ] GIVEN a draft requirement WHEN parsed THEN it validates

## Observations

- [requirement] Minimal requirement for the floor path #floor
- [technique] Three observations is the schema floor #threshold
- [decision] Status DRAFT keeps the AC gate dormant #status

## Relations

- part_of [[SPEC-001: Sample]]
- implements [[ADR-001: Sample]]
`;

/**
 * TASK fixtures for the LAYERED-SEVERITY matrix. Built around a single valid
 * TASK shape with controlled mutations so each case isolates exactly one axis
 * (claim, hygiene, or both). The DoD is a single item; `[x]` = claim satisfied,
 * `[ ]` = claim lie at DONE.
 */
function taskFixture(opts: {
  status: string;
  dodChecked: boolean;
  badCategory?: boolean;
  tooManyTags?: boolean;
}): string {
  const box = opts.dodChecked ? "[x]" : "[ ]";
  const tags = opts.tooManyTags
    ? "  - task\n  - spec-001\n  - a\n  - b\n  - c\n  - d"
    : "  - task\n  - spec-001";
  const firstObs = opts.badCategory
    ? "- [NOT_A_CATEGORY] bad category to fail base parse #hygiene"
    : "- [decision] A real categorized observation #ok";
  return `---
title: 'TASK-002-SPEC-001: Matrix Fixture'
type: task
permalink: specs/spec-001-x/tasks/task-002-spec-001-matrix-fixture
status: ${opts.status}
tags:
${tags}
---

# TASK-002-SPEC-001: Matrix Fixture

## Objective

Exercise the layered-severity dispatch matrix with one controlled axis at a time.

## Scope

**In Scope**:

- One DoD item

**Out of Scope**:

- Everything else

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| \`src/x.ts\` | NEW | matrix fixture target |

## Testing Requirements

- The single DoD item gates the done-claim

## Definition of Done

- ${box} The one and only DoD item

## Observations

${firstObs}
- [fact] Second observation above the floor #ok
- [insight] Third observation above the floor #ok
- [constraint] Fourth observation keeps the count above the floor warning #ok

## Relations

- part_of [[SPEC-001: Sample]]
- implements [[ADR-001: Sample]]
- relates_to [[REQ-001-SPEC-001: Sample]]
`;
}

/** DRAFT (claim N/A) + bad observation category → hygiene only. */
const TASK_DRAFT_BAD_CATEGORY = taskFixture({
  status: "TODO",
  dodChecked: false,
  badCategory: true,
});

/** DRAFT (claim N/A) + 6 frontmatter tags (exceeds max 5) → hygiene only. */
const TASK_DRAFT_TOO_MANY_TAGS = taskFixture({
  status: "TODO",
  dodChecked: true,
  tooManyTags: true,
});

/** DONE + unchecked DoD + bad category → claim-lie AND hygiene (CRITICAL). */
const TASK_DONE_LYING_AND_BAD_CATEGORY = taskFixture({
  status: "DONE",
  dodChecked: false,
  badCategory: true,
});

/** DONE + unchecked DoD + 6 tags → claim-lie AND hygiene (CRITICAL). */
const TASK_DONE_LYING_AND_TOO_MANY_TAGS = taskFixture({
  status: "DONE",
  dodChecked: false,
  tooManyTags: true,
});

/** DONE + all DoD checked + no hygiene defect → clean allow. */
const TASK_DONE_CLEAN = taskFixture({
  status: "DONE",
  dodChecked: true,
});

/**
 * REQUIREMENT fixture builder for the cross-type claim-wins case. A single AC
 * item; `[x]` = claim satisfied, `[ ]` = claim lie at ACCEPTED. `badCategory`
 * injects a base-parse hygiene failure that suppresses the superRefine claim
 * issue — the partition-trap the lenient extractor sidesteps.
 */
function reqFixture(opts: { status: string; acChecked: boolean; badCategory?: boolean }): string {
  const box = opts.acChecked ? "[x]" : "[ ]";
  const firstObs = opts.badCategory
    ? "- [NOT_A_CATEGORY] bad category to fail base parse #hygiene"
    : "- [requirement] A real categorized observation #ok";
  return `---
title: 'REQ-002-SPEC-001: Matrix Requirement'
type: requirement
status: ${opts.status}
permalink: specs/spec-001-x/requirements/req-002-spec-001-matrix
tags:
  - requirement
  - spec-001
---

# REQ-002-SPEC-001: Matrix Requirement

## Requirement Statement

WHEN the matrix requirement is parsed THE SYSTEM SHALL exercise the AC gate SO
THAT the claim-wins invariant is verified at the REQ layer.

## Acceptance Criteria

- ${box} GIVEN the matrix requirement WHEN evaluated THEN the AC gates the claim

## Observations

${firstObs}
- [fact] Second observation above the floor #ok
- [insight] Third observation above the floor #ok
- [constraint] Fourth observation keeps the count above the floor warning #ok

## Relations

- part_of [[SPEC-001: Sample]]
- implements [[ADR-001: Sample]]
- relates_to [[DESIGN-001-SPEC-001: Sample]]
`;
}

/** ACCEPTED + unchecked AC + bad category → claim-lie AND hygiene (claim wins). */
const REQ_ACCEPTED_LYING_AND_BAD_CATEGORY = reqFixture({
  status: "ACCEPTED",
  acChecked: false,
  badCategory: true,
});

/** ACCEPTED + checked AC + bad category → hygiene only (claim satisfied). */
const REQ_ACCEPTED_CLEAN_BAD_CATEGORY = reqFixture({
  status: "ACCEPTED",
  acChecked: true,
  badCategory: true,
});
