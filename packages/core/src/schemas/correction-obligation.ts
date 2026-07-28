/**
 * Zod schemas for correction obligations and the reconciliation report.
 *
 * The failure this describes: a note states precisely what must change in
 * another note — "the claim that X should be corrected", "this sentence
 * previously read Y" — and the change never lands at the target assertion. The
 * correction is real, recorded, dated, and cited by later work, while the stale
 * sentence sits untouched where a reader will meet it first.
 *
 * An obligation is the machine-checkable residue of such a statement: a target,
 * the exact text the source says the target currently carries, and the change
 * mandated. Given those three, "did it land" stops being a judgement call and
 * becomes a substring test.
 *
 * Schemas rather than bare interfaces because config-supplied obligations and
 * prior reports are read back from disk. That is an untrusted-input boundary in
 * the same sense the plan loader's is: a hand-edited tuple with a typo'd field
 * must fail loudly rather than quietly verify nothing and report LANDED.
 */

import { z } from "zod";

/**
 * How an obligation was obtained. Recorded per obligation because the two modes
 * carry different trust: a pattern extraction can be re-derived from the source
 * text, while a config tuple is an assertion by whoever wrote the config and is
 * only as good as their reading.
 */
export const OBLIGATION_ORIGINS = ["correction-list", "dated-marker", "config"] as const;
export const ObligationOriginSchema = z.enum(OBLIGATION_ORIGINS);
export type ObligationOrigin = z.infer<typeof ObligationOriginSchema>;

export const CorrectionObligationSchema = z.object({
  /** Docs-root-relative path of the note stating the obligation. */
  sourceNote: z.string().min(1),
  /** Where in the source it is stated, e.g. "3.7 Corrections ... — item 1". */
  sourceAnchor: z.string().min(1),
  /** The target as the source writes it, e.g. "ANALYSIS-026 Section 5.4". */
  targetNote: z.string().min(1),
  /** Entity ID parsed out of `targetNote`; the form target resolution uses. */
  targetEntityId: z.string().min(1),
  /** Section named alongside the target, when one is named. */
  targetSection: z.string().optional(),
  /**
   * The text the source says the target currently carries. Sources quote it
   * reliably — "it read that", "previously read", "still reads" — which is what
   * makes the check mechanical rather than semantic.
   */
  quotedStaleText: z.string().min(1),
  /**
   * Further quoted spans in the same obligation. All are checked; the primary
   * is only the one reported first. A correction that retires two phrases has
   * not landed until both are gone.
   */
  alternateQuotes: z.array(z.string()),
  /** Free text: the change the source mandates, verbatim. */
  mandatedChange: z.string().min(1),
  origin: ObligationOriginSchema,
});
export type CorrectionObligation = z.infer<typeof CorrectionObligationSchema>;

/**
 * A correction statement that could not be reduced to a checkable tuple. Kept
 * as first-class output rather than dropped: an obligation the extractor cannot
 * see is exactly the one most likely to go unlanded, and a silent drop turns a
 * conservative extractor into a false all-clear.
 */
export const UNEXTRACTABLE_REASONS = [
  "no-resolvable-target",
  "ambiguous-target",
  "no-quoted-stale-text",
] as const;
export const UnextractableReasonSchema = z.enum(UNEXTRACTABLE_REASONS);
export type UnextractableReason = z.infer<typeof UnextractableReasonSchema>;

export const UnextractableItemSchema = z.object({
  sourceNote: z.string().min(1),
  sourceAnchor: z.string().min(1),
  reason: UnextractableReasonSchema,
  /** The statement verbatim, so a config tuple can be written against it. */
  rawText: z.string(),
});
export type UnextractableItem = z.infer<typeof UnextractableItemSchema>;

