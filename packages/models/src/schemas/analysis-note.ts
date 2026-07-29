import { z } from "zod";
import { EntityIdSchema, ObservationSchema, RelationSchema, StatusAtom } from "./common.js";

/**
 * AnalysisNote Zod schema (SPEC-008 Track 1, REQ-001, TASK-002, 2026-05-24).
 *
 * Mirrors the canonical ANALYSIS note structure per ~/KNOWLEDGE-GRAPH-CONVENTIONS.md
 * Section 4 universal invariants and the standard 16-type frontmatter (Section 3).
 *
 * Closes the P1 coverage gap from ANALYSIS-004: the Wave 7 exploit pattern was
 * 41 analyses landing as ACCEPTED with a trailing `## Open Questions` section
 * — deferring resolution to the decisions/spec/impl phase in violation of the
 * no-open-questions-in-planning-artifacts inline principle. Before this
 * schema there was no structural validation contract on that pattern.
 *
 * Structural approach mirrors AdrNote: analysis body content varies legitimately
 * (Findings, Options, Pros/Cons, Background, etc.). Rather than fix a closed
 * set of H2 sections, this schema standardizes the few mechanically load-bearing
 * ones (the conditional ACCEPTED + `## Open Questions` rejection) and folds the
 * remaining prose H2 sections into an opaque `sections` Record keyed by H2
 * heading text. Section presence is detected by parsed-body-sections lookup
 * (Object.hasOwn on the Record), not loose text matching, so prose that merely
 * mentions "open questions" does not trigger the rule.
 *
 * Unlike AdrNote, ANALYSIS frontmatter uses the standard 16-type fields only —
 * no ADR-specific `date` / `updated` fields per CONVENTIONS Section 3.1.
 *
 * Out of scope this round: AnalysisNote parser and claim validator. Schema only.
 */

/**
 * Status enum for AnalysisNote frontmatter.
 *
 * Per CONVENTIONS Section 8.1 item 6, general-note status values are
 * `DRAFT | ACCEPTED | PROPOSED | IN_PROGRESS | IN_REVIEW | DONE | DEPRECATED`.
 * ANALYSIS uses this general enum. ACCEPTED is the gated state for the
 * Open-Questions-rejection superRefine check below.
 */
export const AnalysisNoteStatusEnum = z.enum(
  StatusAtom.extract([
    "DRAFT",
    "PROPOSED",
    "IN_PROGRESS",
    "IN_REVIEW",
    "ACCEPTED",
    "DONE",
    "DEPRECATED",
  ]).options,
);

const AnalysisFrontmatterSchema = z
  .object({
    title: z.string().regex(/^ANALYSIS-\d{3}.*/),
    type: z.literal("analysis"),
    status: AnalysisNoteStatusEnum,
    permalink: z.string().regex(/^analysis\//),
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

/**
 * Canonical heading text for the forbidden Open Questions section. The body
 * sections Record is keyed by H2 heading text; presence is detected by an
 * exact-match Object.hasOwn lookup, not by substring or regex over prose.
 */
const OPEN_QUESTIONS_SECTION = "Open Questions";

export const AnalysisNoteSchema = z
  .object({
    frontmatter: AnalysisFrontmatterSchema,
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
    // Cross-field invariant 1: derived ANALYSIS id (from frontmatter title)
    // must be a valid entity ID per EntityIdSchema. Defensive check beyond
    // the title regex which only asserts the ANALYSIS-NNN prefix shape.
    const titleMatch = data.frontmatter.title.match(/^(ANALYSIS-\d{3})/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = EntityIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields ANALYSIS id ${derivedId} which fails EntityIdSchema`,
          path: ["frontmatter", "title"],
        });
      }
    }

    // Cross-field invariant 2: status ACCEPTED rejects presence of a
    // `## Open Questions` H2 section. Detection is by exact key lookup on the
    // parsed sections Record, NOT by substring match on prose — so an analysis
    // discussing "open questions" inline within another section passes.
    //
    // Rule fires ONLY at ACCEPTED. DRAFT/PROPOSED/IN_PROGRESS/IN_REVIEW with
    // Open Questions present are accepted: this is by design — analyses
    // surface open questions during research; the no-open-questions rule
    // applies only to locked planning artifacts (CONVENTIONS / Brain v2 W7
    // incident). Decision and spec phases re-enter on gap discovery per the
    // iterative-phase-reentry rule.
    if (
      data.frontmatter.status === "ACCEPTED" &&
      Object.hasOwn(data.sections, OPEN_QUESTIONS_SECTION)
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Status ACCEPTED forbids a "## ${OPEN_QUESTIONS_SECTION}" section in the body (no-open-questions-in-planning-artifacts rule); resolve questions in the analysis phase before locking`,
        path: ["sections", OPEN_QUESTIONS_SECTION],
      });
    }
  });

export type AnalysisNote = z.infer<typeof AnalysisNoteSchema>;
export type AnalysisFrontmatter = z.infer<typeof AnalysisFrontmatterSchema>;
export type AnalysisNoteStatus = z.infer<typeof AnalysisNoteStatusEnum>;
