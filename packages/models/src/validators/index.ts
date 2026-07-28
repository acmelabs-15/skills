/**
 * Barrel re-exports for the claim-validator layer (src/validators/).
 *
 * Downstream consumers (parsers, per-skill scripts, hook handlers,
 * orchestrator dispatch helpers) import from this barrel rather than
 * individual files to keep import paths stable across future refactors,
 * per DESIGN-001-SPEC-008 (Coverage Module Layout).
 *
 * Created in TASK-010-SPEC-008 (Wave 2) alongside `validatePlanDoneClaim`;
 * additional validator exports land in subsequent Track 1 TASKs.
 */
export { validatePlanDoneClaim, type PlanClaimResult } from "./plan-claim-validator.js";
export { validateAdrAcceptedClaim, type AdrClaimResult } from "./adr-claim-validator.js";
export {
  validateAnalysisAcceptedClaim,
  type AnalysisClaimResult,
} from "./analysis-claim-validator.js";
export {
  validateEpicDoneClaim,
  type EpicClaimResult,
  type SpecResolver,
} from "./epic-claim-validator.js";
export {
  extractAndCheckClaim,
  type ClaimNoteType,
  type LenientClaimResult,
} from "./lenient-claim-extract.js";
