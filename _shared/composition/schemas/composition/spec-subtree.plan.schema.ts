import { z } from "zod";
import { mutationSpecSchema } from "../base.js";
import { specSubtreeManifestSchema } from "../distribution/spec-subtree.plan.schema.js";

const subtreeDestinationChildSchema = z.object({
  relative_path: z.string().min(1),
  new_identifier: z.string().min(1),
});

const subtreeDestinationSchema = z.object({
  root_path: z.string().min(1),
  children: z.array(subtreeDestinationChildSchema),
});

export const specSubtreeCompositionPlanSchema = z.object({
  plan_type: z.literal("composition"),
  source_type: z.literal("spec-subtree"),
  manifest: specSubtreeManifestSchema,
  destinations: z.array(subtreeDestinationSchema).min(1),
  mutations: mutationSpecSchema,
});

export type SpecSubtreeCompositionPlan = z.infer<typeof specSubtreeCompositionPlanSchema>;
