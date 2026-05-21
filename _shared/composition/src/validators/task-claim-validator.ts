import type { DodCheckboxItem, TaskNote } from "../schemas/task-note.js";

/**
 * DoD claim validator (Phase X.D.5, 2026-05-20).
 *
 * Mechanical enforcement of the per-TASK build+qa cycle protocol
 * (~/.claude/memory/feedback_per_task_build_qa_cycle.md, TIER-1 BLOCKING):
 * an implementer claim "TASK done" requires every Definition of Done item
 * to be [x] OR explicitly deferred-with-rationale. A schema-rejected claim
 * surfaces the specific failing items so the orchestrator can re-engage
 * the agent with concrete instructions, making lying mechanically impossible.
 *
 * PASS shape carries `total` for symmetric reporting (zero items still PASS
 * for the ADR-compliance variant when the section is absent).
 */

export type DoDClaimResult =
  | { verdict: "PASS"; total: number }
  | {
      verdict: "FAIL";
      total: number;
      unsatisfied: Array<{ index: number; text: string }>;
    };

function isSatisfied(item: DodCheckboxItem): boolean {
  if (item.done) return true;
  return typeof item.deferred_rationale === "string" && item.deferred_rationale.length > 0;
}

function evaluate(items: readonly DodCheckboxItem[]): DoDClaimResult {
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

/**
 * Validate a TaskNote's `## Definition of Done` checklist against the
 * implementer's done-claim. PASS only if every item is checked or
 * deferred-with-rationale.
 */
export function validateTaskDoneClaim(task: TaskNote): DoDClaimResult {
  return evaluate(task.definition_of_done);
}

/**
 * Symmetric variant for `## ADR Compliance` checklist. Section is optional;
 * when absent, returns PASS with total 0 (no ADRs to honor at this scope).
 */
export function validateTaskAdrComplianceClaim(task: TaskNote): DoDClaimResult {
  const items = task.adr_compliance;
  if (items === undefined) {
    return { verdict: "PASS", total: 0 };
  }
  return evaluate(items);
}
