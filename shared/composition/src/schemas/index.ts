/**
 * Barrel re-exports for the note-schema layer (src/schemas/).
 *
 * Downstream consumers (parsers, claim validators, per-skill scripts, hook
 * handlers) import from this barrel rather than individual files to keep
 * import paths stable across future refactors, per
 * DESIGN-001-SPEC-008 (Coverage Module Layout).
 */
export { AdrNoteSchema, type AdrNote } from "./adr-note.js";
