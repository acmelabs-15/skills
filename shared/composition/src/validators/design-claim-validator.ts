import type { ComplianceCheckboxItem, DesignNote } from "../schemas/design-note.js";
import type { ClaimResult } from "./types.js";

/**
 * Design compliance claim validator (Phase X.D.6, 2026-05-20).
 *
 * Mechanical enforcement of the per-TASK build+qa cycle protocol at the
 * DESIGN layer: QA validates implementation against the OPTIONAL `## Compliance`
 * (or `## Architecture Compliance`) checkbox list.
 *
 * Asymmetric vs the Task/REQ variants: the compliance section is optional.
 * When `design.compliance_criteria` is undefined (the author opted out of
 * mechanical compliance tracking), this returns PASS with total 0 — there
 * is no contract to validate. When present, every item must be [x] OR
 * deferred-with-rationale, mirroring the other claim validators.
 */

function isSatisfied(item: ComplianceCheckboxItem): boolean {
  if (item.done) return true;
  return typeof item.deferred_rationale === "string" && item.deferred_rationale.length > 0;
}

/**
 * Validate a DesignNote's `## Compliance` checklist against the QA
 * satisfied-claim. Section is optional; when absent, returns PASS with
 * total 0 (no compliance criteria to honor at this scope).
 */
export function validateDesignComplianceClaim(design: DesignNote): ClaimResult {
  const items = design.compliance_criteria;
  if (items === undefined) {
    return { verdict: "PASS", total: 0 };
  }
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
