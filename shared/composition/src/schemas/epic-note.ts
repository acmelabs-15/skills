import { z } from "zod";
import { EntityIdSchema, ObservationSchema, RelationSchema } from "./common.js";

/**
 * EpicNote Zod schema (SPEC-008 Track 1, REQ-001, TASK-003, 2026-05-24).
 *
 * Mirrors the canonical EPIC note structure per ~/NOTE-TEMPLATES.md and the
 * universal invariants in ~/KNOWLEDGE-GRAPH-CONVENTIONS.md Section 4.
 *
 * Closes the P1 coverage gap from ANALYSIS-004 Audit A: EPIC notes had zero
 * structural validation coverage. Before this schema, an EPIC could be authored
 * with `contains [[SPEC-NNN: ...]]` Relations entries while omitting any
 * Contained Specs body section, leaving the relations as implicit-only — a
 * pattern that defeats the purpose of EPIC as a navigable roadmap entity.
 *
 * Structural approach mirrors AdrNote / AnalysisNote: EPIC body content varies
 * legitimately (Epic Statement, Vision, Business Outcomes, Scope, Delivery
 * Plan, Critical Path, Risks, Success Metrics, Dependencies, etc.). Rather
 * than fix a closed set of H2 sections, this schema standardizes the one
 * mechanically load-bearing structural invariant (Contained Specs section
 * presence when `contains` relations exist) and folds the remaining prose H2
 * sections into an opaque `sections` Record keyed by H2 heading text.
 *
 * EPIC frontmatter uses the standard 16-type fields only — no ADR-specific
 * `date` / `updated` fields per CONVENTIONS Section 3.1.
 *
 * Out of scope this round: EpicNote parser (REQ-002) and `validateEpicDoneClaim`
 * cross-note validator (REQ-003, TASK-009). The schema deliberately performs
 * NO cross-note resolution — the SpecResolver-based done-claim check that
 * verifies every `contains` SPEC reaches a terminal status belongs in the
 * claim validator layer per DESIGN-001-SPEC-008 Edge Cases.
 */

/**
 * Status enum for EpicNote frontmatter.
 *
 * Per CONVENTIONS Section 8.1 item 6, general-note status values are
 * `DRAFT | ACCEPTED | PROPOSED | IN_PROGRESS | IN_REVIEW | DONE | DEPRECATED`.
 * EPIC uses this general enum. DONE is the gated terminal state for the
 * cross-note resolver-driven done-claim check in TASK-009 (NOT enforced at
 * the schema layer).
 */
export const EpicNoteStatusEnum = z.enum([
  "DRAFT",
  "PROPOSED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "ACCEPTED",
  "DONE",
  "DEPRECATED",
]);

const EpicFrontmatterSchema = z
  .object({
    title: z.string().regex(/^EPIC-\d{3}.*/),
    type: z.literal("epic"),
    status: EpicNoteStatusEnum,
    permalink: z.string().regex(/^roadmap\//),
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

/**
 * Canonical heading text for the Contained Specs body section. The body
 * sections Record is keyed by H2 heading text; presence is detected by an
 * exact-match Object.hasOwn lookup, not by substring or regex over prose.
 */
const CONTAINED_SPECS_SECTION = "Contained Specs";

/**
 * The single relation verb that triggers the Contained Specs structural
 * requirement. EPIC notes use `contains` to reference each SPEC in scope.
 */
const CONTAINS_VERB = "contains";

export const EpicNoteSchema = z
  .object({
    frontmatter: EpicFrontmatterSchema,
    sections: z
      .record(z.string(), z.string().min(1))
      .refine((rec) => Object.keys(rec).length >= 1, {
        message: "At least one H2 section is required",
      }),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Cross-field invariant 1: derived EPIC id (from frontmatter title) must
    // be a valid entity ID per EntityIdSchema. Defensive check beyond the
    // title regex which only asserts the EPIC-NNN prefix shape.
    const titleMatch = data.frontmatter.title.match(/^(EPIC-\d{3})/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = EntityIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields EPIC id ${derivedId} which fails EntityIdSchema`,
          path: ["frontmatter", "title"],
        });
      }
    }

    // Cross-field invariant 2: when any `contains` Relations entry exists, a
    // `## Contained Specs` H2 section MUST be present in the body. Detection
    // is by exact key lookup on the parsed sections Record, NOT by substring
    // match on prose — so an EPIC discussing "contained specs" inline within
    // another section does not satisfy the requirement.
    //
    // Rationale: the `contains` relations form the authoritative scope list;
    // the Contained Specs body section is the human-readable rendering of
    // that scope (priority, wrapper treatment, RICE/KANO scoring per the
    // EPIC template). Implicit-only relations defeat the EPIC role as a
    // navigable roadmap entity.
    //
    // Cross-note SPEC resolution (status terminal-state check on every
    // contained SPEC) is explicitly NOT performed here — it belongs in
    // `validateEpicDoneClaim` (TASK-009) which receives a caller-supplied
    // SpecResolver callback per DESIGN-001-SPEC-008.
    const containsRelations = data.relations.filter((rel) => rel.verb === CONTAINS_VERB);
    if (containsRelations.length > 0 && !Object.hasOwn(data.sections, CONTAINED_SPECS_SECTION)) {
      ctx.addIssue({
        code: "custom",
        message: `EPIC with ${containsRelations.length} \`contains\` relation(s) requires a "## ${CONTAINED_SPECS_SECTION}" H2 section in the body; targets: ${containsRelations.map((r) => r.target).join(" | ")}`,
        path: ["sections", CONTAINED_SPECS_SECTION],
      });
    }
  });

export type EpicNote = z.infer<typeof EpicNoteSchema>;
export type EpicFrontmatter = z.infer<typeof EpicFrontmatterSchema>;
export type EpicNoteStatus = z.infer<typeof EpicNoteStatusEnum>;
