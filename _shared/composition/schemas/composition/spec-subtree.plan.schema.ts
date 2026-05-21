import { z } from "zod";
import { specSubtreeManifestSchema } from "../distribution/spec-subtree.plan.schema.js";

/**
 * Composition (recompose) variant of the SPEC subtree plan per ADR-002 D-5.
 *
 * Both distribution and composition variants share the same subtree_manifest
 * shape — the plan_type discriminant determines direction (split vs merge),
 * but the per-entry root + children manifest with per-entry mutations is
 * identical. See distribution/spec-subtree.plan.schema.ts for the manifest
 * shape and invariants.
 */
export const specSubtreeCompositionPlanSchema = z.object({
  plan_type: z.literal("composition"),
  source_type: z.literal("spec"),
  subtree_manifest: specSubtreeManifestSchema,
});

export type SpecSubtreeCompositionPlan = z.infer<typeof specSubtreeCompositionPlanSchema>;
