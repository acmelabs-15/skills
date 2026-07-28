/**
 * Barrel re-exports for the note-schema layer (src/schemas/).
 *
 * Downstream consumers (parsers, claim validators, per-skill scripts, hook
 * handlers) import from this barrel rather than individual files to keep
 * import paths stable across future refactors, per
 * DESIGN-001-SPEC-008 (Coverage Module Layout).
 *
 * Named re-exports rather than `export *`: the repo has no star exports, and an
 * explicit list keeps the public surface reviewable in one place.
 *
 * Scope is the three note-type schemas this package owns. The engine-facing
 * schemas that once sat here — reference manifests, repoint plans, correction
 * obligations, figure checks, work briefs — moved to `@acmelabs/core` when the
 * library split into packages, and are re-exported from that package's barrel.
 */
export { AdrNoteSchema, type AdrNote } from "./adr-note.js";
export { AnalysisNoteSchema, type AnalysisNote } from "./analysis-note.js";
export { EpicNoteSchema, type EpicNote } from "./epic-note.js";
