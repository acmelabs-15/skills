import { z } from "zod";
import { injectiveDisjointMap } from "../../src/core/validators.js";
import { lineRangeSchema, mutationSpecSchema } from "../base.js";

const adrSourceEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
});

const adrDestinationEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
  mutations: mutationSpecSchema.superRefine((val, ctx) => {
    injectiveDisjointMap("renumber_map")(val.renumber_map, ctx);
    injectiveDisjointMap("wikilink_map")(val.wikilink_map, ctx);
  }),
});

export const adrDistributionPlanSchema = z.object({
  plan_type: z.literal("distribution"),
  source_type: z.literal("adr"),
  sources: z.array(adrSourceEntrySchema).min(1),
  destinations: z.array(adrDestinationEntrySchema).min(1),
});

export type AdrDistributionPlan = z.infer<typeof adrDistributionPlanSchema>;
