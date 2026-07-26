/**
 * The work brief: everything the scripts could NOT repair, as an exact
 * where-and-what list an agent can burn down.
 *
 * This replaces the flat residual list rather than sitting alongside it. A dump of
 * findings makes an agent re-derive, per entry, which file to open, where in it to
 * look, why the entry is there, and what edit to make — which is the hand-work the
 * whole pipeline exists to remove, merely moved one stage later. One canonical
 * representation, enriched, grouped for execution.
 *
 * Three shaping decisions follow from "ordered for fast execution":
 *
 * **Grouped by REPAIR site, not evidence site.** For a bi-directional finding the
 * evidence sits on the note carrying the one-way edge while the missing inverse
 * belongs on its counterpart. Grouping by evidence would send an agent to open the
 * wrong file. Both locations are carried; the grouping key is where the edit goes.
 *
 * **Entries within a note run top-to-bottom by line**, so one pass down an open
 * file addresses everything in it.
 *
 * **Notes run heaviest-first**, so the file that closes the most work is opened
 * first and a partially-worked brief has made maximal progress.
 */

import { z } from "zod";
import { ReferenceClassSchema } from "./reference-manifest.js";
import { ResidualReasonSchema, reasonCountsShape } from "./repoint-residue.js";

/**
 * What is actually in the graph, quoted rather than described. For a text
 * reference this is the matched span; for a bi-directional finding it is the edge
 * that exists plus the inverse that does not.
 */
export const WorkBriefEvidenceSchema = z.object({
  /** The matched span, or the existing edge for a bi-directional finding. */
  matchedText: z.string().min(1),
  /** Path carrying the evidence. Differs from the repair site for graph findings. */
  evidenceFile: z.string().min(1),
  evidenceLine: z.number().int().positive(),
  /** Bi-directional only: the verb the counterpart note must carry. */
  expectedInverse: z.string().min(1).optional(),
  /** Bi-directional only: the note the missing edge belongs on. */
  counterpartFile: z.string().min(1).optional(),
});
export type WorkBriefEvidence = z.infer<typeof WorkBriefEvidenceSchema>;

export const WorkBriefEntrySchema = z.object({
  reason: ResidualReasonSchema,
  class: ReferenceClassSchema,
  /** Entity ID of the note that moved — what the reference is about. */
  target: z.string().min(1),
  /**
   * Human- and agent-readable locator, e.g. `line 23, col 28, cites "Section 4"`.
   * Redundant with the fields below by design: an agent reading the brief as prose
   * should not have to assemble it.
   */
  anchor: z.string().min(1),
  line: z.number().int().positive(),
  column: z.number().int().positive().optional(),
  sectionFragment: z.string().min(1).optional(),
  evidence: WorkBriefEvidenceSchema,
  /** What happened to the target that made this reference stale. */
  causingOperation: z.string().min(1),
  /** The edit to make, in the imperative. */
  suggestedAction: z.string().min(1),
  /** The machine-level reason detail, kept for traceability. */
  detail: z.string(),
});
export type WorkBriefEntry = z.infer<typeof WorkBriefEntrySchema>;

export const WorkBriefNoteSchema = z.object({
  /** Repair site, relative to the docs root. */
  path: z.string().min(1),
  /** Frontmatter permalink, or empty when the note could not be resolved. */
  permalink: z.string(),
  entries: z.array(WorkBriefEntrySchema).min(1),
});
export type WorkBriefNote = z.infer<typeof WorkBriefNoteSchema>;

export const WorkBriefSchema = z.object({
  notes: z.array(WorkBriefNoteSchema),
  summary: z.object({
    entries: z.number().int().nonnegative(),
    notes: z.number().int().nonnegative(),
    byReason: z.object(reasonCountsShape),
  }),
});
export type WorkBrief = z.infer<typeof WorkBriefSchema>;
