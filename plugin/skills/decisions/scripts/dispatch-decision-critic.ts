#!/usr/bin/env bun
/**
 * dispatch-decision-critic brief generator (decisions skill).
 *
 * Emits a markdown dispatch brief for the decision-critic subagent that
 * adversarially stress-tests a pending D-N at Step 2a of the /decisions
 * per-D-N micro-cycle before the user is asked to adjudicate.
 *
 * The brief includes:
 *   - Decision scope (d-n-id + topic-description supplied as CLI args)
 *   - The adversarial-reviewer asymmetry mandate verbatim
 *   - The full options set to critique
 *
 * Trust boundary (ADR-005 D-4): inputs are scope identifiers from the
 * trusted orchestrator runtime. No path-containment check needed; no
 * filesystem reads beyond module-load constants.
 *
 * Exit codes:
 *   0  success — stdout is the brief markdown
 *   2  usage error — missing required args; stderr prints usage line
 */

import { validRelationTypes } from "@acmelabs/models/schemas/common";

/** Stable marker substring asserted by colocated tests. */
export const ADVERSARIAL_ASYMMETRY_MANDATE_MARKER = "ADVERSARIAL ASYMMETRY MANDATE";

export interface DecisionCriticBriefArgs {
  /** Decision identifier, e.g. "D-3" */
  dnId: string;
  /** Short topic description, e.g. "storage backend choice" */
  topicDescription: string;
  /**
   * Optional free-text options block pasted from the source ANALYSIS note.
   * When omitted the brief instructs the critic to read options from the
   * ANALYSIS note directly.
   */
  optionsBlock?: string;
}

/**
 * Render the decision-critic dispatch brief. Deterministic: same args → byte-identical output.
 * No timestamps, no randomness, no env lookups.
 */
export function renderDecisionCriticBrief(args: DecisionCriticBriefArgs): string {
  const optionsSection = args.optionsBlock
    ? ["## Options to Stress-Test", "", args.optionsBlock, ""]
    : [
        "## Options to Stress-Test",
        "",
        "(Read the options verbatim from the source ANALYSIS note for this D-N.)",
        "",
      ];

  return [
    "# Decision-Critic Dispatch Brief — Adversarial Stress-Test",
    "",
    "## Scope",
    "",
    `- **Decision**: ${args.dnId} — ${args.topicDescription}`,
    "",
    ...optionsSection,
    `## ${ADVERSARIAL_ASYMMETRY_MANDATE_MARKER}`,
    "",
    "The decision-critic's role is to **adversarially stress-test the decision**.",
    "Assume the reasoning is flawed until evidence proves otherwise.",
    "The critic's incentive is to **find problems, not rubber-stamp**.",
    "",
    "Apply the following asymmetric framing:",
    "",
    "- **Assume the leading option is wrong** until you have affirmatively ruled out its failure modes.",
    "- **Surface hidden assumptions**: which claims are presented as facts but require evidence?",
    "- **Check for anchoring bias**: did the option set prematurely narrow the solution space?",
    "- **Stress-test counterarguments**: what are the strongest objections to each option that the analysis did NOT address?",
    "- **Surface at least one concrete concern** even on strong work — cite specific option content or source ANALYSIS section.",
    "- **Never rubber-stamp**: a report of all-clear with zero concerns is not credible and WILL trigger re-dispatch.",
    "",
    "## Critique Dimensions (minimum coverage)",
    "",
    "For each option, evaluate:",
    "",
    "1. **Correctness of rationale** — are the stated pros/cons accurate? Cite counter-evidence if not.",
    "2. **Unstated alternatives** — is there a plausible option the analysis omitted?",
    "3. **Risk asymmetry** — are downside risks proportional to the upside claims?",
    "4. **Reversibility** — how hard is it to undo this decision if it turns out wrong?",
    "5. **Cross-D-N implications** — does choosing this option constrain or conflict with other LOCKED or PENDING D-Ns?",
    "6. **Relation-type hygiene** — if the ADR will reference other notes, are the relation verbs drawn from the allowlist?",
    "",
    "### Valid relation verbs (from shared/composition/src/schemas/common.ts)",
    "",
    ...validRelationTypes.map((v) => `- \`${v}\``),
    "",
    "## Output format",
    "",
    "Return a structured stress-test report:",
    "",
    "```markdown",
    "## Decision-Critic Report: <D-N> — <topic>",
    "",
    "### Critical concerns",
    "",
    "- <concern 1 with citation>",
    "- <concern 2 with citation>",
    "",
    "### Moderate concerns",
    "",
    "- <moderate concern with citation>",
    "",
    "### Verdict",
    "",
    "PROCEED | HALT",
    "",
    "PROCEED: all critical concerns addressable within current option set.",
    "HALT: a critical reasoning gap requires option-set revision before AskUserQuestion.",
    "```",
    "",
    "Cite SESSION Event numbers and ANALYSIS section references for every claim.",
    "Evidence hierarchy: (1) tool output, (2) files read, (3) web/docs search, (4) training knowledge.",
  ].join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const dnId = argv[0];
  const topicDescription = argv[1];

  if (!dnId || !topicDescription) {
    process.stderr.write(
      "usage: dispatch-decision-critic.ts <dn-id> <topic-description> [options-block]\n",
    );
    return 2;
  }

  const optionsBlock = argv[2];
  const briefArgs =
    optionsBlock !== undefined
      ? { dnId, topicDescription, optionsBlock }
      : { dnId, topicDescription };
  process.stdout.write(renderDecisionCriticBrief(briefArgs));
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  process.exit(await main(Bun.argv.slice(2)));
}
