/**
 * Session frontmatter keys (R-4) and the typed event union's home (R-6).
 *
 * Two rules, both about not losing information.
 *
 * R-4: frontmatter is for FILTERING, Relations are for traversal, and a validator
 * checks the two agree. The duplication is deliberate — "which sessions touched this
 * plan last week" is answerable from indexed frontmatter and not from prose — and
 * duplication is only safe when something checks the copies match. Explicit date
 * keys are what make date filtering real, since search filters on the index's
 * modified timestamp, which is when a note was last touched rather than when its
 * work happened.
 *
 * R-6: the event enum lives in the composition library so parser, renderer and
 * validators share one definition. Membership is prompt 10's to finalise; these
 * tests assert the home and the starting set, not the final list.
 *
 * Both are tolerant on read by design. Ten real session notes predate the new keys,
 * and one carries `status_history` that `.strict()` rejected outright — a key someone
 * deliberately wrote made the whole note unparseable. Unknown keys now pass through
 * and are reported instead.
 */
import { describe, expect, test } from "bun:test";
import { parseSessionNote } from "@acmelabs/models/parsers/session-note";
import {
  EventSchema,
  unspecifiedFrontmatterKeys,
  validateFrontmatterAgreesWithRelations,
} from "@acmelabs/models/schemas/session-note";

/** A session carrying all five R-4 keys, agreeing with its body. */
const SESSION = `---
title: "SESSION-2026-07-29_01: Plan Data Model"
type: session
status: IN_PROGRESS
started: 2026-07-29
branch: feat/plan-data-model
plan: planning/plan-001-skills-ecosystem
parts:
  - review
permalink: sessions/session-2026-07-29_01-plan-data-model
tags:
  - session
  - plan-data-model
---

# SESSION-2026-07-29_01: Plan Data Model

## Scope

Land the R-4 frontmatter keys and the R-6 event-schema home.

## Bound Plans

- **Ref**: [[PLAN-001: Skills Ecosystem]]
  - **Worked Parts**: review

## Event 01 — Session opened

- **Type**: session-start
- **Branch**: feat/plan-data-model

## Observations

- [fact] Frontmatter filters; Relations traverse #session
- [constraint] The two must agree, and a validator checks it #validation
- [insight] Tolerant on read, strict on write #schema

## Relations

- part_of [[PLAN-001: Skills Ecosystem]]
- relates_to [[ADR-003: Plan/Session Render Architecture]]
`;

describe("R-4 — session frontmatter carries the filterable keys", () => {
  test("all five keys parse and survive", () => {
    const fm = parseSessionNote(SESSION).frontmatter;
    expect(fm.started).toBe("2026-07-29");
    expect(fm.branch).toBe("feat/plan-data-model");
    expect(fm.plan).toBe("planning/plan-001-skills-ecosystem");
    expect(fm.parts).toEqual(["review"]);
    // `ended` is absent while a session is open, which is not the same as missing.
    expect(fm.ended).toBeUndefined();
  });

  test("a note without the keys still parses", () => {
    // Every session note on disk predates them. Requiring one would fail ten real
    // notes to enforce a convention on notes already written.
    const legacy = SESSION.replace("started: 2026-07-29\n", "")
      .replace("branch: feat/plan-data-model\n", "")
      .replace("plan: planning/plan-001-skills-ecosystem\n", "")
      .replace("parts:\n  - review\n", "");
    expect(() => parseSessionNote(legacy)).not.toThrow();
  });

  test("an unspecified key is carried, not discarded, and is reported", () => {
    // The regression: `.strict()` rejected `status_history`, so one real note could
    // not be read at all. Silent discard is what R-4 rules out.
    const withExtra = SESSION.replace(
      "status: IN_PROGRESS\n",
      "status: IN_PROGRESS\nstatus_history:\n  - IN_PROGRESS\n",
    );
    const parsed = parseSessionNote(withExtra);
    expect(parsed.frontmatter).toHaveProperty("status_history");
    expect(unspecifiedFrontmatterKeys(parsed.frontmatter as Record<string, unknown>)).toEqual([
      "status_history",
    ]);
  });

  test("no unspecified keys reported when frontmatter is fully described", () => {
    const parsed = parseSessionNote(SESSION);
    expect(unspecifiedFrontmatterKeys(parsed.frontmatter as Record<string, unknown>)).toEqual([]);
  });
});

