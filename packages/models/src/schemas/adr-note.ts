import { z } from "zod";
import { EntityIdSchema, ObservationSchema, RelationSchema } from "./common.js";

/**
 * AdrNote Zod schema (SPEC-008 Track 1, REQ-001, 2026-05-23).
 *
 * Mirrors the canonical ADR note structure per ~/KNOWLEDGE-GRAPH-STRUCTURES.md
 * Section 4.10 and example docs/decisions/ADR-001-composition-library-architecture.md.
 *
 * Closes the highest-consequence P0 coverage gap from ANALYSIS-004 Audit A:
 * the PROPOSED -> ACCEPTED transition is the architectural decision gate, and
 * before this schema there was no structural validation contract on it.
 *
 * Structural approach mirrors DesignNote: ADR body content varies legitimately
 * (Context, Decision, Decision Drivers, Considered Options, Consequences,
 * Vendor Lock-in Assessment, Confirmation, etc.). Rather than fix a closed set
 * of H2 sections, this schema standardizes the few mechanically load-bearing
 * ones (the typed `considered_options` and `clarifications` arrays that gate
 * status ACCEPTED) and folds the remaining prose H2 sections into an opaque
 * `sections` Record keyed by H2 heading text.
 *
 * Two superRefine gates apply at status ACCEPTED:
 *   1. Every Clarifications item checkbox must be checked (`done === true`).
 *   2. Every Considered Option must carry a non-empty rationale.
 * Both rules coexist in a single superRefine pass per the TASK contract.
 *
 * ADR frontmatter carries the ADR-specific `date` and `updated` fields per
 * ~/KNOWLEDGE-GRAPH-CONVENTIONS.md Section 3.1 (other note types do not).
 *
 * Out of scope this round: AdrNote parser (REQ-002) and claim validator
 * (REQ-003). Schema only.
 */

/**
 * Status enum for AdrNote frontmatter.
 *
 * Per the TASK DoD: PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED. ACCEPTED is
 * the gated terminal state for the two superRefine checks below. Distinct from
 * the general-note status enums in common.ts and from DesignNoteStatusEnum.
 */
export const AdrNoteStatusEnum = z.enum(["PROPOSED", "ACCEPTED", "DEPRECATED", "SUPERSEDED"]);

/**
 * ISO calendar date `YYYY-MM-DD`. ADR-specific frontmatter fields per
 * CONVENTIONS Section 3.1: `date` (set on first ACCEPTED) and `updated`.
 */
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const AdrFrontmatterSchema = z
  .object({
    title: z.string().regex(/^ADR-\d{3}.*/),
    type: z.literal("decision"),
    status: AdrNoteStatusEnum,
    date: IsoDateSchema,
    updated: IsoDateSchema,
    permalink: z.string().regex(/^decisions\/adr-\d{3}-/),
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

/**
 * A Considered Option entry. `rationale` is required and non-empty; the
 * ACCEPTED gate additionally rejects whitespace-only rationale via superRefine.
 */
const ConsideredOptionSchema = z
  .object({
    name: z.string().min(1),
    rationale: z.string().min(1),
  })
  .strict();

/**
 * A Clarifications checkbox item. Mirrors the DodCheckboxItem shape used by
 * TaskNote/DesignNote/SpecRootNote, kept local to keep schema modules
 * independent. The ACCEPTED gate rejects any item with `done === false`.
 */
const ClarificationItemSchema = z
  .object({
    text: z.string().min(1),
    done: z.boolean(),
  })
  .strict();

export const AdrNoteSchema = z
  .object({
    frontmatter: AdrFrontmatterSchema,
    sections: z
      .record(z.string(), z.string().min(1))
      .refine((rec) => Object.keys(rec).length >= 1, {
        message: "At least one H2 section (typically Context) is required",
      }),
    considered_options: z.array(ConsideredOptionSchema),
    clarifications: z.array(ClarificationItemSchema).optional(),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Cross-field invariant 1: derived ADR id (from frontmatter title) must be
    // a valid entity ID per EntityIdSchema. Defensive check beyond the title
    // regex which only asserts the ADR-NNN prefix shape.
    const titleMatch = data.frontmatter.title.match(/^(ADR-\d{3})/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = EntityIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields ADR id ${derivedId} which fails EntityIdSchema`,
          path: ["frontmatter", "title"],
        });
      }
    }

    // Cross-field invariant 2: status ACCEPTED requires every Clarifications
    // item to be checked. When the section is absent (clarifications
    // undefined), this check is skipped — an ADR with no Clarifications
    // section passes if its other checks pass (per DESIGN edge-case table).
    if (data.frontmatter.status === "ACCEPTED" && data.clarifications !== undefined) {
      const unchecked = data.clarifications.filter((item) => !item.done);
      if (unchecked.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Status ACCEPTED requires every Clarifications item checked; ${unchecked.length} unchecked: ${unchecked.map((i) => i.text).join(" | ")}`,
          path: ["clarifications"],
        });
      }
    }

    // Cross-field invariant 3: status ACCEPTED requires every Considered
    // Option to carry a non-empty rationale. The per-option schema enforces
    // min(1); this gate additionally rejects whitespace-only rationale so an
    // ACCEPTED ADR cannot lock a decision with an empty justification.
    if (data.frontmatter.status === "ACCEPTED") {
      const missingRationale = data.considered_options.filter(
        (opt) => opt.rationale.trim().length === 0,
      );
      if (missingRationale.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Status ACCEPTED requires every Considered Option to have a non-empty rationale; ${missingRationale.length} without rationale: ${missingRationale.map((o) => o.name).join(" | ")}`,
          path: ["considered_options"],
        });
      }
    }
  });

export type AdrNote = z.infer<typeof AdrNoteSchema>;
export type AdrFrontmatter = z.infer<typeof AdrFrontmatterSchema>;
export type ConsideredOption = z.infer<typeof ConsideredOptionSchema>;
export type ClarificationItem = z.infer<typeof ClarificationItemSchema>;
export type AdrNoteStatus = z.infer<typeof AdrNoteStatusEnum>;
