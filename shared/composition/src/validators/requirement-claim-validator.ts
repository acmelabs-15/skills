import type { EarsAcceptanceItem, RequirementNote } from "../schemas/requirement-note.js";
import type { ClaimResult } from "./types.js";

/**
 * Requirement acceptance-criteria claim validator (Phase X.D.6, 2026-05-20).
 *
 * Mechanical enforcement of the per-TASK build+qa cycle protocol at the REQ
 * layer: QA validates implementation against `## Acceptance Criteria`
 * EARS Given/When/Then bullets. A claim "REQ satisfied" requires every AC
 * item to be [x] OR explicitly deferred-with-rationale. The PASS/FAIL verdict
 * surfaces the specific failing items so the orchestrator can re-engage the
 * agent with concrete instructions, making lying mechanically impossible.
 *
 * Mirrors the shape of validateTaskDoneClaim — same `ClaimResult` shape,
 * same satisfaction predicate, so QA aggregation iterates uniformly across
 * TASK DoD, TASK ADR-compliance, REQ AC, and DESIGN compliance.
 */

function isSatisfied(item: EarsAcceptanceItem): boolean {
  if (item.done) return true;
  return typeof item.deferred_rationale === "string" && item.deferred_rationale.length > 0;
}

/**
 * Validate a RequirementNote's `## Acceptance Criteria` checklist against
 * the implementer/QA satisfied-claim. PASS only if every AC item is checked
 * or deferred-with-rationale.
 */
export function validateRequirementAcClaim(req: RequirementNote): ClaimResult {
  const items = req.acceptance_criteria;
  const unsatisfied: Array<{ index: number; text: string }> = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (!isSatisfied(item)) {
      unsatisfied.push({ index: i, text: item.text });
    }
  }
  if (unsatisfied.length === 0) {
    return { verdict: "PASS", total: items.length };
  }
  return { verdict: "FAIL", total: items.length, unsatisfied };
}
