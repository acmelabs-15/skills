import { z } from "zod";
import type { LineRange } from "../src/core/types.js";

export const lineRangeSchema = z.object({
  start: z.number().int().positive(),
  end: z.union([z.number().int().positive(), z.literal(-1)]),
}) satisfies z.ZodType<LineRange>;

export const renumberMapSchema = z.record(z.string(), z.string());
export const wikilinkMapSchema = z.record(z.string(), z.string());
export const frontmatterMapSchema = z.record(z.string(), z.string());

// Note: `satisfies z.ZodType<MutationSpec>` is omitted here. With Zod's `.optional()`
// producing `T | undefined` and the project's `exactOptionalPropertyTypes: true`
// requiring strict `T` (no `undefined`) for optional properties, the satisfies clause
// fails. The runtime shape matches MutationSpec exactly; the inferred type is correct
// and used by consumers via `z.infer<typeof mutationSpecSchema>`.
export const mutationSpecSchema = z.object({
  renumber_map: renumberMapSchema,
  wikilink_map: wikilinkMapSchema,
  frontmatter_map: frontmatterMapSchema.optional(),
  regenerated_sections: z.array(z.string()).optional(),
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
