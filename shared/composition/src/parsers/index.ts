/**
 * Parser barrel (SPEC-008 TASK-005, 2026-05-24).
 *
 * Re-exports the public `parse*Note` entry points for the composition
 * library's parser layer. Each parser produces a Zod-validated note model
 * from raw markdown; failures throw ZodError with structured `path` arrays.
 *
 * As of TASK-006 the ADR, ANALYSIS, EPIC, and CRIT parsers ship through this
 * barrel. Each new module adds a single named-export line plus its type
 * re-exports without breaking the public surface (DESIGN-001-SPEC-008).
 */

export { parseAdrNote } from "./adr-note.js";
export type {
  AdrFrontmatter,
  AdrNote,
  ClarificationItem,
  ConsideredOption,
} from "./adr-note.js";
export { parseAnalysisNote } from "./analysis-note.js";
export type {
  AnalysisFrontmatter,
  AnalysisNote,
  ParsedAnalysisNote,
} from "./analysis-note.js";
export { parseEpicNote } from "./epic-note.js";
export type { EpicFrontmatter, EpicNote, ParsedEpicNote } from "./epic-note.js";
export { parseCritNote } from "./crit-note.js";
export type { CritFinding, CritFrontmatter, CritNote } from "./crit-note.js";
