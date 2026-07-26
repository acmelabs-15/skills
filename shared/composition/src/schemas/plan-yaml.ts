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
 * This module declares only the two plan ENVELOPES. Every field primitive —
 * paths, line ranges, mutation maps and their F-8 invariants, scaffolding,
 * disposition — comes from the canonical `schemas/base.ts` per ADR-002 D-5, and
 * the invariants are carried by those primitives rather than re-applied here.
 * Nothing in this file re-states a rule that has a home there. Two ways a
 * BLOCKING guard stops running have already been observed in this codebase: a
 * second, weaker implementation on the path that actually executes, and a
 * canonical guard with no call site at all. Importing rather than re-stating
 * closes both.
 */
import { z } from "zod";
import {
  ClusterScaffoldSchema,
  dispositionEnum,
  lineRangeSchema,
  regeneratedSectionsFloor,
  renumberMapSchema,
  safePathSchema,
  wikilinkMapSchema,
} from "../../schemas/base.js";

/**
 * Distribution plan: 1-to-N split. Source path is singular; destinations are
 * either an explicit list (`destinations[]`) OR a `clusters` map describing
 * the partitioning.
 */
export const DistributionPlanSchema = z
  .object({
    plan_type: z.literal("distribution"),
    source_type: z.string().min(1),
    source_path: safePathSchema,
    renumber_map: renumberMapSchema,
    wikilink_map: wikilinkMapSchema.default({}),
    clusters: z
      .record(
        z.string(),
        z
          .object({
            description: z.string().optional(),
            destination_path: safePathSchema.optional(),
            identifiers: z.array(z.string().min(1)).optional(),
            decisions: z.array(z.string().min(1)).optional(),
            renumbered_to: z.array(z.string().min(1)).optional(),
            range: lineRangeSchema.optional(),
            // Per-cluster mutation override. Before this the envelope was
            // .strict() with no field to express it, so D-5's 50%
            // regenerated_sections integrity floor was dead code on the
            // production path — no plan the CLI accepted could exercise it.
            //
            // `frontmatter_map` is deliberately NOT exposed here. It is not
            // invertible as specified: the map carries field -> NEW value and
            // never the old one, so reverseMutations inverts it to
            // {newValue: field} and cannot restore the original. Every plan
            // using it would fail the F-8 comparison and exit 2. Exposing a
            // field that can only ever fail is worse than withholding it;
            // see the delivery report's design-gap section.
            regenerated_sections: regeneratedSectionsFloor.optional(),
            disposition: dispositionEnum.default("write"),
            scaffold: ClusterScaffoldSchema.optional(),
          })
          .strict()
          .superRefine((cluster, ctx) => {
            if (cluster.disposition !== "retain") return;
            // A retained range produces no file, so destination-side fields are
            // contradictory rather than merely redundant — reject them loudly.
            if (cluster.destination_path !== undefined) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'a cluster with disposition "retain" writes no file and must not declare destination_path',
                path: ["destination_path"],
              });
            }
            if (cluster.scaffold !== undefined) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'a cluster with disposition "retain" writes no file and must not declare scaffold',
                path: ["scaffold"],
              });
            }
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
/**
 * A composition source: either a bare path, or a path plus the scaffolding that
 * decompose wrapped around its content slice. When `scaffold` is present the
 * merge strips exactly that prologue/epilogue before joining, so what is
 * concatenated is the preserved content slice rather than the rendered note.
 */
const CompositionSourceSchema = z.union([
  safePathSchema,
  z
    .object({
      path: safePathSchema,
      scaffold: ClusterScaffoldSchema.optional(),
    })
    .strict(),
]);

export const CompositionPlanSchema = z
  .object({
    plan_type: z.literal("composition"),
    source_type: z.string().min(1),
    target_path: safePathSchema,
    sources: z.array(CompositionSourceSchema).optional(),
    renumber_map: renumberMapSchema,
    wikilink_map: wikilinkMapSchema.default({}),
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
