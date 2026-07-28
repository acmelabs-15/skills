import { type PlanNote, isTerminalPartSubstatus } from "../schemas/plan-note.js";

/**
 * PLAN done-claim validator (SPEC-008 REQ-003, TASK-010, Wave 2).
 *
 * Runtime-callable equivalent of the parse-time `superRefine` arm in
 * `PlanNoteSchema`: given an already-parsed `PlanNote`, returns whether the
 * note legitimately claims status DONE. Closes the Wave 1 gap (PLAN had no
 * done-claim enforcement at either parse-time or call-time).
 *
 * Contract per REQ-003:
 * - When PLAN status is NOT `"DONE"` → `{ ok: true }`. The validator only
 *   gates DONE claims; non-DONE notes pass trivially (they aren't claiming
 *   completion).
 * - When PLAN status IS `"DONE"` and every part substatus is terminal
 *   (`DONE`, `DEFERRED`, `ABANDONED`) → `{ ok: true }`.
 * - When PLAN status IS `"DONE"` and any part substatus is non-terminal
 *   (`PENDING`, `READY`, `IN_PROGRESS`, `BLOCKED`) → `{ ok: false, unsatisfied: [...] }`.
 *
 * Each `unsatisfied` entry names the offending part by its id + current
 * substatus so the orchestrator can re-engage the upstream agent with a
 * concrete instruction. Pure function — no I/O, no mutation.
 *
 * Distinct from `ClaimResult` (used by TASK/REQ/DESIGN/SPEC/QA validators)
 * by deliberate design per TASK-010 DoD: the PLAN gate is a binary go/no-go
 * over a list of part-substatus violations (not a checkbox-list compliance
 * check), so its result shape uses an `ok` discriminant with a flat
 * unsatisfied array. The DoD locks this shape verbatim.
 */

export type PlanClaimResult =
  | { ok: true }
  | { ok: false; unsatisfied: ReadonlyArray<{ part_id: string; substatus: string }> };

/**
 * Validate a PlanNote's done-claim. PASS when status is not DONE, or when
 * status is DONE and every part is in a terminal substatus.
 */
export function validatePlanDoneClaim(planNote: PlanNote): PlanClaimResult {
  if (planNote.frontmatter.status !== "DONE") {
    return { ok: true };
  }
  const unsatisfied: Array<{ part_id: string; substatus: string }> = [];
  for (const part of planNote.parts) {
    if (!isTerminalPartSubstatus(part.substatus)) {
      unsatisfied.push({ part_id: part.id, substatus: part.substatus });
    }
  }
  if (unsatisfied.length === 0) {
    return { ok: true };
  }
  return { ok: false, unsatisfied };
}
