/**
 * Zod schemas for distribution and composition plan YAMLs consumed by the
 * /decompose and /recompose CLI entry points per DESIGN-001-SPEC-005 and
 * DESIGN-002-SPEC-005.
 *
 * Per ADR-001 Confirmation security hardening, plan YAMLs are loaded with
 * js-yaml FAILSAFE_SCHEMA (in the CLI layer) and then parsed through these
 * Zod schemas at the loader boundary. Validation errors surface as ZodError
 * instances, which the CLI formats into structured PlanValidationError output.
 *
 * Bijection of `renumber_map` is enforced via a Zod `superRefine` to catch
 * non-injective maps at load time, before any file I/O occurs.
 */
import { z } from "zod";

const IdentifierString = z.string().min(1);

const RenumberMapSchema = z.record(IdentifierString, IdentifierString).superRefine((map, ctx) => {
  const values = Object.values(map);
  const seen = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `renumber_map is not injective: codomain value "${v}" appears more than once`,
        path: ["renumber_map"],
      });
      return;
    }
    seen.add(v);
  }
});

const WikilinkMapSchema = z.record(IdentifierString, IdentifierString);

/**
 * Distribution plan: 1-to-N split. Source path is singular; destinations are
 * either an explicit list (`destinations[]`) OR a `clusters` map describing
 * the partitioning.
 */
export const DistributionPlanSchema = z
  .object({
    plan_type: z.literal("distribution"),
    source_type: z.string().min(1),
    source_path: z.string().min(1),
    renumber_map: RenumberMapSchema,
    wikilink_map: WikilinkMapSchema.default({}),
    clusters: z
      .record(
        z.string(),
        z.object({
          description: z.string().optional(),
          destination_path: z.string().optional(),
          identifiers: z.array(IdentifierString).optional(),
          decisions: z.array(IdentifierString).optional(),
          renumbered_to: z.array(IdentifierString).optional(),
          range: z
            .object({
              start: z.number().int().positive(),
              end: z.number().int(),
            })
            .optional(),
        }),
      )
      .optional(),
  })
  .strict();

/**
 * Composition plan: N-to-1 merge. Per ADR-002 D-1 the schema shape is the
 * inverse of distribution — singular target and renumber_map describing the
 * unified identifier remap.
 */
export const CompositionPlanSchema = z
  .object({
    plan_type: z.literal("composition"),
    source_type: z.string().min(1),
    target_path: z.string().min(1),
    sources: z.array(z.string().min(1)).optional(),
    renumber_map: RenumberMapSchema,
    wikilink_map: WikilinkMapSchema.default({}),
  })
  .strict();

export type DistributionPlan = z.infer<typeof DistributionPlanSchema>;
export type CompositionPlan = z.infer<typeof CompositionPlanSchema>;

/**
 * PlanValidationError captures Zod-rejected plan content with structured
 * field-level issues. CLI entry points format the `issues` array into the
 * `[{path, message}, ...]` array specified by ADR-002 D-5.
 */
export class PlanValidationError extends Error {
  readonly issues: ReadonlyArray<{ path: string; message: string }>;

  constructor(message: string, issues: ReadonlyArray<{ path: string; message: string }>) {
    super(message);
    this.name = "PlanValidationError";
    this.issues = issues;
  }
}

/**
 * Convert a ZodError into the structured issues array used by
 * PlanValidationError. Path segments are joined with ".".
 */
export function zodErrorToIssues(err: z.ZodError): Array<{ path: string; message: string }> {
  return err.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "<root>",
    message: issue.message,
  }));
}
