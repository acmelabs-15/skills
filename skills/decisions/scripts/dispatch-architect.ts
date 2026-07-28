#!/usr/bin/env bun
/**
 * dispatch-architect brief generator (decisions skill).
 *
 * Emits a markdown dispatch brief for the architect subagent that authors
 * the composite ADR at Step 5 of the /decisions workflow.
 *
 * The brief includes:
 *   - ADR scope (adr-ref + d-n-count supplied as CLI args)
 *   - Structural ADR Requirements derived programmatically from AdrNoteSchema
 *     so the brief stays in sync with the validator automatically
 *   - The detail-parity mandate verbatim
 *
 * Trust boundary (ADR-005 D-4): inputs are scope identifiers from the
 * trusted orchestrator runtime. No path-containment check needed; no
 * filesystem reads beyond module-load constants.
 *
 * Exit codes:
 *   0  success — stdout is the brief markdown
 *   2  usage error — missing required args; stderr prints usage line
 */

import { AdrNoteStatusEnum } from "@acmelabs/models/schemas/adr-note";
import {
  ObservationCategoryEnum,
  RelationVerbEnum,
  validRelationTypes,
} from "@acmelabs/models/schemas/common";

export interface ArchitectBriefArgs {
  /** Wikilink-style ADR ref, e.g. "ADR-005: Protocol Hardening Wave 2 Architecture" */
  adrRef: string;
  /** Number of LOCKED D-Ns to include in the composite ADR */
  dnCount: number;
}

/**
 * Render the architect dispatch brief. Deterministic: same args → byte-identical output.
 * No timestamps, no randomness, no env lookups.
 */
export function renderArchitectBrief(args: ArchitectBriefArgs): string {
  const validStatuses = AdrNoteStatusEnum.options.join(" | ");
  const validCategories = ObservationCategoryEnum.options.join(", ");
  const validVerbs = RelationVerbEnum.options.join(", ");

  return [
    "# Architect Dispatch Brief — Composite ADR Authoring",
    "",
    "## Scope",
    "",
    `- **ADR**: ${args.adrRef}`,
    `- **D-N count**: ${args.dnCount} LOCKED decisions to author`,
    "",
    "## Structural ADR Requirements",
    "",
    "The following requirements are enforced by `validateAdrAcceptedClaim` and `AdrNoteSchema`.",
    "The ADR MUST satisfy all of these before status can advance to ACCEPTED.",
    "",
    "### Frontmatter requirements",
    "",
    "- `type: decision` (literal)",
    `- \`status\` must be one of: ${validStatuses}`,
    "- `date: YYYY-MM-DD` — set on first PROPOSED/ACCEPTED transition",
    "- `updated: YYYY-MM-DD` — refreshed on Clarifications or substantive body change",
    "- `title` must start with `ADR-NNN` prefix",
    "- `permalink` must match pattern `decisions/adr-NNN-`",
    "- `tags`: 2-5 lowercase hyphenated entries",
    "",
    "### Considered Options (required; ACCEPTED gate)",
    "",
    "- Each D-N MUST have a `## Considered Options` section listing the options evaluated.",
    "- Every Considered Option MUST carry a **non-empty rationale** (whitespace-only = rejected).",
    "- `validateAdrAcceptedClaim` check: `considered_options[i].rationale.trim().length > 0` for every option.",
    "",
    "### Clarifications section (conditional; ACCEPTED gate when present)",
    "",
    "- If `## Clarifications` is present, every checkbox item MUST be checked (`[x]`).",
    "- An ADR with no Clarifications section passes this check unconditionally.",
    "- `validateAdrAcceptedClaim` check: `clarifications[i].done === true` for every item.",
    "",
    "### Structural body requirements",
    "",
    "- At least one H2 section (typically `## Context`) is required.",
    "- Per universal invariant: `## Observations` then `## Relations` are the FINAL two sections.",
    "- `## Clarifications` (when present) goes BEFORE `## Observations`, never after `## Relations`.",
    `- Observations: minimum 3 entries; each with \`[category]\` prefix from: ${validCategories}`,
    `- Relations: minimum 2 entries; each verb must be one of: ${validVerbs}`,
    "",
    "### Schema-enforced relation verbs (complete allowlist)",
    "",
    ...validRelationTypes.map((v) => `- \`${v}\``),
    "",
    "## Detail-Parity Mandate",
    "",
    "**Preserve every detail from SESSION events; do not summarize.**",
    "The composite ADR's per-D-N section MUST be AT LEAST as detailed as the corresponding SESSION Event body.",
    "Compression detected during the detail-parity audit (Step 6) triggers re-dispatch.",
    "",
    "Evidence hierarchy (highest to lowest priority):",
    "1. Tool output from this dispatch",
    "2. Files read in this dispatch",
    "3. Web/docs search",
    "4. Training knowledge (lowest priority — always cite source)",
    "",
    "When ADR content mirrors a SESSION Event verbatim, cite the source Event reference inline.",
    "",
    "## 11-Section Per-D-N Template",
    "",
    "Each LOCKED D-N becomes one section authored in order D-1, D-2, ..., D-N.",
    "Each section MUST contain these 11 sub-sections:",
    "",
    "1. **Decision Statement** — one sentence; verbatim from AskUserQuestion option label + user refinements",
    "2. **Context** — why this decision was needed; cite source ANALYSIS + SESSION Event",
    "3. **Decision Drivers** — constraints, requirements, non-negotiables driving the choice",
    "4. **Considered Options** — all options evaluated with rationale (REQUIRED; ACCEPTED gate)",
    "5. **Decision Outcome** — chosen option with justification",
    "6. **Consequences** — positive + negative + neutral consequences",
    "7. **Vendor Lock-in Assessment** — scope of lock-in introduced (even if none)",
    "8. **Confirmation** — how compliance with this decision will be verified",
    "9. **Cross-Cutting Implications** — how this D-N constrains or enables other D-Ns",
    "10. **Failure Modes** — known ways this decision can go wrong",
    "11. **Performance Considerations** — latency, throughput, resource impact (even if negligible)",
  ].join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const adrRef = argv[0];
  const dnCountRaw = argv[1];

  if (!adrRef || !dnCountRaw) {
    process.stderr.write("usage: dispatch-architect.ts <adr-ref> <dn-count>\n");
    return 2;
  }

  const dnCount = Number.parseInt(dnCountRaw, 10);
  if (!Number.isInteger(dnCount) || dnCount < 1) {
    process.stderr.write(
      "usage: dispatch-architect.ts <adr-ref> <dn-count> — dn-count must be a positive integer\n",
    );
    return 2;
  }

  process.stdout.write(renderArchitectBrief({ adrRef, dnCount }));
  return 0;
}

/* istanbul ignore next -- @preserve */
if (import.meta.main) {
  process.exit(await main(Bun.argv.slice(2)));
}
