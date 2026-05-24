import { describe, expect, test } from "bun:test";
import type { ParsedAnalysisNote } from "../../src/parsers/analysis-note.js";
import type { AnalysisNoteStatus } from "../../src/schemas/analysis-note.js";
import {
  type AnalysisClaimResult,
  validateAnalysisAcceptedClaim,
} from "../../src/validators/analysis-claim-validator.js";

/**
 * Validator-level unit tests for `validateAnalysisAcceptedClaim` (SPEC-008
 * REQ-003, TASK-008, Wave 2). The validator is the runtime-callable equivalent
 * of the parse-time `superRefine` arm in `AnalysisNoteSchema`; these cases
 * exercise the boundary behaviors locked in the TASK-008 DoD:
 *
 *   - status NOT ACCEPTED → `{ ok: true }` trivially (even with Open Questions)
 *   - status ACCEPTED + no Open Questions → `{ ok: true }`
 *   - status ACCEPTED + Open Questions present → `{ ok: false }` with one
 *     unsatisfied entry whose `path` is `body.hasOpenQuestions`
 *
 * The fixtures are deliberately constructed as plain objects (cast as
 * `ParsedAnalysisNote`) rather than round-tripped through `parseAnalysisNote()`
 * so the validator can be exercised on inputs that the schema would itself
 * reject (ACCEPTED + Open Questions) — proving the validator does not rely on
 * the schema having pre-rejected the lying claim.
 */
function minimalAnalysis(
  status: AnalysisNoteStatus,
  hasOpenQuestions: boolean,
): ParsedAnalysisNote {
  return {
    frontmatter: {
      title: "ANALYSIS-001: Validator Fixture",
      type: "analysis",
      status,
      permalink: "analysis/analysis-001-validator-fixture",
      tags: ["analysis", "test"],
    },
    sections: { Findings: "Some findings." },
    observations: [
      { category: "fact", text: "obs 1", tags: ["a"] },
      { category: "decision", text: "obs 2", tags: ["b"] },
      { category: "insight", text: "obs 3", tags: ["c"] },
    ],
    relations: [
      { verb: "implements", target: "SPEC-001: Test" },
      { verb: "depends_on", target: "ADR-001: Test" },
    ],
    hasOpenQuestions,
  };
}

describe("validateAnalysisAcceptedClaim", () => {
  test("ok=true when status is DRAFT even with Open Questions present (gate dormant)", () => {
    // DoD item 2 + item 6: validator returns { ok: true } when status is not
    // ACCEPTED. DRAFT + Open Questions is by-design legal (analyses surface
    // questions during research; the rule applies only to locked artifacts).
    const note = minimalAnalysis("DRAFT", true);
    const result = validateAnalysisAcceptedClaim(note);
    expect(result).toEqual({ ok: true });
  });

  test("ok=true when status is PROPOSED with Open Questions present (also non-ACCEPTED)", () => {
    const note = minimalAnalysis("PROPOSED", true);
    const result = validateAnalysisAcceptedClaim(note);
    expect(result).toEqual({ ok: true });
  });

  test("ok=true when status is ACCEPTED and Open Questions absent", () => {
    // DoD item 4 + item 6: ACCEPTED + no Open Questions → ok=true (happy path).
    const note = minimalAnalysis("ACCEPTED", false);
    const result = validateAnalysisAcceptedClaim(note);
    expect(result).toEqual({ ok: true });
  });

  test("ok=false when status is ACCEPTED and Open Questions present — names the forbidden section", () => {
    // DoD item 3 + item 6: ACCEPTED + Open Questions → ok=false with one
    // unsatisfied entry whose `path` is `body.hasOpenQuestions`.
    const note = minimalAnalysis("ACCEPTED", true);
    const result: AnalysisClaimResult = validateAnalysisAcceptedClaim(note);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("setup");
    expect(result.unsatisfied).toHaveLength(1);
    const [entry] = result.unsatisfied;
    if (!entry) throw new Error("setup");
    expect(entry.path).toBe("body.hasOpenQuestions");
    expect(entry.reason.length).toBeGreaterThan(0);
  });

  test("ok=true when status is DONE with Open Questions present (only ACCEPTED is gated)", () => {
    // The gate fires ONLY at ACCEPTED, not at any other terminal-ish status.
    const note = minimalAnalysis("DONE", true);
    const result = validateAnalysisAcceptedClaim(note);
    expect(result).toEqual({ ok: true });
  });

  test("validator is pure — does not mutate the input note", () => {
    // DoD item 5: validator is pure (no I/O, no mutation). Snapshot the input
    // as JSON before + after; equality proves no in-place mutation.
    const note = minimalAnalysis("ACCEPTED", true);
    const snapshot = JSON.stringify(note);
    validateAnalysisAcceptedClaim(note);
    expect(JSON.stringify(note)).toBe(snapshot);
  });
});
