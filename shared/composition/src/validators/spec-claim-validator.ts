import type { SpecRootCheckboxItem, SpecRootNote } from "../schemas/spec-root-note.js";
import type { ClaimResult, UnsatisfiedItem } from "./types.js";

/**
 * SpecRoot DONE-claim validator (Phase X.D.7, 2026-05-21).
 *
 * Mechanical enforcement of the per-TASK build+qa cycle protocol at the
 * SPEC layer (~/.claude/memory/feedback_per_task_build_qa_cycle.md, TIER-1
 * BLOCKING). A claim "SPEC done" requires every Success Criteria item AND
 * every Artifact Status item to be [x] OR deferred-with-rationale.
 *
 * Both sections are OPTIONAL. When both are absent, returns PASS with total 0
 * (no completion gates to honor — the author opted out of mechanical tracking,
 * symmetric to DesignNote when compliance_criteria is absent). When either is
 * present, every item in that section must be satisfied. Unsatisfied items
 * carry a `section` discriminator so callers can cite which list the failure
 * came from.
 *
 * X.E (ADR-005 D-6, LOCKED 2026-05-23): SPEC-root artifact-status rows accept a
 * THIRD terminal marker `[~]` (deferred) alongside `[x]` (done). This is the
 * SPEC-ROOT terminal predicate ONLY — see `isSpecRootTerminal`. TASK DoD items
 * are gated by a DISTINCT predicate in `task-claim-validator.ts` that has never
 * shared code with this module and continues to reject any non-`done`,
 * non-deferred-with-rationale item (the TASK-note schema carries no `marker`
 * field, so `[~]` is structurally unrepresentable as terminal on a TASK DoD
 * line). The scope split mandated by REQ-008-SPEC-008 AC-4 is therefore
 * satisfied structurally: two named predicates in two modules, never one.
 */

/**
 * SPEC-root terminal predicate. An artifact-status / success-criteria row is
 * terminal when it is done (`[x]`), carries the deferred marker (`[~]`), or is
 * deferred-with-rationale. The `[~]` branch is SPEC-root-scoped — do NOT reuse
 * this predicate for TASK DoD evaluation (use validateTaskDoneClaim, which
 * accepts `[x]` only).
 */
function isSpecRootTerminal(item: SpecRootCheckboxItem): boolean {
  if (item.done) return true;
  if (item.marker === "~") return true;
  return typeof item.deferred_rationale === "string" && item.deferred_rationale.length > 0;
}

function collect(
  items: readonly SpecRootCheckboxItem[] | undefined,
  section: string,
  offset: number,
): UnsatisfiedItem[] {
  if (items === undefined) return [];
  const out: UnsatisfiedItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (!isSpecRootTerminal(item)) {
      out.push({ index: offset + i, text: item.text, section });
    }
  }
  return out;
}

/**
 * Validate a SpecRootNote's `## Success Criteria` + `## Artifact Status`
 * checklists against the SPEC-done claim. PASS only if every item across
 * both sections is checked or deferred-with-rationale.
 */
export function validateSpecDoneClaim(spec: SpecRootNote): ClaimResult {
  const sc = spec.success_criteria;
  const as = spec.artifact_status;
  if (sc === undefined && as === undefined) {
    return { verdict: "PASS", total: 0 };
  }
  const scLen = sc?.length ?? 0;
  const asLen = as?.length ?? 0;
  const total = scLen + asLen;
  const unsatisfied: UnsatisfiedItem[] = [
    ...collect(sc, "success_criteria", 0),
    ...collect(as, "artifact_status", scLen),
  ];
  if (unsatisfied.length === 0) {
    return { verdict: "PASS", total };
  }
  return { verdict: "FAIL", total, unsatisfied };
}