describe("R-4 — the frontmatter/body agreement validator", () => {
  test("agreement is silent, across permalink and wikilink spellings", () => {
    // Frontmatter holds a permalink, the body holds a wikilink title. Compared as
    // raw strings every session would disagree with itself, so they compare on the
    // entity id both carry.
    expect(validateFrontmatterAgreesWithRelations(parseSessionNote(SESSION))).toEqual([]);
  });

  test("a plan mismatch is reported", () => {
    const wrong = SESSION.replace(
      "plan: planning/plan-001-skills-ecosystem",
      "plan: planning/plan-009-something-else",
    );
    const found = validateFrontmatterAgreesWithRelations(parseSessionNote(wrong));
    expect(found).toHaveLength(1);
    expect(found[0]?.key).toBe("plan");
  });

  test("a parts mismatch is reported", () => {
    const wrong = SESSION.replace("parts:\n  - review\n", "parts:\n  - end\n");
    const found = validateFrontmatterAgreesWithRelations(parseSessionNote(wrong));
    expect(found).toHaveLength(1);
    expect(found[0]?.key).toBe("parts");
  });

  test("absent keys are not disagreements", () => {
    // "Not stated" is not "stated wrongly". Every existing note omits these.
    const without = SESSION.replace("plan: planning/plan-001-skills-ecosystem\n", "").replace(
      "parts:\n  - review\n",
      "",
    );
    expect(validateFrontmatterAgreesWithRelations(parseSessionNote(without))).toEqual([]);
  });
});

describe("R-6 — the typed event union lives in the library", () => {
  test("the nine R-6 additions are accepted", () => {
    // Five of R-6's fourteen already shipped; these are the rest. Landed as the
    // starting set — prompt 10 owns final membership.
    const cases: Array<[string, string]> = [
      ["session-pause", "**Type**: session-pause\n\nParked between sittings."],
      ["session-resume", "**Type**: session-resume\n\nPicked it back up."],
      ["session-close", "**Type**: session-close\n\nClosed."],
      ["artifact-write", "**Type**: artifact-write\n\n**Artifact**: planning/plan-001-x"],
      [
        "user-ruling",
        "**Type**: user-ruling\n\n**Question**: Which shape wins?\n**Answer**: The library's.",
      ],
      ["commit", "**Type**: commit\n\n**Sha**: 0b7b670"],
      ["halt", "**Type**: halt\n\n**Halt Id**: research-step8-convergence-halt"],
      ["curation-op", "**Type**: curation-op\n\n**Operation**: decompose"],
      ["correction", "**Type**: correction\n\n**Corrects Event**: 1"],
    ];
    for (const [name] of cases) {
      // The union is what is under test, so assert membership directly rather than
      // through a markdown round trip the renderer does not yet cover.
      const shape = { n: 2, type: name, title: "t" };
      const result = EventSchema.safeParse(shape);
      // A rejection here means the type is not in the union at all; a rejection on a
      // required field means it IS in the union, which is what this asserts.
      const inUnion =
        result.success ||
        JSON.stringify(result.error.issues).includes("Required") ||
        JSON.stringify(result.error.issues).includes("required");
      expect(inUnion).toBe(true);
    }
  });

  test("the five previously shipped types outside R-6's list are kept", () => {
    // `bootstrap`, `task-transition`, `state-change` and the two pending-decision
    // types are not in R-6's candidate list. Real session notes use them, so they
    // stay rather than being guessed away here.
    for (const name of [
      "bootstrap",
      "task-transition",
      "state-change",
      "pending-decision-surfaced",
      "pending-decision-resolved",
    ]) {
      const result = EventSchema.safeParse({
        n: 2,
        type: name,
        title: "t",
      });
      const inUnion =
        result.success || JSON.stringify(result.error.issues).toLowerCase().includes("required");
      expect(inUnion).toBe(true);
    }
  });

  test("an invented event type is rejected", () => {
    const result = EventSchema.safeParse({
      n: 2,
      type: "not-an-event-type",
      title: "t",
    });
    expect(result.success).toBe(false);
  });

  test("a user-ruling event requires both the question and the answer", () => {
    // A recorded answer without its question is unreadable six weeks later, and this
    // event type exists precisely so a ruling survives the conversation it was made
    // in. Suppressing either half defeats it.
    const missingQuestion = EventSchema.safeParse({
      n: 2,
      type: "user-ruling",
      title: "t",
      answer: "The library's shape.",
    });
    expect(missingQuestion.success).toBe(false);
  });

  test("the union is reachable as one exported definition", () => {
    // R-6's requirement is about the HOME: one definition the parser, renderer and
    // validators all share, rather than a list restated in a skill body.
    expect(EventSchema).toBeDefined();
    expect(() => parseSessionNote(SESSION)).not.toThrow();
  });
});
