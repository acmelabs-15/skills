import { z } from "zod";
import { adrCompositionPlanSchema } from "./composition/adr.plan.schema.js";
import { planCompositionPlanSchema } from "./composition/plan.plan.schema.js";
import { specSubtreeCompositionPlanSchema } from "./composition/spec-subtree.plan.schema.js";
import { adrDistributionPlanSchema } from "./distribution/adr.plan.schema.js";
import { planDistributionPlanSchema } from "./distribution/plan.plan.schema.js";
import { specSubtreeDistributionPlanSchema } from "./distribution/spec-subtree.plan.schema.js";

export { formatValidationErrors } from "./base.js";
export type { PlanValidationError } from "./base.js";

const distributionPlanSchema = z.discriminatedUnion("source_type", [
  adrDistributionPlanSchema,
  specSubtreeDistributionPlanSchema,
  planDistributionPlanSchema,
]);

const compositionPlanSchema = z.discriminatedUnion("source_type", [
  adrCompositionPlanSchema,
  specSubtreeCompositionPlanSchema,
  planCompositionPlanSchema,
]);

// Outer discriminant: plan_type
// Inner schemas are themselves discriminated unions (on source_type), so we use z.union
// rather than z.discriminatedUnion for the outer assembly.
export const planSchema = z.union([distributionPlanSchema, compositionPlanSchema]);

export type Plan = z.infer<typeof planSchema>;
export type { AdrCompositionPlan } from "./composition/adr.plan.schema.js";
export type { AdrDistributionPlan } from "./distribution/adr.plan.schema.js";
export type { PlanCompositionPlan } from "./composition/plan.plan.schema.js";
export type { PlanDistributionPlan } from "./distribution/plan.plan.schema.js";
export type { SpecSubtreeCompositionPlan } from "./composition/spec-subtree.plan.schema.js";
export type {
  SpecSubtreeDistributionPlan,
  SpecSubtreeManifest,
} from "./distribution/spec-subtree.plan.schema.js";
