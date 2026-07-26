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
import { ObservationSchema, RelationSchema } from "./common.js";

const IdentifierString = z.string().min(1);

/**
 * Path field refinement rejecting traversal sequences and absolute paths (CWE-22).
 * Applied to all file-path fields in distribution + composition plan schemas.
 */
const SafePath = z
  .string()
  .min(1)
  .refine((v) => !v.split(/[/\\]/).includes("..") && !v.startsWith("/") && !/^[A-Z]:\\/i.test(v), {
    message: "Path traversal (..) or absolute path rejected (CWE-22 mitigation)",
  });

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
 * Integer field tolerant of the string form that `yaml.FAILSAFE_SCHEMA`
 * produces. FAILSAFE_SCHEMA is mandated by ADR-001 Confirmation (CWE-502): it
 * resolves every scalar as a string, so `start: 1` reaches Zod as `"1"`. Per
 * ADR-002 D-3 the validator — not the YAML parser — owns type conversion
 * ("YAML type coercion quirks are mitigated by strict Zod validation on load").
 *
 * Coercion is deliberately narrower than `z.coerce.number()`, which would
 * accept `""` as 0 and `" 12 "` as 12: only an optionally-signed run of digits
 * is admitted.
 */
const YamlInt = z.union([z.number().int(), z.string().regex(/^-?\d+$/)]).transform(Number);

/**
 * Cluster line range per ADR-002 D-5 `lineRangeSchema`: 1-indexed inclusive,
 * `end: -1` meaning end-of-file.
 */
const LineRangeSchema = z
  .object({
    start: YamlInt.refine((n) => n >= 1, { message: "start must be >= 1" }),
    end: YamlInt,
  })
  .refine((r) => r.end === -1 || r.end >= r.start, {
    message: "end must be >= start, or -1 for end-of-file",
  });

/**
 * Structured scaffolding for one destination. Rendered by the executor rather
 * than supplied as raw markdown so that "H1 matches the frontmatter title" and
 * the final-two-sections invariant are mechanically guaranteed instead of
 * trusted to the plan author.
 *
 * Scaffolding is excluded from both byte proofs — see core/cluster-scaffold.ts
 * for why that preserves the ADR-001 F-8 guarantee over the content slice.
 */
const ClusterScaffoldSchema = z
  .object({
    frontmatter: z
      .object({
        title: z.string().min(1),
        type: z.string().min(1),
        status: z.string().min(1),
        permalink: z.string().min(1),
        tags: z.array(z.string().min(1)).min(1),
      })
      .strict(),
    observations: z.array(ObservationSchema).min(1),
    relations: z.array(RelationSchema).min(1),
  })
  .strict();

/**
 * Disposition of a cluster's line range.
 *
 * `write` (the default) extracts the range and writes a destination file.
 * `retain` extracts the range and counts it toward the coverage proof but writes
 * nothing — the content stays in the source note. Retention is what lets a split
 * account for every source byte without forcing the source's own frontmatter, H1
 * and trailing Observations/Relations verbatim into a child note.
 */
const DispositionEnum = z.enum(["write", "retain"]);

/**
 * Distribution plan: 1-to-N split. Source path is singular; destinations are
 * either an explicit list (`destinations[]`) OR a `clusters` map describing
 * the partitioning.
 */
export const DistributionPlanSchema = z
  .object({
    plan_type: z.literal("distribution"),
    source_type: z.string().min(1),
    source_path: SafePath,
    renumber_map: RenumberMapSchema,
    wikilink_map: WikilinkMapSchema.default({}),
    clusters: z
      .record(
        z.string(),
        z
          .object({
            description: z.string().optional(),
            destination_path: SafePath.optional(),
            identifiers: z.array(IdentifierString).optional(),
            decisions: z.array(IdentifierString).optional(),
            renumbered_to: z.array(IdentifierString).optional(),
            range: LineRangeSchema.optional(),
            disposition: DispositionEnum.default("write"),
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
  SafePath,
  z
    .object({
      path: SafePath,
      scaffold: ClusterScaffoldSchema.optional(),
    })
    .strict(),
]);

export const CompositionPlanSchema = z
  .object({
    plan_type: z.literal("composition"),
    source_type: z.string().min(1),
    target_path: SafePath,
    sources: z.array(CompositionSourceSchema).optional(),
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
