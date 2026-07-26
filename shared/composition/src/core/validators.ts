import { realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

/**
 * Returns a Zod refinement function that validates a Record<string,string> map is:
 * 1. Injective: no two keys map to the same value
 * 2. Disjoint: no value appears as a key (prevents round-trip collisions)
 *
 * Uses Set operations O(n). Both checks are BLOCKING — plan load fails on violation.
 */
export function injectiveDisjointMap(
  fieldName: string,
): (map: Record<string, string>, ctx: z.RefinementCtx) => void {
  return (map: Record<string, string>, ctx: z.RefinementCtx): void => {
    const keys = Object.keys(map);
    const values = Object.values(map);
    const keySet = new Set(keys);
    const valueSet = new Set(values);

    // Injectivity: all values must be distinct. Name the colliding targets —
    // on a map with dozens of entries, "duplicate values detected" alone leaves
    // the plan author to find the collision by hand.
    if (valueSet.size !== values.length) {
      const seen = new Set<string>();
      const duplicates = new Set<string>();
      for (const v of values) {
        if (seen.has(v)) duplicates.add(v);
        seen.add(v);
      }
      const listed = [...duplicates].map((v) => `"${v}"`).join(", ");
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldName}: map is not injective — duplicate values detected: ${listed}`,
      });
    }

    // Disjointness: no value may appear as a key
    for (const v of values) {
      if (keySet.has(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName}: map is not disjoint — value "${v}" also appears as a key`,
        });
      }
    }
  };
}

/**
 * Async Zod refinement that validates a path is contained within SKILLS_DOCS_ROOT.
 * Uses realpath to resolve symlinks before checking containment.
 * SKILLS_DOCS_ROOT must be set as an environment variable.
 */
export async function containedPathSchema(value: string, ctx: z.RefinementCtx): Promise<void> {
  const root = process.env["SKILLS_DOCS_ROOT"];
  if (!root) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "SKILLS_DOCS_ROOT environment variable is not set",
    });
    return;
  }

  try {
    const resolvedRoot = await realpath(root);
    const resolvedPath = await realpath(value);
    const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;

    if (!resolvedPath.startsWith(rootWithSep) && resolvedPath !== resolvedRoot) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Path "${value}" is outside the allowed docs root`,
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Path "${value}" does not exist or cannot be resolved`,
    });
  }
}
