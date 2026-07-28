import { z } from "zod";
import { ObservationSchema, RelationSchema, ReqIdSchema } from "./common.js";

/**
 * RequirementNote Zod schema (Phase X.D.6, 2026-05-20).
 *
 * Mirrors the canonical REQ note structure per ~/KNOWLEDGE-GRAPH-STRUCTURES.md
 * Section 4.9 and example
 * docs/specs/SPEC-007-plan-session-render/requirements/REQ-001-SPEC-007-schema-common-module.md.
 *
 * Purpose: mechanical enforcement of the per-TASK build+qa cycle at
 * the REQ layer. The `## Acceptance Criteria` checkbox list IS the QA
 * contract — QA validates implementation against these EARS-formatted
 * Given/When/Then bullets. Status ACCEPTED requires every AC item to be
 * checked OR deferred-with-rationale (mirrors TaskNote's DONE invariant).
 *
 * The EARS body of each AC bullet is stored verbatim as `text`. This schema
 * does NOT parse the WHEN/SHALL/SO THAT clauses into typed sub-fields — the
 * structure is conventionally enforced but not machine-readable here. The
 * top-level `requirement_statement` is similarly opaque prose.
 *
 * Out of scope this round: RequirementNote renderer (write-back path).
 */

export const RequirementNoteStatusEnum = z.enum(["DRAFT", "PROPOSED", "ACCEPTED", "DEPRECATED"]);

const RequirementFrontmatterSchema = z
  .object({
    title: z.string().regex(/^REQ-\d{3,}-SPEC-\d{3,}:/),
    type: z.literal("requirement"),
    permalink: z
      .string()
      .regex(/^specs\/spec-\d{3,}-[a-z0-9-]+\/requirements\/req-\d{3,}-spec-\d{3,}/),
    status: RequirementNoteStatusEnum,
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

const EarsAcceptanceItemSchema = z
  .object({
    text: z.string().min(1),
    done: z.boolean(),
    deferred_rationale: z.string().min(1).optional(),
  })
  .strict();

/**
 * Category enum is permissive: canonical values are the four below, but
 * authors may use additional values (e.g. "Functional / Quality / Constraint"
 * combinations) so the field is exposed as the enum OR free-form string.
 */
const RequirementCategoryEnum = z.enum(["Functional", "NonFunctional", "Constraint", "Interface"]);
const RequirementCategorySchema = RequirementCategoryEnum.or(z.string().min(1).max(200));

export const RequirementNoteSchema = z
  .object({
    frontmatter: RequirementFrontmatterSchema,
    requirement_statement: z.string().min(1),
    pattern: z.string().min(1).optional(),
    priority: z.string().min(1).max(200).optional(),
    category: RequirementCategorySchema.optional(),
    context: z.string().min(1).optional(),
    acceptance_criteria: z.array(EarsAcceptanceItemSchema).min(1),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Cross-field invariant 1: derived REQ id (from frontmatter title) must
    // be valid per ReqIdSchema. Defensive beyond the title regex which only
    // asserts the prefix shape.
    const titleMatch = data.frontmatter.title.match(/^(REQ-\d{3,}-SPEC-\d{3,}):/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = ReqIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields REQ id ${derivedId} which fails ReqIdSchema`,
        });
      }
    }

    // Cross-field invariant 2: status ACCEPTED requires every Acceptance
    // Criteria item satisfied (done === true OR deferred_rationale present).
    // Load-bearing protocol enforcement: a claim of ACCEPTED with an open AC is
    // rejected mechanically rather than trusted.
    if (data.frontmatter.status === "ACCEPTED") {
      const unsatisfied = data.acceptance_criteria.filter(
        (item) => !item.done && !item.deferred_rationale,
      );
      if (unsatisfied.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Status ACCEPTED requires every Acceptance Criteria item checked or deferred-with-rationale; ${unsatisfied.length} unsatisfied: ${unsatisfied.map((i) => i.text).join(" | ")}`,
        });
      }
    }
  });

export type RequirementNote = z.infer<typeof RequirementNoteSchema>;
export type RequirementFrontmatter = z.infer<typeof RequirementFrontmatterSchema>;
export type EarsAcceptanceItem = z.infer<typeof EarsAcceptanceItemSchema>;
export type RequirementNoteStatus = z.infer<typeof RequirementNoteStatusEnum>;
export type RequirementCategory = z.infer<typeof RequirementCategorySchema>;
