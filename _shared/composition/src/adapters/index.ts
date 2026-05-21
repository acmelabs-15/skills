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
  defaultSubtreeFileIO,
  type FilenameRewriteSpec,
  type HashValidationEntry,
  type HashValidationResult,
  type ProcessResult,
  rollbackCluster,
  SpecSubtreeAdapter,
  type SubtreeChild,
  type SubtreeFileForValidation,
  type SubtreeFileIO,
  type SubtreeManifest,
  type SubtreeMutationResult,
  type SubtreeProcessInput,
  SubtreeHashValidationError,
  validateSubtreeHashes,
} from "./spec-subtree.js";
