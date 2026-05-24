import { z } from "zod";
import { ObservationSchema, RelationSchema, SpecIdSchema } from "./common.js";

/**
 * SpecRootNote Zod schema (Phase X.D.7, 2026-05-21).
 *
 * Mirrors the canonical SPEC root note structure per
 * ~/KNOWLEDGE-GRAPH-STRUCTURES.md Section 4.7 and example
 * docs/specs/SPEC-007-plan-session-render/SPEC-007-plan-session-render.md.
 *
 * SPEC root notes have substantially more structural variation than
 * REQ/TASK/DESIGN: Context, Scope, Phases, Success Criteria, Artifact Status,
 * Decomposition Methodology, ADR Cross-cutting Constraints, Risks,
 * Dependencies, Open Questions, Implementation Notes, etc. Rather than fix a
 * closed set of H2 sections, this schema standardizes the few mechanically
 * load-bearing ones (Context, Scope, Phases, Success Criteria, Artifact
 * Status) and folds the remainder into an opaque `sections` Record keyed by
 * H2 heading text — same pattern as DesignNote.
 *
 * Two OPTIONAL checkbox sections gate status DONE: `## Success Criteria` and
 * `## Artifact Status`. When EITHER is defined, status DONE requires every
 * item in that section to be checked or deferred-with-rationale. When BOTH
 * are absent, DONE is permitted unconditionally — the author opted out of
 * mechanical SPEC-completion tracking (same forgiving pattern as DesignNote
 * ACCEPTED).
 *
 * Out of scope this round: SpecRootNote renderer (write-back path). Body
 * variation is too high for a single canonical render. Schema + parser
 * suffice for claim validation and read-side workflows.
 */

export const SpecRootNoteStatusEnum = z.enum([
  "DRAFT",
  "PROPOSED",
  "ACCEPTED",
  "DONE",
  "DEPRECATED",
]);

const SpecRootFrontmatterSchema = z
  .object({
    title: z.string().regex(/^SPEC-\d{3,}:/),
    type: z.literal("spec"),
    permalink: z.string().regex(/^specs\/spec-\d{3,}-[a-z0-9-]+\/spec-\d{3,}-[a-z0-9-]+/),
    status: SpecRootNoteStatusEnum,
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

/**
 * Shared checkbox shape — mirrors TaskNote DodCheckboxItem +
 * RequirementNote EarsAcceptanceItem + DesignNote ComplianceCheckboxItem.
 * Kept as a local declaration (rather than importing one of the other note
 * types' types) to keep schema modules independent.
 */
const DodCheckboxItemSchema = z
  .object({
    text: z.string().min(1),
    done: z.boolean(),
    deferred_rationale: z.string().min(1).optional(),
  })
  .strict();

const SpecPhaseSchema = z
  .object({
    name: z.string().min(1),
    req_refs: z.array(z.string()),
  })
  .strict();

export const SpecRootNoteSchema = z
  .object({
    frontmatter: SpecRootFrontmatterSchema,
    context: z.string().min(1),
    scope_in: z.array(z.string()),
    scope_out: z.array(z.string()),
    phases: z.array(SpecPhaseSchema).optional(),
    success_criteria: z.array(DodCheckboxItemSchema).optional(),
    artifact_status: z.array(DodCheckboxItemSchema).optional(),
    sections: z.record(z.string(), z.string().min(1)),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Cross-field invariant 1: derived SPEC id (from frontmatter title)
    // must be valid per SpecIdSchema.
    const titleMatch = data.frontmatter.title.match(/^(SPEC-\d{3,}):/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = SpecIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields SPEC id ${derivedId} which fails SpecIdSchema`,
        });
      }
    }

    // Cross-field invariant 2: if `success_criteria` is defined it must be
    // non-empty (mirrors DesignNote compliance_criteria — omit the field
    // entirely if the section is absent in the markdown).
    if (data.success_criteria !== undefined && data.success_criteria.length === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "success_criteria section present but empty; omit field entirely if section absent",
      });
    }

    // Cross-field invariant 3: if `artifact_status` is defined it must be
    // non-empty.
    if (data.artifact_status !== undefined && data.artifact_status.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "artifact_status section present but empty; omit field entirely if section absent",
      });
    }

    // Cross-field invariant 4: status DONE requires every gate item satisfied
    // across BOTH success_criteria AND artifact_status when present. When
    // both are undefined, DONE is permitted unconditionally.
    if (data.frontmatter.status === "DONE") {
      const unsatisfied: Array<{ section: "success_criteria" | "artifact_status"; text: string }> =
        [];
      if (data.success_criteria !== undefined) {
        for (const item of data.success_criteria) {
          if (!item.done && !item.deferred_rationale) {
            unsatisfied.push({ section: "success_criteria", text: item.text });
          }
        }
      }
      if (data.artifact_status !== undefined) {
        for (const item of data.artifact_status) {
          if (!item.done && !item.deferred_rationale) {
            unsatisfied.push({ section: "artifact_status", text: item.text });
          }
        }
      }
      if (unsatisfied.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Status DONE requires every Success Criteria + Artifact Status item checked or deferred-with-rationale; ${unsatisfied.length} unsatisfied: ${unsatisfied
            .map((i) => `[${i.section}] ${i.text}`)
            .join(" | ")}`,
        });
      }
    }
  });

export type SpecRootNote = z.infer<typeof SpecRootNoteSchema>;
export type SpecRootFrontmatter = z.infer<typeof SpecRootFrontmatterSchema>;
export type SpecRootCheckboxItem = z.infer<typeof DodCheckboxItemSchema>;
export type SpecPhase = z.infer<typeof SpecPhaseSchema>;
export type SpecRootNoteStatus = z.infer<typeof SpecRootNoteStatusEnum>;
