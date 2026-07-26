/**
 * Barrel re-exports for the note-schema layer (src/schemas/).
 *
 * Downstream consumers (parsers, claim validators, per-skill scripts, hook
 * handlers) import from this barrel rather than individual files to keep
 * import paths stable across future refactors, per
 * DESIGN-001-SPEC-008 (Coverage Module Layout).
 *
 * Named re-exports rather than `export *`: the repo has no star exports, and an
 * explicit list keeps the public surface reviewable in one place. Every symbol
 * below was checked for collisions across all sixteen schema modules — there are
 * none.
 */
export { AdrNoteSchema, type AdrNote } from "./adr-note.js";
export { AnalysisNoteSchema, type AnalysisNote } from "./analysis-note.js";
export { CritNoteSchema, type CritNote } from "./crit-note.js";
export { EpicNoteSchema, type EpicNote } from "./epic-note.js";

/** Inbound-reference impact manifest + bi-directional closure report. */
export {
  type ClassCounts,
  ClassCountsSchema,
  CLOSURE_STATUSES,
  type ClosureEntry,
  ClosureEntrySchema,
  type ClosureReport,
  ClosureReportSchema,
  type ClosureStatus,
  ClosureStatusSchema,
  type ImpactManifest,
  ImpactManifestSchema,
  MergeFileSchema,
  REFERENCE_CLASSES,
  REFERENCE_SOURCES,
  type ReferenceClass,
  ReferenceClassSchema,
  type ReferenceFinding,
  ReferenceFindingSchema,
  type ReferenceSource,
  ReferenceSourceSchema,
  RelationEvidenceSchema,
  type ResolvedTarget,
  ResolvedTargetSchema,
  RetainFileSchema,
  type RetainRule,
  RetainRuleSchema,
  SEARCH_MODES,
  type SearchMode,
  SearchModeSchema,
  SUPPRESSION_PRECEDENCE,
  TargetsFileSchema,
  type TargetSpecInput,
  TargetSpecSchema,
  TargetSummarySchema,
} from "./reference-manifest.js";

/** Correction obligations + reconcile-by-diff report. */
export {
  type CorrectionObligation,
  CorrectionObligationSchema,
  type MarkerEvidence,
  MarkerEvidenceSchema,
  OBLIGATION_ORIGINS,
  type ObligationFinding,
  ObligationFindingSchema,
  type ObligationInput,
  ObligationInputSchema,
  type ObligationOrigin,
  ObligationOriginSchema,
  ObligationsFileSchema,
  type QuoteOccurrence,
  QuoteOccurrenceSchema,
  RECONCILE_VERDICTS,
  type ReconcileReport,
  ReconcileReportSchema,
  type ReconcileVerdict,
  ReconcileVerdictSchema,
  UNEXTRACTABLE_REASONS,
  type UnextractableItem,
  UnextractableItemSchema,
  type UnextractableReason,
  UnextractableReasonSchema,
} from "./correction-obligation.js";

/** Figure-staleness checks + re-derivation report. */
export {
  ChecksFileSchema,
  type Derivation,
  DerivationSchema,
  FIGURE_CHECK_KINDS,
  FIGURE_VERDICTS,
  type FigureCheck,
  type FigureCheckKind,
  FigureCheckKindSchema,
  FigureCheckSchema,
  type FigureFinding,
  FigureFindingSchema,
  type FigureLocation,
  FigureLocationSchema,
  type FigureReport,
  FigureReportSchema,
  type FigureVerdict,
  FigureVerdictSchema,
  type SectionMatcherInput,
  SectionMatcherSchema,
} from "./figure-check.js";
