import { z } from "zod";
import { injectiveDisjointMap } from "../../src/core/validators.js";
import { lineRangeSchema, mutationSpecSchema } from "../base.js";

/**
 * A cross-source update describes a side-effect mutation on a SIBLING note
 * (e.g., when a SESSION is distributed, it can emit planned updates to its
 * associated PLAN note). Targets are restricted to `plan` source_type for now;
 * extending to other targets is a future enhancement.
 */
export const crossSourceUpdateSchema = z.object({
  target_source_type: z.literal("plan"),
  target_path: z.string().min(1),
  frontmatter_map: z.record(z.string(), z.string()).optional(),
  wikilink_map: z.record(z.string(), z.string()).optional(),
});

export type CrossSourceUpdate = z.infer<typeof crossSourceUpdateSchema>;

const sessionSourceEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
});

const sessionDestinationEntrySchema = z.object({
  path: z.string().min(1),
  range: lineRangeSchema,
  mutations: mutationSpecSchema.superRefine((val, ctx) => {
    injectiveDisjointMap("renumber_map")(val.renumber_map, ctx);
    injectiveDisjointMap("wikilink_map")(val.wikilink_map, ctx);
  }),
});

export const sessionDistributionPlanSchema = z.object({
  plan_type: z.literal("distribution"),
  source_type: z.literal("session"),
  sources: z.array(sessionSourceEntrySchema).min(1),
  destinations: z.array(sessionDestinationEntrySchema).min(1),
  cross_source_updates: z.array(crossSourceUpdateSchema).optional(),
});

export type SessionDistributionPlan = z.infer<typeof sessionDistributionPlanSchema>;
