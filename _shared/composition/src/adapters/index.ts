/**
 * Barrel export for all composition adapters.
 *
 * Re-exports the canonical adapter classes so consumers can
 * `import { AdrAdapter, SpecSubtreeAdapter } from "@composition/adapters"`
 * without reaching into individual files.
 */

export { AdrAdapter } from "./adr.js";
export { AnalysisAdapter } from "./analysis.js";
export { PlanAdapter } from "./plan.js";
export { SessionAdapter } from "./session.js";
export {
  type FilenameRewriteSpec,
  SpecSubtreeAdapter,
  type SubtreeChild,
  type SubtreeManifest,
  type SubtreeMutationResult,
  SubtreeHashValidationError,
} from "./spec-subtree.js";
