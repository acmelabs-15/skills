import { describe, expect, test } from "bun:test";
import type { AdrNote } from "../../src/schemas/adr-note.js";
import {
  type AdrClaimResult,
  validateAdrAcceptedClaim,
} from "../../src/validators/adr-claim-validator.js";

/**
 * Validator-level unit tests for `validateAdrAcceptedClaim` (SPEC-008 REQ-003,
 * TASK-007, Wave 2). The validator is the runtime-callable equivalent of the
 * two ACCEPTED-gate `superRefine` arms in `AdrNoteSchema`; these cases
 * exercise the boundary behaviors locked in the TASK-007 DoD:
 *
 *   - status NOT ACCEPTED → `{ ok: true, unsatisfied: [] }` trivially
 *   - status ACCEPTED + every clarification checked + every option with
 *     rationale → `{ ok: true, unsatisfied: [] }`
 *   - status ACCEPTED + one unchecked clarification → `{ ok: false }` with a
 *     `clarifications[N].checkbox` path entry
 *   - status ACCEPTED + one option lacking rationale → `{ ok: false }` with a
 *     `considered_options[N].rationale` path entry
 *
 * The fixtures are deliberately constructed as plain objects (cast as
 * `AdrNote`) rather than round-tripped through `AdrNoteSchema.parse()` so the
 * validator can be exercised on inputs that the schema would itself reject —
 * proving the validator does not rely on the schema having pre-rejected
 * lying ACCEPTED claims (the whole point of a runtime claim validator).
 */
function minimalAdr(overrides: Partial<AdrNote> = {}): AdrNote {
  const base: AdrNote = {
    frontmatter: {
      title: "ADR-001: Validator Fixture",
      type: "decision",
      status: "PROPOSED",
      date: "2026-05-24",
      updated: "2026-05-24",
      permalink: "decisions/adr-001-validator-fixture",
      tags: ["decision", "test"],
    },
    sections: { Context: "Some context prose." },
    considered_options: [
      { name: "Option A", rationale: "Chosen because it is simplest." },
      { name: "Option B", rationale: "Rejected as over-engineered." },
    ],
    clarifications: [
      { text: "First clarification", done: true },
      { text: "Second clarification", done: true },
    ],
    observations: [
      { category: "fact", text: "obs 1", tags: ["a"] },
      { category: "decision", text: "obs 2", tags: ["b"] },
      { category: "insight", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "implements", target: "SPEC-001: Test" },
      { verb: "depends_on", target: "ANALYSIS-001: Test" },
    ],
  };
  return { ...base, ...overrides };
}

describe("validateAdrAcceptedClaim", () => {
  test("ok=true when status is PROPOSED (the trivial non-ACCEPTED branch)", () => {
    // DoD item 2: validator returns { ok: true, unsatisfied: [] } when status
    // is not ACCEPTED. Plant violations to prove the gate is dormant.
    const adr = minimalAdr({
      frontmatter: { ...minimalAdr().frontmatter, status: "PROPOSED" },
      clarifications: [{ text: "Unchecked but ignored", done: false }],
      considered_options: [{ name: "No rationale", rationale: "   " }],
    });
    const result = validateAdrAcceptedClaim(adr);
    expect(result).toEqual({ ok: true, unsatisfied: [] });
  });

  test("ok=true when status is DEPRECATED (also non-ACCEPTED)", () => {
    const adr = minimalAdr({
      frontmatter: { ...minimalAdr().frontmatter, status: "DEPRECATED" },
      clarifications: [{ text: "Unchecked but ignored", done: false }],
    });
    const result = validateAdrAcceptedClaim(adr);
    expect(result).toEqual({ ok: true, unsatisfied: [] });
  });

  test("ok=true when ACCEPTED and all clarifications checked + all options have rationale", () => {
    // DoD item 7: ACCEPTED + all-checked + all-rationale → ok=true.
    const adr = minimalAdr({
      frontmatter: { ...minimalAdr().frontmatter, status: "ACCEPTED" },
    });
    const result = validateAdrAcceptedClaim(adr);
    expect(result).toEqual({ ok: true, unsatisfied: [] });
  });

  test("ok=true when ACCEPTED and Clarifications section is absent", () => {
    // Mirrors the schema superRefine: the clarifications check only fires when
    // the section is present. Absent section + valid options → ok=true.
    const adr = minimalAdr({
      frontmatter: { ...minimalAdr().frontmatter, status: "ACCEPTED" },
      clarifications: undefined,
    });
    const result = validateAdrAcceptedClaim(adr);
    expect(result).toEqual({ ok: true, unsatisfied: [] });
  });

  test("ok=false when ACCEPTED and one clarification is unchecked — correct dotted-bracket path", () => {
    // DoD item 3 + item 6: one unchecked clarification → ok=false with a
    // clarifications[N].checkbox path entry.
    const adr = minimalAdr({
      frontmatter: { ...minimalAdr().frontmatter, status: "ACCEPTED" },
      clarifications: [
        { text: "First clarification", done: true },
        { text: "Second clarification", done: false },
      ],
    });
    const result: AdrClaimResult = validateAdrAcceptedClaim(adr);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("setup");
    expect(result.unsatisfied).toEqual([
      {
        path: "clarifications[1].checkbox",
        reason: "Clarifications item is unchecked: Second clarification",
      },
    ]);
  });

  test("ok=false when ACCEPTED and an option lacks rationale — correct dotted-bracket path", () => {
    // DoD item 4 + item 6: one option with whitespace-only rationale →
    // ok=false with a considered_options[N].rationale path entry.
    const adr = minimalAdr({
      frontmatter: { ...minimalAdr().frontmatter, status: "ACCEPTED" },
      considered_options: [
        { name: "Option A", rationale: "Chosen because it is simplest." },
        { name: "Option B", rationale: "   " },
      ],
    });
    const result: AdrClaimResult = validateAdrAcceptedClaim(adr);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("setup");
    expect(result.unsatisfied).toEqual([
      {
        path: "considered_options[1].rationale",
        reason: "Considered Option lacks a non-empty rationale: Option B",
      },
    ]);
  });

  test("ok=false reports one entry per failing item across both checks", () => {
    // Multi-failure case: unchecked clarification AND option without rationale
    // both surface, clarifications first then considered_options.
    const adr = minimalAdr({
      frontmatter: { ...minimalAdr().frontmatter, status: "ACCEPTED" },
      clarifications: [
        { text: "First clarification", done: false },
        { text: "Second clarification", done: true },
      ],
      considered_options: [
        { name: "Option A", rationale: "Chosen because it is simplest." },
        { name: "Option B", rationale: "" },
      ],
    });
    const result = validateAdrAcceptedClaim(adr);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("setup");
    expect(result.unsatisfied).toEqual([
      {
        path: "clarifications[0].checkbox",
        reason: "Clarifications item is unchecked: First clarification",
      },
      {
        path: "considered_options[1].rationale",
        reason: "Considered Option lacks a non-empty rationale: Option B",
      },
    ]);
  });

  test("validator is pure — does not mutate the input AdrNote", () => {
    // DoD item 5: validator is pure (no mutation). Snapshot the input as JSON
    // before + after; equality proves no in-place mutation.
    const adr = minimalAdr({
      frontmatter: { ...minimalAdr().frontmatter, status: "ACCEPTED" },
      clarifications: [{ text: "Unchecked", done: false }],
    });
    const snapshot = JSON.stringify(adr);
    validateAdrAcceptedClaim(adr);
    expect(JSON.stringify(adr)).toBe(snapshot);
  });
});
