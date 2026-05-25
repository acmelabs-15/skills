import { z } from "zod";
import { EntityIdSchema, ObservationSchema, RelationSchema } from "./common.js";

/**
 * CritNote Zod schema (SPEC-008 Track 1, REQ-001, TASK-004, 2026-05-24).
 *
 * Mirrors the canonical CRIT note structure per ~/KNOWLEDGE-GRAPH-STRUCTURES.md
 * Section 4.11 and the universal invariants in ~/KNOWLEDGE-GRAPH-CONVENTIONS.md
 * Section 4.
 *
 * Closes the P1 coverage gap from ANALYSIS-004 Audit A: CRIT notes had zero
 * structural validation coverage. Before this schema, a CRIT could land
 * without any Findings section while still claiming to be a multi-agent
 * review — defeating the role of CRIT as adr-review convergence evidence.
 *
 * Structural approach mirrors AdrNote: CRIT body content varies legitimately
 * (Verdict Tally, Context, Round Context, P0/P1/P2 Issues, Points of
 * Consensus, Strategic Dissent, etc.). Rather than fix a closed set of H2
 * sections, this schema standardizes the one mechanically load-bearing
 * structural invariant — a typed `findings` array with per-finding fields
 * (severity enum, description, recommendation) per the TASK DoD — and folds
 * the remaining prose H2 sections into an opaque `sections` Record keyed by
 * H2 heading text.
 *
 * Parent-reference frontmatter title: CRIT notes are parent-referenced
 * (CONVENTIONS Section 1.2). Frontmatter title MUST start with
 * `CRIT-NNN-PARENT-NNN` where PARENT is one of the six referenceable entity
 * types: ADR | ANALYSIS | SPEC | REQ | DESIGN | TASK. Un-parented CRIT notes
 * (just `CRIT-NNN-...`) are invalid.
 *
 * Per ADR-005-SPEC-008 D-5, CRIT receives a schema and parser but NO claim
 * validator — there is no terminal-status claim on a CRIT that warrants a
 * mechanical check. The schema provides read-time structural validation in
 * support of adr-review convergence.
 *
 * Out of scope this round: CritNote parser. Schema only.
 */

/**
 * Status enum for CritNote frontmatter.
 *
 * Per CONVENTIONS Section 8.1 item 6, general-note status values are
 * `DRAFT | ACCEPTED | PROPOSED | IN_PROGRESS | IN_REVIEW | DONE | DEPRECATED`.
 * CRIT uses this general enum. No status-gated superRefine is enforced
 * here per D-5 (no terminal-status claim).
 */
export const CritNoteStatusEnum = z.enum([
  "DRAFT",
  "PROPOSED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "ACCEPTED",
  "DONE",
  "DEPRECATED",
]);

/**
 * Severity enum for individual CRIT findings. Mirrors the P0/P1/P2 grouping
 * convention used in CRIT bodies per STRUCTURES Section 4.11. The typed
 * array carries severity per-finding so downstream tooling (rendering,
 * triage) can group without reparsing prose.
 */
export const CritFindingSeverityEnum = z.enum(["P0", "P1", "P2"]);

/**
 * Frontmatter regex (exact, per TASK-004 DoD item 2):
 *   ^CRIT-\d{3}-(ADR|ANALYSIS|SPEC|REQ|DESIGN|TASK)-\d{3}.*
 *
 * PARENT-TYPE allowlist is fixed at the six referenceable entity types per
 * CONVENTIONS Section 1.2. Un-parented form (just `CRIT-NNN-...`) is
 * INVALID and rejected at parse time.
 */
const CritFrontmatterSchema = z
  .object({
    title: z.string().regex(/^CRIT-\d{3}-(ADR|ANALYSIS|SPEC|REQ|DESIGN|TASK)-\d{3}.*/),
    type: z.literal("critique"),
    status: CritNoteStatusEnum,
    permalink: z.string().regex(/^critique\//),
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

/**
 * A single CRIT finding entry. Carries the three TASK-DoD-mandated fields:
 *   - severity (P0/P1/P2 enum)
 *   - description (what the finding is)
 *   - recommendation (what to do about it)
 *
 * Recommendation is required and non-empty per the DoD. A CRIT finding
 * without a recommendation is incomplete — review output without a
 * proposed remediation does not satisfy the "supports adr-review
 * convergence" purpose stated in REQ-001.
 */
const CritFindingSchema = z
  .object({
    severity: CritFindingSeverityEnum,
    description: z.string().min(1),
    recommendation: z.string().min(1),
  })
  .strict();

export const CritNoteSchema = z
  .object({
    frontmatter: CritFrontmatterSchema,
    sections: z
      .record(z.string(), z.string().min(1))
      .refine((rec) => Object.keys(rec).length >= 1, {
        message: "At least one H2 section is required",
      }),
    findings: z.array(CritFindingSchema).min(1),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Cross-field invariant: derived CRIT id (from frontmatter title) must
    // be a valid entity ID per EntityIdSchema. Defensive check beyond the
    // title regex which only asserts the CRIT-NNN-PARENT-NNN prefix shape.
    const titleMatch = data.frontmatter.title.match(/^(CRIT-\d{3})/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = EntityIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields CRIT id ${derivedId} which fails EntityIdSchema`,
          path: ["frontmatter", "title"],
        });
      }
    }
  });

export type CritNote = z.infer<typeof CritNoteSchema>;
export type CritFrontmatter = z.infer<typeof CritFrontmatterSchema>;
export type CritFinding = z.infer<typeof CritFindingSchema>;
export type CritNoteStatus = z.infer<typeof CritNoteStatusEnum>;
export type CritFindingSeverity = z.infer<typeof CritFindingSeverityEnum>;
