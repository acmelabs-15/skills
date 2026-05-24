import { z } from "zod";
import { injectiveDisjointMap } from "../../src/core/validators.js";
import { lineRangeSchema, mutationSpecSchema } from "../base.js";

export const planSourceEntrySchema = z.object({
  path: z.string().min(1),
  hash: z.string().min(1),
  range: lineRangeSchema,
});

const planDestinationEntrySchema = z.object({
  path: z.string().min(1),
  content_hash: z.string().min(1),
});

export const planDistributionPlanSchema = z.object({
  plan_type: z.literal("distribution"),
  source_type: z.literal("plan"),
  source: planSourceEntrySchema,
  destinations: z.array(planDestinationEntrySchema).min(1),
  mutations: mutationSpecSchema.superRefine((val, ctx) => {
    injectiveDisjointMap("renumber_map")(val.renumber_map, ctx);
    injectiveDisjointMap("wikilink_map")(val.wikilink_map, ctx);
  }),
  integrity_floor: z.number().min(0).max(1).default(0.5),
});

export type PlanDistributionPlan = z.infer<typeof planDistributionPlanSchema>;
