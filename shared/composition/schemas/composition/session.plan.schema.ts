import { z } from "zod";
import { lineRangeSchema, mutationSpecSchema } from "../base.js";

const sessionSourceEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
  mutations: mutationSpecSchema,
});

const sessionDestinationEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
});

export const sessionCompositionPlanSchema = z.object({
  plan_type: z.literal("composition"),
  source_type: z.literal("session"),
  sources: z.array(sessionSourceEntrySchema).min(1),
  destinations: z.array(sessionDestinationEntrySchema).min(1),
});

export type SessionCompositionPlan = z.infer<typeof sessionCompositionPlanSchema>;
