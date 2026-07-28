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
export { EpicNoteSchema, type EpicNote } from "./epic-note.js";

/** Inbound-reference impact manifest + bi-directional closure report. */

/** Repoint plan + execution report — the manifest's deterministic repair stage. */

/** Residue vocabulary — the leaf the plan and the work brief both depend on. */

/** The AI-ready work brief: declined repairs, grouped by repair site. */

/** Correction obligations + reconcile-by-diff report. */

/** Figure-staleness checks + re-derivation report. */
