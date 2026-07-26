import { z } from "zod";
import { lineRangeSchema, mutationSpecSchema } from "../base.js";

const adrSourceEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
});

const adrDestinationEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
  mutations: mutationSpecSchema,
});

export const adrDistributionPlanSchema = z.object({
  plan_type: z.literal("distribution"),
  source_type: z.literal("adr"),
  sources: z.array(adrSourceEntrySchema).min(1),
  destinations: z.array(adrDestinationEntrySchema).min(1),
});

export type AdrDistributionPlan = z.infer<typeof adrDistributionPlanSchema>;