/**
 * Verdicts, and the reason there are two flavours of "gone".
 *
 * - `OUTSTANDING` — the quoted stale text is still present as a live assertion.
 * - `LANDED` — gone, and a dated correction marker records the change. Both the
 *   text and the discipline are satisfied.
 * - `LANDED-UNMARKED` — gone, with nothing recording that it changed. The
 *   assertion is correct now and the provenance is lost, so a later reader
 *   meeting the new text has no way to know the old one was refuted. Flagged
 *   rather than passed, because unmarked corrections are how a superseded claim
 *   gets reintroduced by a well-meaning editor.
 * - `TARGET-NOT-FOUND` — no note in the tree carries that identity. Never
 *   silently treated as landed.
 */
export const RECONCILE_VERDICTS = [
  "OUTSTANDING",
  "LANDED",
  "LANDED-UNMARKED",
  "TARGET-NOT-FOUND",
] as const;
export const ReconcileVerdictSchema = z.enum(RECONCILE_VERDICTS);
export type ReconcileVerdict = z.infer<typeof ReconcileVerdictSchema>;

export const QuoteOccurrenceSchema = z.object({
  /** Which of the obligation's quotes produced this hit. */
  quote: z.string().min(1),
  /** 1-indexed line in the target note. */
  line: z.number().int().positive(),
  /** The line verbatim, trimmed, so a finding is actionable without opening the file. */
  snippet: z.string(),
  /**
   * True when the hit sits inside a dated correction marker — the marker quotes
   * the text it retires, so its own copy is evidence the correction landed
   * rather than evidence it did not.
   */
  insideMarker: z.boolean(),
});
export type QuoteOccurrence = z.infer<typeof QuoteOccurrenceSchema>;

export const MarkerEvidenceSchema = z.object({
  line: z.number().int().positive(),
  text: z.string(),
  /** Whether the marker was found in the named section or anywhere in the note. */
  scope: z.enum(["section", "note"]),
});
export type MarkerEvidence = z.infer<typeof MarkerEvidenceSchema>;

export const ObligationFindingSchema = z.object({
  obligation: CorrectionObligationSchema,
  verdict: ReconcileVerdictSchema,
  /** Docs-root-relative path the target resolved to, when it resolved. */
  targetPath: z.string().optional(),
  liveOccurrences: z.array(QuoteOccurrenceSchema),
  retiredOccurrences: z.array(QuoteOccurrenceSchema),
  markerEvidence: MarkerEvidenceSchema.optional(),
  detail: z.string(),
});
export type ObligationFinding = z.infer<typeof ObligationFindingSchema>;

export const ReconcileReportSchema = z.object({
  docsRoot: z.string().min(1),
  generatedAt: z.string().min(1),
  /** Docs-root-relative paths of the notes obligations were extracted from. */
  sources: z.array(z.string()),
  findings: z.array(ObligationFindingSchema),
  unextractable: z.array(UnextractableItemSchema),
  summary: z.object({
    total: z.number().int().nonnegative(),
    outstanding: z.number().int().nonnegative(),
    landed: z.number().int().nonnegative(),
    landedUnmarked: z.number().int().nonnegative(),
    targetNotFound: z.number().int().nonnegative(),
    unextractable: z.number().int().nonnegative(),
    /** True when nothing is OUTSTANDING and no target went unresolved. */
    closed: z.boolean(),
  }),
});
export type ReconcileReport = z.infer<typeof ReconcileReportSchema>;

/**
 * CLI input for `--obligations <file.json>`: tuples for sources the patterns
 * miss. `alternateQuotes` and `origin` are supplied by the loader, so a config
 * author writes only the five fields that describe the obligation.
 */
export const ObligationInputSchema = z.object({
  sourceNote: z.string().min(1),
  sourceAnchor: z.string().min(1),
  targetNote: z.string().min(1),
  targetSection: z.string().optional(),
  quotedStaleText: z.string().min(1),
  alternateQuotes: z.array(z.string()).optional(),
  mandatedChange: z.string().min(1),
});
export type ObligationInput = z.infer<typeof ObligationInputSchema>;

export const ObligationsFileSchema = z.array(ObligationInputSchema).min(1);
