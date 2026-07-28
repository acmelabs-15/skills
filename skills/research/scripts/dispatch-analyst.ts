#!/usr/bin/env bun
/**
 * dispatch-analyst — research skill dispatch-brief generator (REQ-005).
 *
 * Emits the full analyst dispatch brief to stdout given a per-requirement scope.
 * The brief embeds three principle-level mandates as inline prose:
 *   - no-open-questions     (literal marker: NO OPEN QUESTIONS)
 *   - rubric-as-floor       (literal marker: RUBRIC IS FLOOR)
 *   - analysis-surfaces-options (options-with-pros/cons; /decisions locks)
 *
 * Imports ObservationCategoryEnum from common.ts so the observation-category
 * allowlist auto-propagates when common.ts changes — no manual prose sync
 * (ADR-005 D-4, Audit C root cause fix).
 *
 * Deterministic: same args → byte-identical stdout.
 * No filesystem reads beyond module load (ADR-005 D-4 trust boundary): the
 * requirement-scope arg comes from the trusted orchestrator runtime, not from
 * external user input — no path-containment check applies.
 *
 * Exit codes:
 *   0  success (stdout = brief markdown)
 *   2  usage error (missing required scope arg — stderr = usage line)
 */

import { ObservationCategoryEnum } from "../../../shared/composition/src/schemas/common.ts";

export interface AnalystBriefArgs {
  /** Per-requirement scope identifier, e.g. "REQ-005-SPEC-008" or a topic slug. */
  reqScope: string;
}

/**
 * Render the analyst dispatch brief. Deterministic: same args → byte-identical output.
 * No timestamps, no randomness, no env lookups.
 */
export function renderAnalystBrief(args: AnalystBriefArgs): string {
  const validCategories = ObservationCategoryEnum.options.join(", ");

  return [
    "# Analyst Dispatch Brief — Per-Requirement Analysis",
    "",
    "## Scope",
    "",
    `- **Requirement**: ${args.reqScope}`,
    "",
    "## NO OPEN QUESTIONS mandate",
    "",
    "Your ANALYSIS note MUST land WITHOUT unresolved questions.",
    "An `## Open Questions` section is a FORBIDDEN output structure.",
    "Resolve every question IN this analysis pass — via codebase research, external",
    "research, or a real-time user check-in. Deferring a question to a later phase",
    "(/decisions, synthesis, or implementation) is not permitted.",
    "",
    "## RUBRIC IS FLOOR mandate",
    "",
    "The rubric you are given is a FLOOR, not a ceiling.",
    "Identify and add additional dimensions specific to this codebase/topic beyond",
    "the rubric's named dimensions, and propagate any newly-found dimension to the",
    "other relevant analyses so coverage stays consistent.",
    "",
    "## Analysis surfaces options; /decisions locks",
    "",
    "Surface options-with-pros/cons only. Do NOT lock a choice or state a single",
    "recommendation as decided — the /decisions phase adjudicates each option",
    "(Accept / Modify / Reject). Locking a choice here biases downstream",
    "decision-making and violates the analysis-vs-decisions boundary.",
    "Articulate criteria so they translate cleanly into EARS or checkbox form,",
    "so the spec phase can author verifiable contracts.",
    "",
    "## Evidence hierarchy (highest to lowest priority)",
    "",
    "1. Tool output from this dispatch",
    "2. Files read in this dispatch",
    "3. Web/docs search",
    "4. Training knowledge (lowest priority — always cite source)",
    "",
    "Never state a quantitative claim about scope/coverage/impact without cited",
    "evidence; describe qualitatively with anchors when no source exists.",
    "",
    "## ANALYSIS note structure",
    "",
    "Author the ANALYSIS-NNN note via a single `write_note` call passing the full colon title.",
    `Observations: minimum 3 entries; each with a \`[category]\` prefix from: ${validCategories}`,
    "Relations: minimum 2 entries; `## Observations` then `## Relations` are the FINAL two sections.",
  ].join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const reqScope = argv[0];
  if (!reqScope) {
    process.stderr.write("usage: dispatch-analyst.ts <req-scope>\n");
    return 2;
  }
  process.stdout.write(renderAnalystBrief({ reqScope }));
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  process.exit(await main(Bun.argv.slice(2)));
}
