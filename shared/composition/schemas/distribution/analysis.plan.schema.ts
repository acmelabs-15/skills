import { z } from "zod";
import { lineRangeSchema, mutationSpecSchema } from "../base.js";

const analysisSourceEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
});

const analysisDestinationEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
  mutations: mutationSpecSchema,
});

export const analysisDistributionPlanSchema = z.object({
  plan_type: z.literal("distribution"),
  source_type: z.literal("analysis"),
  sources: z.array(analysisSourceEntrySchema).min(1),
  destinations: z.array(analysisDestinationEntrySchema).min(1),
});

export type AnalysisDistributionPlan = z.infer<typeof analysisDistributionPlanSchema>;
