/**
 * Zod schemas for the repoint plan and its execution report.
 *
 * The impact manifest enumerates which notes point at something that moved. This
 * plan is the other half of the repair: the caller-declared statement of what
 * each moved thing became. Neither half is derivable from the other — the
 * scanner cannot know a note used to be numbered 034, and the map cannot know
 * who cites it — so the executor is the join of a discovered manifest and a
 * declared plan.
 *
 * The plan is an untrusted-input boundary in exactly the sense the distribution
 * and composition plan YAMLs are: LLM-authored, adjudicated by a human, then fed
 * to a script that writes to the graph. It is loaded FAILSAFE (CWE-502) and
 * parsed here before any file is opened.
 */

import { z } from "zod";
import {
  permalinkMapSchema,
  renumberMapSchema,
  sectionMapSchema,
  wikilinkMapSchema,
} from "./base.js";
import {
  ClassCountsSchema,
  ReferenceClassSchema,
  ReferenceFindingSchema,
} from "./reference-manifest.js";
import { WorkBriefSchema } from "./work-brief.js";

// The residue vocabulary lives in a leaf so the work brief and this module can
// both depend on it without importing each other. Re-exported here because a
// consumer reading a repoint report should not have to know about the split.
export {
  RESIDUAL_REASONS,
  type RepointResidual,
  RepointResidualSchema,
  type ResidualReason,
  ResidualReasonSchema,
} from "./repoint-residue.js";

/**
 * The four maps are declared in `schemas/base.ts` alongside the distribution and
 * composition plans' maps, so the F-8 invariants and their one deliberate
 * exemption (`section_map`) live at one definition site rather than being
 * re-stated per plan type. Rationale for each is documented there.
 *
 * `permalink_map` is keyed on the BARE permalink, never on whole matched text: the
 * project-prefixed class may carry `fond/analysis/analysis-034-x` where the plan
 * only knows `analysis/analysis-034-x`, and which prefix appears depends on whose
 * search results the citation was pasted from. The executor looks up the bare form
 * and reattaches whatever prefix the document actually used.
 */
export const RepointPlanSchema = z
  .object({
    plan_type: z.literal("repoint"),
    /** Entity IDs, old to new. Drives `entity-id` and `entity-id-section`. */
    renumber_map: renumberMapSchema.default({}),
    /** Full colon titles as written in the document, old to new. */
    wikilink_map: wikilinkMapSchema.default({}),
    permalink_map: permalinkMapSchema.default({}),
    section_map: sectionMapSchema.default({}),
  })
  .strict()
  .superRefine((plan, ctx) => {
    // A line break in a replacement is the structural-injection vector, the same
    // one the cluster-scaffold strings guard against: a title carrying `\n---`
    // closes a frontmatter block early, and any replacement carrying a newline
    // splits one line into two and desynchronises every address below it in the
    // same file. Rejected at the plan boundary because no later stage looks.
    const maps: ReadonlyArray<[string, Readonly<Record<string, string>>]> = [
      ["renumber_map", plan.renumber_map],
      ["wikilink_map", plan.wikilink_map],
      ["permalink_map", plan.permalink_map],
      ...Object.entries(plan.section_map).map(
        ([id, inner]) => [`section_map.${id}`, inner] as [string, Record<string, string>],
      ),
    ];
    for (const [field, map] of maps) {
      for (const [key, value] of Object.entries(map)) {
        if (/[\r\n]/.test(key) || /[\r\n]/.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "map keys and values must not contain line breaks (structural injection guard)",
            path: [field, key],
          });
        }
      }
    }

    const declared =
      Object.keys(plan.renumber_map).length +
      Object.keys(plan.wikilink_map).length +
      Object.keys(plan.permalink_map).length;
    // A plan with no identifier mapping repairs nothing: every finding would be
    // downgraded to `no-mapping` and the run would report a full residual
    // worklist as though the executor had considered each site. That is the shape
    // an empty or mis-keyed YAML produces, so it is refused rather than executed.
    if (declared === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "plan declares no renumber_map, wikilink_map or permalink_map entry; a repoint with no mapping would downgrade every finding to residual",
        path: ["renumber_map"],
      });
    }
  });
export type RepointPlan = z.infer<typeof RepointPlanSchema>;

export const RepointEditSchema = z.object({
  /** 1-indexed, as recorded in the manifest. */
  line: z.number().int().positive(),
  /** 1-indexed offset within the line. */
  column: z.number().int().positive(),
  class: ReferenceClassSchema,
  target: z.string().min(1),
  oldText: z.string().min(1),
  newText: z.string().min(1),
});
export type RepointEdit = z.infer<typeof RepointEditSchema>;

/** One changed line, before and after — the reviewable unit of a dry run. */
export const RepointLineDiffSchema = z.object({
  line: z.number().int().positive(),
  before: z.string(),
  after: z.string(),
});
export type RepointLineDiff = z.infer<typeof RepointLineDiffSchema>;

export const RepointFileEntrySchema = z.object({
  /** Path relative to the docs root. */
  path: z.string().min(1),
  edits: z.array(RepointEditSchema),
  diff: z.array(RepointLineDiffSchema),
  sha256Before: z.string().length(64),
  sha256After: z.string().length(64),
});
export type RepointFileEntry = z.infer<typeof RepointFileEntrySchema>;

/**
 * A finding whose repointed form is ALREADY at its address — the idempotence
 * signal. Reported rather than counted as applied, so a second run over a
 * repaired tree is visibly a no-op instead of looking like fresh work.
 */
export const RepointSkippedSchema = z.object({
  finding: ReferenceFindingSchema,
  newText: z.string().min(1),
});
export type RepointSkipped = z.infer<typeof RepointSkippedSchema>;

export const TargetOutcomeSchema = z.object({
  applied: z.number().int().nonnegative(),
  alreadyRepointed: z.number().int().nonnegative(),
  residual: z.number().int().nonnegative(),
});

export const RepointReportSchema = z.object({
  docsRoot: z.string().min(1),
  executedAt: z.string().min(1),
  /** True when nothing was written; the report is a preview. */
  dryRun: z.boolean(),
  files: z.array(RepointFileEntrySchema),
  alreadyRepointed: z.array(RepointSkippedSchema),
  /**
   * Everything the executor could not repair, as an executable brief grouped by
   * repair site rather than a flat list of findings.
   *
   * Deliberately the ONLY representation of the residue. A flat dump alongside it
   * would be the same state in two places, and the dump is the form that makes an
   * agent re-derive which file to open and what edit to make — the hand-work this
   * pipeline exists to remove, merely moved one stage later.
   */
  workBrief: WorkBriefSchema,
  summary: z.object({
    totalFindings: z.number().int().nonnegative(),
    applied: z.number().int().nonnegative(),
    alreadyRepointed: z.number().int().nonnegative(),
    residual: z.number().int().nonnegative(),
    filesChanged: z.number().int().nonnegative(),
    /**
     * Applied edits per reference class. Exact over all nine classes rather than
     * a partial record, so a class reading zero is visibly zero — the five
     * classes this executor never repairs should always read zero, and a
     * non-zero one is a bug the report shows rather than hides.
     */
    byClass: ClassCountsSchema,
    /** Keyed by target entity ID, as the manifest summary is. */
    byTarget: z.record(z.string(), TargetOutcomeSchema),
  }),
});
export type RepointReport = z.infer<typeof RepointReportSchema>;
