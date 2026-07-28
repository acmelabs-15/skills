import type { ParsedAnalysisNote } from "../parsers/analysis-note.js";

/**
 * ANALYSIS accepted-claim validator (SPEC-008 REQ-003, TASK-008, Wave 2).
 *
 * Runtime-callable equivalent of the parse-time `superRefine` arm in
 * `AnalysisNoteSchema`: given an already-parsed `ParsedAnalysisNote`, returns
 * whether the note legitimately claims status ACCEPTED. Closes the Wave 7
 * exploit (per ADR-005 D-5): 41 analyses landed as ACCEPTED with a trailing
 * `## Open Questions` section, deferring resolution to the decisions/spec/impl
 * phase in violation of the no-open-questions-in-planning-artifacts principle.
 *
 * Contract per REQ-003:
 * - When ANALYSIS status is NOT `"ACCEPTED"` → `{ ok: true }`. The validator
 *   only gates ACCEPTED claims; non-ACCEPTED notes pass trivially. Analyses
 *   legitimately surface open questions during research — the no-open-questions
 *   rule applies ONLY to locked (ACCEPTED) planning artifacts.
 * - When ANALYSIS status IS `"ACCEPTED"` and no `## Open Questions` section is
 *   present → `{ ok: true }`.
 * - When ANALYSIS status IS `"ACCEPTED"` and the `## Open Questions` section is
 *   present → `{ ok: false, unsatisfied: [...] }` with a single entry.
 *
 * The single `unsatisfied` entry carries `path: "body.hasOpenQuestions"` (the
 * derived parser property the check reads) plus a `reason` so the orchestrator
 * can re-engage the upstream agent with a concrete instruction. Pure function —
 * no I/O, no mutation.
 *
 * Input contract: takes the parser return value `ParsedAnalysisNote`
 * (= `AnalysisNote & { hasOpenQuestions: boolean }`), NOT the bare
 * `.strict()` `AnalysisNote`. The `hasOpenQuestions` flag is a derived
 * property exposed by the TASK-006 parser (it is not a schema field, because
 * `AnalysisNoteSchema` is `.strict()`); the validator reads it directly and
 * does NOT re-parse.
 *
 * Distinct from `ClaimResult` (used by TASK/REQ/DESIGN/SPEC/QA validators) by
 * deliberate design, mirroring `PlanClaimResult` (TASK-010): the ANALYSIS gate
 * is a binary go/no-go over a single structural check (Open Questions presence)
 * rather than a checkbox-list compliance check, so its result shape uses an
 * `ok` discriminant with a flat unsatisfied array of `{ path, reason }`.
 */

export type AnalysisClaimResult =
  | { ok: true }
  | { ok: false; unsatisfied: ReadonlyArray<{ path: string; reason: string }> };

/**
 * Path identifying the derived parser property the check reads. Locked verbatim
 * by TASK-008 DoD item 3.
 */
const OPEN_QUESTIONS_PATH = "body.hasOpenQuestions";

/**
 * Validate a ParsedAnalysisNote's accepted-claim. PASS when status is not
 * ACCEPTED, or when status is ACCEPTED and no Open Questions section is present.
 */
export function validateAnalysisAcceptedClaim(
  analysisNote: ParsedAnalysisNote,
): AnalysisClaimResult {
  if (analysisNote.frontmatter.status !== "ACCEPTED") {
    return { ok: true };
  }
  if (!analysisNote.hasOpenQuestions) {
    return { ok: true };
  }
  return {
    ok: false,
    unsatisfied: [
      {
        path: OPEN_QUESTIONS_PATH,
        reason:
          'Status ACCEPTED forbids a "## Open Questions" section (no-open-questions-in-planning-artifacts rule); resolve questions in the analysis phase before locking',
      },
    ],
  };
}
