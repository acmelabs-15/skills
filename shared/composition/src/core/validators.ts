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
 *
 * Requires the path to exist. Use `containedWritePath` for destinations, which
 * have not been created yet at validation time.
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
    if (!isWithin(resolvedPath, resolvedRoot)) {
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

/** True when `target` is the root itself or sits beneath it. */
function isWithin(target: string, root: string): boolean {
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  return target === root || target.startsWith(rootWithSep);
}

/**
 * Resolve symlinks as far as the path actually exists, then append the
 * not-yet-created remainder lexically.
 *
 * Plain `realpath` throws on a missing path, which makes it unusable for
 * DESTINATION paths — those are files the operation is about to create. Walking
 * up to the nearest existing ancestor still defeats a symlinked-directory escape
 * (the escape lives in the existing prefix, which does get resolved) while
 * tolerating the missing leaf and any missing intermediate directories.
 */
async function resolveExistingPrefix(target: string): Promise<string> {
  const segments: string[] = [];
  let current = path.resolve(target);
  for (;;) {
    try {
      const resolved = await realpath(current);
      return segments.length === 0 ? resolved : path.join(resolved, ...segments.reverse());
    } catch {
      const parent = path.dirname(current);
      // Reached the filesystem root without finding anything that exists.
      if (parent === current) return path.resolve(target);
      segments.push(path.basename(current));
      current = parent;
    }
  }
}

/**
 * Containment check for a path that may not exist yet (plan destinations).
 *
 * Skips silently when `SKILLS_DOCS_ROOT` is unset: the synchronous path guard
 * (traversal + absolute rejection) applies unconditionally regardless, and this
 * refinement is the additional symlink-escape layer that only has meaning once a
 * containment root has been declared. Failing closed here would reject every
 * plan in an unconfigured environment, including ones with no path issue at all.
 */
export async function containedWritePath(value: string, ctx: z.RefinementCtx): Promise<void> {
  const root = process.env["SKILLS_DOCS_ROOT"];
  if (!root) return;

  try {
    const resolvedRoot = await realpath(root);
    const resolvedPath = await resolveExistingPrefix(path.resolve(resolvedRoot, value));
    // `value` is already absolute when called from findUncontainedPaths, in which
    // case path.resolve returns it unchanged — the root is only a base for
    // relative inputs.
    if (!isWithin(resolvedPath, resolvedRoot)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Path "${value}" resolves outside the allowed docs root`,
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Path "${value}" cannot be resolved for containment checking`,
    });
  }
}
