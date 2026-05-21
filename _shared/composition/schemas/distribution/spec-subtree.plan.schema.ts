import { z } from "zod";
import { lineRangeSchema, mutationSpecSchema } from "../base.js";

export const subtreeChildEntrySchema = z.object({
  relative_path: z.string().min(1),
  hash: z.string(),
  identifier: z.string().min(1),
  range: lineRangeSchema.optional(),
});

const baseSpecSubtreeManifestSchema = z.object({
  root_path: z.string().min(1),
  root_hash: z.string(),
  children: z.array(subtreeChildEntrySchema).min(1),
});

export const specSubtreeManifestSchema = baseSpecSubtreeManifestSchema.superRefine((data, ctx) => {
  // Injectivity: no two children may share the same relative_path.
  const paths = data.children.map((c) => c.relative_path);
  const uniquePaths = new Set(paths);
  if (uniquePaths.size !== paths.length) {
    ctx.addIssue({
      code: "custom",
      message: "Duplicate relative_path in children (non-injective)",
    });
  }
  // Security: path-traversal mitigation (CWE-22).
  for (const path of paths) {
    if (path.includes("..") || path.startsWith("/")) {
      ctx.addIssue({
        code: "custom",
        message: `Path traversal detected: ${path}`,
      });
    }
  }
  // Security: root_path must also be relative.
  if (data.root_path.includes("..") || data.root_path.startsWith("/")) {
    ctx.addIssue({
      code: "custom",
      message: `Path traversal detected in root_path: ${data.root_path}`,
    });
  }
});

const subtreeDestinationChildSchema = z.object({
  relative_path: z.string().min(1),
  new_identifier: z.string().min(1),
});

const subtreeDestinationSchema = z.object({
  root_path: z.string().min(1),
  children: z.array(subtreeDestinationChildSchema),
});

export const specSubtreeDistributionPlanSchema = z.object({
  plan_type: z.literal("distribution"),
  source_type: z.literal("spec-subtree"),
  manifest: specSubtreeManifestSchema,
  destinations: z.array(subtreeDestinationSchema).min(1),
  mutations: mutationSpecSchema,
});

export type SpecSubtreeDistributionPlan = z.infer<typeof specSubtreeDistributionPlanSchema>;
export type SpecSubtreeManifest = z.infer<typeof specSubtreeManifestSchema>;
