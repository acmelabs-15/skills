import { z } from "zod";
import { adrCompositionPlanSchema } from "./composition/adr.plan.schema.js";
import { adrDistributionPlanSchema } from "./distribution/adr.plan.schema.js";

export { formatValidationErrors } from "./base.js";
export type { PlanValidationError } from "./base.js";

const distributionPlanSchema = z.discriminatedUnion("source_type", [adrDistributionPlanSchema]);

const compositionPlanSchema = z.discriminatedUnion("source_type", [adrCompositionPlanSchema]);

// Outer discriminant: plan_type
// Inner schemas are themselves discriminated unions (on source_type), so we use z.union
// rather than z.discriminatedUnion for the outer assembly.
export const planSchema = z.union([distributionPlanSchema, compositionPlanSchema]);

export type Plan = z.infer<typeof planSchema>;
export type { AdrCompositionPlan } from "./composition/adr.plan.schema.js";
export type { AdrDistributionPlan } from "./distribution/adr.plan.schema.js";
