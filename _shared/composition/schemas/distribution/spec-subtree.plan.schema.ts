import { z } from "zod";
import { mutationSpecSchema } from "../base.js";

/**
 * Sync path-traversal guard for manifest paths. Rejects:
 *   - absolute paths ("/...")
 *   - paths containing ".." segments
 *
 * Note: the async realpath-based `containedPathSchema` lives in
 * src/core/validators.ts and is the runtime CWE-22 mitigation (it
 * requires the path to exist on disk). At plan-load time, destination
 * paths do not yet exist, so we apply the cheaper sync check here.
 */
function rejectPathTraversal(pathValue: string, ctx: z.RefinementCtx, label: string): void {
  if (pathValue.startsWith("/")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Path traversal detected in ${label}: absolute path "${pathValue}"`,
    });
    return;
  }
  const segments = pathValue.split("/");
  if (segments.some((segment) => segment === "..")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Path traversal detected in ${label}: ".." segment in "${pathValue}"`,
    });
  }
}

/**
 * Root entry of the SPEC subtree manifest per ADR-002 D-5.
 *
 * The root note (the SPEC-NNN-*.md itself) carries its own mutations.
 */
export const subtreeManifestRootSchema = z.object({
  source_path: z.string().min(1),
  mutations: mutationSpecSchema,
});

/**
 * Child entry of the SPEC subtree manifest per ADR-002 D-5.
 *
 * Each child (REQ / DESIGN / TASK / etc.) has its own source + destination
 * paths and mutation spec. `filename_rewrite_map` is optional — present when
 * the renumber implies a filename change (e.g., REQ-001 → REQ-003 renames
 * "REQ-001-...md" → "REQ-003-...md"); absent when the renumber is body-only.
 */
export const subtreeManifestChildSchema = z.object({
  source_path: z.string().min(1),
  dest_path: z.string().min(1),
  mutations: mutationSpecSchema,
  filename_rewrite_map: z.record(z.string(), z.string()).optional(),
});

const baseSpecSubtreeManifestSchema = z.object({
  root: subtreeManifestRootSchema,
  // No `.min(1)` — empty children is valid per REQ-005-SPEC-004 AC5
  // (a SPEC with no REQ/DESIGN/TASK notes still has a manifest with
  // an empty children array).
  children: z.array(subtreeManifestChildSchema),
});

/**
 * SPEC subtree manifest schema per ADR-002 D-5.
 *
 * Shape (verbatim from ADR-002 D-5):
 *   subtree_manifest:
 *     root:
 *       source_path: <string>
 *       mutations: <MutationSpec>
 *     children:
 *       - source_path: <string>
 *         dest_path: <string>
 *         mutations: <MutationSpec>
 *         filename_rewrite_map: <optional Record<string, string>>
 *
 * Invariants enforced:
 *   - Path containment: no `..` segments, no absolute paths in any
 *     source_path / dest_path (CWE-22 mitigation at plan-load time;
 *     runtime realpath-based check lives in src/core/validators.ts)
 *   - Injectivity of `dest_path` across children (no two children may
 *     write to the same destination)
 *
 * Injectivity / disjointness of `renumber_map` and `wikilink_map` inside
 * MutationSpec entries is left to the runtime injectiveDisjointMap
 * validator from src/core/validators.ts when applied per-call.
 */
export const specSubtreeManifestSchema = baseSpecSubtreeManifestSchema.superRefine((data, ctx) => {
  rejectPathTraversal(data.root.source_path, ctx, "root.source_path");
  const destPaths: string[] = [];
  for (let i = 0; i < data.children.length; i++) {
    const child = data.children[i];
    if (!child) {
      continue;
    }
    rejectPathTraversal(child.source_path, ctx, `children[${i}].source_path`);
    rejectPathTraversal(child.dest_path, ctx, `children[${i}].dest_path`);
    destPaths.push(child.dest_path);
  }
  // Injectivity: no two children may write to the same dest_path.
  const uniqueDestPaths = new Set(destPaths);
  if (uniqueDestPaths.size !== destPaths.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate dest_path across children (non-injective)",
    });
  }
});

export const specSubtreeDistributionPlanSchema = z.object({
  plan_type: z.literal("distribution"),
  source_type: z.literal("spec"),
  subtree_manifest: specSubtreeManifestSchema,
});

export type SpecSubtreeDistributionPlan = z.infer<typeof specSubtreeDistributionPlanSchema>;
export type SpecSubtreeManifest = z.infer<typeof specSubtreeManifestSchema>;
export type SubtreeManifestRoot = z.infer<typeof subtreeManifestRootSchema>;
export type SubtreeManifestChild = z.infer<typeof subtreeManifestChildSchema>;
