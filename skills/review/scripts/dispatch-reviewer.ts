#!/usr/bin/env bun
/**
 * dispatch-reviewer — review skill dispatch-brief generator (REQ-005).
 *
 * Emits the full reviewer dispatch brief to stdout given a PR-type
 * classification. The brief lists the review axes relevant to that PR type
 * plus the reviewer-asymmetry mandate.
 *
 * The PR-type-to-axes mapping (CODE / DOCS / CONFIG / TEST → axis list) is a
 * single lookup table (AXES_BY_PR_TYPE) so adding a PR type or axis is a
 * one-place change — mirrors review/SKILL.md Step 2 adaptive-axis-selection.
 *
 * Deterministic: same args → byte-identical stdout.
 * No filesystem reads beyond module load (ADR-005 D-4 trust boundary): the
 * pr-type arg comes from the trusted orchestrator runtime, not from external
 * user input — no path-containment check applies.
 *
 * Exit codes:
 *   0  success (stdout = brief markdown)
 *   2  usage error (missing / unknown PR-type arg — stderr = usage line)
 */

/** The four PR-type classifications driving adaptive axis selection. */
export const PR_TYPES = ["CODE", "DOCS", "CONFIG", "TEST"] as const;
export type PrType = (typeof PR_TYPES)[number];

/**
 * PR-type → relevant review axes (review/SKILL.md Step 2 table, verbatim).
 * Single source of truth: adding a PR type or axis is a one-place change.
 */
export const AXES_BY_PR_TYPE: Readonly<Record<PrType, readonly string[]>> = {
  CODE: [
    "code-qualities-assessment",
    "incoherence",
    "orphan-ref",
    "markdown-lint",
    "biome-lint",
    "architect",
    "qa",
    "security",
  ],
  DOCS: ["markdown-lint", "incoherence"],
  CONFIG: ["code-qualities-assessment", "biome-lint", "security"],
  TEST: ["qa", "markdown-lint", "biome-lint", "code-qualities-assessment"],
} as const;

function isPrType(value: string): value is PrType {
  return (PR_TYPES as readonly string[]).includes(value);
}

/**
 * Render the reviewer dispatch brief. Deterministic: same args → byte-identical output.
 * No timestamps, no randomness, no env lookups.
 */
export function renderReviewerBrief(prType: PrType): string {
  const axes = AXES_BY_PR_TYPE[prType];

  return [
    "# Reviewer Dispatch Brief — Adaptive Multi-Axis Review",
    "",
    "## Scope",
    "",
    `- **PR type**: ${prType}`,
    "",
    "## Axis selection (from PR-type-to-axes mapping)",
    "",
    `The ${prType} PR type runs the following review axes:`,
    "",
    ...axes.map((a) => `- ${a}`),
    "",
    "## Reviewer asymmetry mandate",
    "",
    "Review this diff as a stranger to the work. Your job is to find failures, not",
    "to confirm success. Do NOT give the author the benefit of the doubt on",
    'ambiguous items. "Looks good" is a failure mode — surface at least one concrete',
    "concern even on strong work. Cite `file:line` evidence for every finding",
    "(or a wikilink for a Brain-entity finding); a finding without evidence is",
    "rejected because the author cannot act on it.",
  ].join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const prType = argv[0];
  if (!prType) {
    process.stderr.write(`usage: dispatch-reviewer.ts <${PR_TYPES.join("|")}>\n`);
    return 2;
  }
  if (!isPrType(prType)) {
    process.stderr.write(
      `usage: dispatch-reviewer.ts <${PR_TYPES.join("|")}> — unknown PR type: ${prType}\n`,
    );
    return 2;
  }
  process.stdout.write(renderReviewerBrief(prType));
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  process.exit(await main(Bun.argv.slice(2)));
}
