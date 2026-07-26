/**
 * Canonical plan-schema surface (ADR-002 D-5 modular layout).
 *
 * The plan ENVELOPE is declared exactly once, in `src/schemas/plan-yaml.ts`, and
 * re-exported here. Per the 2026-07-26 owner adjudication the production CLI
 * dialect — `source_path` + top-level mutation maps + `clusters{}` — is
 * canonical.
 *
 * The per-type modules under `distribution/` and `composition/` previously each
 * declared a SECOND envelope (`sources[]` + `destinations[]` with
 * per-destination mutations). Nothing in production ever loaded them: the CLI
 * loads plan-yaml, and the wrappers were reachable only from tests. That is the
 * third time this package has shipped a definition that exists, is tested, and
 * never sits on the path that runs — the same class as the orphaned
 * `injectiveDisjointMap` and the never-YAML-loadable `lineRangeSchema`. The
 * wrappers are therefore retired rather than maintained in parallel.
 *
 * What survives in those modules is their real contribution: the per-type
 * FRAGMENTS — SESSION's `crossSourceUpdateSchema`, SPEC's manifest schemas with
 * their path-containment refinements, PLAN's source-entry shape. Those compose
 * into the one envelope instead of competing with it. The ADR and ANALYSIS
 * modules were deleted outright: they carried no fragment, only the envelope.
 */
export { formatValidationErrors } from "./base.js";
export type { PlanValidationError } from "./base.js";

export {
  CompositionPlanSchema as compositionPlanSchema,
  DistributionPlanSchema as distributionPlanSchema,
} from "../src/schemas/plan-yaml.js";
export type { CompositionPlan, DistributionPlan } from "../src/schemas/plan-yaml.js";

export { crossSourceUpdateSchema } from "./distribution/session.plan.schema.js";
export type { CrossSourceUpdate } from "./distribution/session.plan.schema.js";

export {
  specSubtreeManifestSchema,
  subtreeManifestChildSchema,
  subtreeManifestRootSchema,
} from "./distribution/spec-subtree.plan.schema.js";
export type {
  SpecSubtreeManifest,
  SubtreeManifestChild,
  SubtreeManifestRoot,
} from "./distribution/spec-subtree.plan.schema.js";
