/**
 * Barrel re-exports for the docs-tree verification layer of `src/core/`.
 *
 * Downstream consumers (CLI entry points, per-skill scripts, hook handlers)
 * import from this barrel rather than individual files so import paths stay
 * stable across future refactors — the same rationale as the `src/schemas/`,
 * `src/parsers/` and `src/validators/` barrels.
 *
 * Scope is deliberately the three verification tool families and the primitives
 * they share, not all of `src/core/`. The composition mechanics that predate
 * them — adapters, atomic writes, partitioning, hashing, cluster scaffolding —
 * keep their direct import paths. That is a scoping decision rather than an
 * oversight: those modules have settled call sites and nothing is asking to
 * reach them through a barrel, so widening this one would add surface without
 * removing friction. Extending it later is mechanical; every symbol below was
 * checked for collisions and there are none.
 *
 * Three discovery families and one repair stage, over one shared foundation:
 *
 *   identity      what a note is called, how a reference normalizes, how the
 *                 tree is read. The leaf every family depends on.
 *   reference     inbound-reference impact scanning + bi-directional closure.
 *   repoint       deterministic repair of the mechanical reference classes the
 *                 scanner found. The only member of this barrel that writes.
 *   correction    correction-obligation extraction + reconcile-by-diff.
 *   figure        figure-staleness count re-derivation.
 */

// --- Shared identity + tree primitives -------------------------------------

export {
  type NoteFileSystem,
  type NoteIdentity,
  ENTITY_PREFIXES,
  ENTITY_PREFIX_SET,
  defaultNoteFileSystem,
  entityIdOfTitle,
  findEntityIds,
  locateNote,
  normalizeReference,
  readFrontmatter,
  stringField,
} from "./note-identity.js";

export { type IndexedNote, NoteIndex, buildNoteIndex, readNoteAt } from "./note-index.js";

export {
  type ParsedRelation,
  inverseVerb,
  isSymmetricVerb,
  parseRelationEntries,
  parseRelations,
} from "./relations.js";

export {
  type Block,
  type CheckboxItem,
  type HeadingRef,
  type Section,
  type SectionMatcher,
  type TableBlock,
  type TableRow,
  atomizeBlocks,
  cellOf,
  findCheckboxes,
  findTables,
  lineOfOffset,
  listHeadings,
  fencedLines,
  sliceLeafSections,
  sliceSections,
  splitBlocks,
  splitLines,
} from "./markdown-slices.js";

export {
  type NormalizedText,
  type QuoteMatch,
  findQuoteMatches,
  normalizeForQuoteMatch,
  normalizeQuote,
} from "./text-normalize.js";

export { NUMBER_WORDS, parseFigure, parseNumberWords } from "./number-words.js";

// --- Inbound-reference scanning --------------------------------------------

export { escapeRegExp, matchLine } from "./reference-matchers.js";

export {
  type NoteRecord,
  type ScanOptions,
  type TargetSpec,
  buildImpactManifest,
  resolveTargets,
  scanReferences,
  summarize,
} from "./reference-scan.js";

export { applyGraphLeg } from "./reference-graph.js";

export { type ClosureOptions, checkClosure } from "./reference-closure.js";

// --- Stage-one discovery: complete retrieval through the brain CLI ----------
//
// The one discovery mechanism. `--references` and `--exhaustive` return provably
// complete sets, and the funnel turns them into the candidate scope stage two
// reads. There is no ranked-search path and no tree-walking fallback.

export {
  type CompleteRetrievalResponse,
  type CompleteRetrievalRow,
  type SearchRunner,
  SearchUnavailableError,
  buildExhaustiveArgs,
  buildReferencesArgs,
  defaultSearchRunner,
  searchExhaustive,
  searchReferences,
} from "./brain-cli.js";

export {
  type FunnelLeg,
  type FunnelOptions,
  type FunnelQuery,
  type FunnelQueryOutcome,
  type FunnelResult,
  discoverCandidates,
  planQueries,
} from "./reference-funnel.js";

// --- Deterministic repoint (the one write path in this barrel) --------------

export { type RepointOptions, executeRepoint } from "./repoint.js";

export {
  type Candidate,
  LazyNoteIndex,
  classifyFindings,
  compareFindings,
  verifyDestination,
} from "./repoint-classify.js";

export { summarizeRepoint } from "./repoint-report.js";

export {
  type PermalinkResolver,
  buildWorkBrief,
  workBriefEntries,
} from "./work-brief.js";

export {
  type SectionFragment,
  parseSectionFragment,
  sectionAnchored,
} from "./repoint-anchors.js";

export {
  type AddressedEdit,
  type AddressVerdict,
  applyEdits,
  invertEdits,
  lineDiff,
  overlappingEdits,
  verifyAddress,
} from "./repoint-edits.js";

export {
  type Replacement,
  type Resolution,
  MECHANICAL_CLASSES,
  resolveReplacement,
} from "./repoint-resolve.js";

// --- Correction propagation ------------------------------------------------

export {
  type CorrectionMarker,
  DEFAULT_MARKER_KEYWORDS,
  RETIREMENT_PHRASES,
  contentBlocks,
  findCorrectionMarkers,
  lineInsideMarker,
  markerWithin,
  retirementMatch,
} from "./correction-markers.js";

export {
  type ExtractOptions,
  type ExtractionResult,
  DEFAULT_CORRECTION_HEADING_PATTERN,
  extractObligations,
  resolveItemTarget,
} from "./correction-extract.js";

export {
  type ReconcileInput,
  type VerifyOptions,
  reconcile,
  verifyObligation,
} from "./correction-verify.js";

// --- Figure staleness ------------------------------------------------------

export { scanNote } from "./figure-scan.js";

export { derive, headingAt, runCheck } from "./figure-derive.js";
