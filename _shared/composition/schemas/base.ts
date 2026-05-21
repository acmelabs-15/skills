import { z } from "zod";
import type { LineRange } from "../src/core/types.js";

export const lineRangeSchema = z.object({
  start: z.number().int().positive(),
  end: z.union([z.number().int().positive(), z.literal(-1)]),
}) satisfies z.ZodType<LineRange>;

export const renumberMapSchema = z.record(z.string(), z.string());
export const wikilinkMapSchema = z.record(z.string(), z.string());
export const frontmatterMapSchema = z.record(z.string(), z.string());

/**
 * Schema-level integrity-floor guard per DESIGN-002-SPEC-003 Component 2 / REQ-003 AC-1.
 * Limits regenerated_sections to a maximum of 10 entries — a heuristic that catches
 * obviously excessive declarations without requiring the source file. The runtime
 * 50%-line-coverage check (Component 3) is the second enforcement layer.
 */
export const regeneratedSectionsFloor = z.array(z.string()).refine(
  (sections) => sections.length <= 10,
  {
    message:
      "regenerated_sections declares more than 10 sections; likely integrity bypass. Maximum 10 sections (enforced at schema level); runtime validates <=50% of source lines.",
  },
);

// Note: `satisfies z.ZodType<MutationSpec>` is omitted here. With Zod's `.optional()`
// producing `T | undefined` and the project's `exactOptionalPropertyTypes: true`
// requiring strict `T` (no `undefined`) for optional properties, the satisfies clause
// fails. The runtime shape matches MutationSpec exactly; the inferred type is correct
// and used by consumers via `z.infer<typeof mutationSpecSchema>`.
export const mutationSpecSchema = z.object({
  renumber_map: renumberMapSchema,
  wikilink_map: wikilinkMapSchema,
  frontmatter_map: frontmatterMapSchema.optional(),
  regenerated_sections: regeneratedSectionsFloor.optional(),
});

export interface PlanValidationError {
  path: string[];
  message: string;
  severity: "error" | "warning";
}

export function formatValidationErrors(error: z.ZodError): PlanValidationError[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
    severity: "error",
  }));
}
