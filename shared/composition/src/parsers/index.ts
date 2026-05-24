/**
 * Parser barrel (SPEC-008 TASK-005, 2026-05-24).
 *
 * Re-exports the public `parse*Note` entry points for the composition
 * library's parser layer. Each parser produces a Zod-validated note model
 * from raw markdown; failures throw ZodError with structured `path` arrays.
 *
 * As of TASK-005 only the ADR parser ships through this barrel. TASK-006
 * (additional parsers: PRD, EPIC, FEATURE, RETRO, SECURITY) will extend the
 * exports here without breaking the public surface.
 */

export { parseAdrNote } from "./adr-note.js";
export type {
  AdrFrontmatter,
  AdrNote,
  ClarificationItem,
  ConsideredOption,
} from "./adr-note.js";
