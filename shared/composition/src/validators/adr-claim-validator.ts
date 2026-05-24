import type { AdrNote } from "../schemas/adr-note.js";

/**
 * ADR ACCEPTED-claim validator (SPEC-008 REQ-003, TASK-007, Wave 2).
 *
 * Runtime-callable equivalent of the two ACCEPTED-gate `superRefine` arms in
 * `AdrNoteSchema`: given an already-parsed `AdrNote` (produced by TASK-005's
 * `parseAdrNote`), returns whether the note legitimately claims status
 * ACCEPTED. Closes the highest-consequence P0 coverage gap from ANALYSIS-004
 * Audit A — the PROPOSED -> ACCEPTED transition is the architectural decision
 * gate, and the claim validator is its hook-layer / per-skill enforcement
 * surface (so a lying ACCEPTED claim is rejected at write-time without the
 * orchestrator having to remember to invoke the schema).
 *
 * Contract per REQ-003 + DESIGN-001:
 * - When ADR status is NOT `"ACCEPTED"` → `{ ok: true, unsatisfied: [] }`
 *   without inspecting any body field. The validator only gates the ACCEPTED
 *   terminal transition; PROPOSED / DEPRECATED / SUPERSEDED pass trivially.
 * - When ADR status IS `"ACCEPTED"`, two independent checks run:
 *     1. Every Clarifications item must be checked (`done === true`). When the
 *        section is absent (`clarifications === undefined`), the check is
 *        skipped — mirrors the schema superRefine, which only fires when the
 *        section is present.
 *     2. Every Considered Option must carry a non-empty rationale (after
 *        trimming whitespace).
 *   Each failing item contributes one `unsatisfied` entry.
 *
 * Result shape uses the `{ ok, unsatisfied }` discriminant with structured
 * `{ path, reason }` entries per the TASK-007 DoD (distinct from the
 * `ClaimResult` PASS/FAIL verdict shape used by TASK/REQ/DESIGN/SPEC
 * validators). `path` follows the dotted-bracket form (e.g.,
 * `clarifications[2].checkbox`, `considered_options[0].rationale`) so callers
 * can cite the exact offending field. Pure function — no I/O, no mutation,
 * no console output.
 */

/** One structured finding: the dotted-bracket path + a human-readable reason. */
export interface AdrUnsatisfiedItem {
  path: string;
  reason: string;
}

export type AdrClaimResult =
  | { ok: true; unsatisfied: readonly [] }
  | { ok: false; unsatisfied: ReadonlyArray<AdrUnsatisfiedItem> };

/**
 * Validate an AdrNote's ACCEPTED-claim. PASS when status is not ACCEPTED, or
 * when status is ACCEPTED and every Clarifications item is checked and every
 * Considered Option carries a non-empty rationale.
 */
export function validateAdrAcceptedClaim(adrNote: AdrNote): AdrClaimResult {
  if (adrNote.frontmatter.status !== "ACCEPTED") {
    return { ok: true, unsatisfied: [] };
  }

  const unsatisfied: AdrUnsatisfiedItem[] = [];

  // Check 1: every Clarifications item must be checked. Section is optional;
  // when absent, the check is skipped (mirrors the schema superRefine).
  const clarifications = adrNote.clarifications;
  if (clarifications !== undefined) {
    for (let i = 0; i < clarifications.length; i++) {
      const item = clarifications[i];
      if (!item) continue;
      if (!item.done) {
        unsatisfied.push({
          path: `clarifications[${i}].checkbox`,
          reason: `Clarifications item is unchecked: ${item.text}`,
        });
      }
    }
  }

  // Check 2: every Considered Option must carry a non-empty rationale (after
  // trimming whitespace), so an ACCEPTED ADR cannot lock a decision with an
  // empty justification.
  const consideredOptions = adrNote.considered_options;
  for (let i = 0; i < consideredOptions.length; i++) {
    const option = consideredOptions[i];
    if (!option) continue;
    if (option.rationale.trim().length === 0) {
      unsatisfied.push({
        path: `considered_options[${i}].rationale`,
        reason: `Considered Option lacks a non-empty rationale: ${option.name}`,
      });
    }
  }

  if (unsatisfied.length === 0) {
    return { ok: true, unsatisfied: [] };
  }
  return { ok: false, unsatisfied };
}
