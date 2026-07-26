import { z } from "zod";
import { lineRangeSchema, mutationSpecSchema } from "../base.js";

export const planSourceEntrySchema = z.object({
  path: z.string().min(1),
  hash: z.string().min(1),
  range: lineRangeSchema,
  mutations: mutationSpecSchema,
});

const planDestinationEntrySchema = z.object({
  path: z.string().min(1),
  content_hash: z.string().min(1),
});

export const planCompositionPlanSchema = z.object({
  plan_type: z.literal("composition"),
  source_type: z.literal("plan"),
  source: planSourceEntrySchema,
  destinations: z.array(planDestinationEntrySchema).min(1),
  integrity_floor: z.number().min(0).max(1).default(0.5),
});

export type PlanCompositionPlan = z.infer<typeof planCompositionPlanSchema>;
