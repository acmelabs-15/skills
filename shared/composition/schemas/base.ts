/**
 * Canonical schema primitives per ADR-002 D-5: "common envelope fields, shared
 * types, and shared refinements".
 *
 * This module is the single definition site for every field shape that both the
 * modular per-type plan schemas and the CLI-facing plan schemas depend on. Two
 * properties are deliberate and load-bearing:
 *
 * **FAILSAFE-tolerant.** ADR-001 mandates `yaml.FAILSAFE_SCHEMA` (CWE-502), which
 * resolves every scalar as a string. Primitives therefore accept the string form
 * and convert at the validator boundary, which is where ADR-002 D-3 places type
 * conversion. A primitive declared `z.number()` is unreachable from any real
 * plan — that was true of `lineRangeSchema` here until this consolidation, which
 * is why the modular tree had only ever been exercised against hand-built
 * objects rather than against YAML.
 *
 * **Invariant-carrying.** The ADR-001 F-8 BLOCKING map rule lives *inside* the
 * map primitives, so every consumer inherits it and no consumer can forget it.
 * That is the current behaviour and the reason for it: when the rule was
 * instead re-applied per type, 8 of the 10 modular schemas applied it and both
 * `spec-subtree` modules did not — the distribution one deferred to "the
 * runtime injectiveDisjointMap" and the composition one did not reference it at
 * all, while no runtime call site existed anywhere. A rule that must be
 * remembered at every call site will eventually be forgotten at one.
 */
import { resolve } from "node:path";
import { z } from "zod";
import { containedWritePath, injectiveDisjointMap } from "../src/core/validators.js";
import { ObservationSchema, RelationSchema } from "../src/schemas/common.js";

/**
 * Integer tolerant of the string form `FAILSAFE_SCHEMA` produces.
 *
 * Deliberately narrower than `z.coerce.number()`, which accepts `""` as 0,
 * `" 12 "` as 12 and `"1e3"` as 1000 — re-widening exactly the coercion surface
 * FAILSAFE was chosen to close.
 */
export const yamlInt = z.union([z.number().int(), z.string().regex(/^-?\d+$/)]).transform(Number);

/** 1-indexed inclusive line range; `end: -1` means end-of-file (ADR-002 D-5). */
export const lineRangeSchema = z
  .object({
    start: yamlInt.refine((n) => n >= 1, { message: "start must be >= 1" }),
    end: yamlInt,
  })
  .refine((r) => r.end === -1 || r.end >= r.start, {
    message: "end must be >= start, or -1 for end-of-file",
  });

/**
 * A mutation map carrying the F-8 invariants intrinsically: injective (no two
 * keys onto one target) and disjoint (no value also appearing as a key).
 */
const f8Map = (fieldName: string) =>
  z.record(z.string().min(1), z.string().min(1)).superRefine(injectiveDisjointMap(fieldName));

export const renumberMapSchema = f8Map("renumber_map");
export const wikilinkMapSchema = f8Map("wikilink_map");

/**
 * Bare permalinks, old to new — the repoint executor's third identifier map.
 *
 * Its own primitive rather than an alias of `renumberMapSchema` so an F-8
 * violation names the field the author actually wrote. An alias would report a
 * `permalink_map` collision as a `renumber_map` collision and send the author
 * looking in the wrong half of the plan.
 */
export const permalinkMapSchema = f8Map("permalink_map");

/**
 * Section-fragment remap nested under the OLD entity ID that owned the section:
 * `{ "ANALYSIS-034": { "Section 6": "Section 3" } }`.
 *
 * Nested because `Section 6` means nothing on its own — a flat map would apply
 * one note's renumbering to another note's citations.
 *
 * Deliberately WITHOUT the F-8 invariants every map above carries. Those forbid
 * ambiguous chained single-pass replacement; a section renumber is legitimately
 * chained (delete section 3 and 4 becomes 3, 5 becomes 4), which disjointness
 * would reject, and a section merge is legitimately non-injective. Neither is
 * ambiguous for this consumer, which remaps by exact lookup against a finding's
 * already-parsed `sectionFragment` rather than by substituting over a file. The
 * identifier maps keep F-8 because their keys double as the identities being
 * repointed, so a key that is also a value is a genuinely unclear plan; a
 * fragment is a label inside one note and carries no such duality.
 */
export const sectionMapSchema = z.record(
  z.string().min(1),
  z.record(z.string().min(1), z.string().min(1)),
);

/** Frontmatter field replacements; not an identifier map, so no F-8 constraint. */
export const frontmatterMapSchema = z.record(z.string().min(1), z.string());

/**
 * Schema-level integrity-floor guard per DESIGN-002-SPEC-003 Component 2 / REQ-003 AC-1.
 * Limits regenerated_sections to a maximum of 10 entries — a heuristic that catches
 * obviously excessive declarations without requiring the source file. The runtime
 * 50%-line-coverage check (Component 3) is the second enforcement layer.
 */
export const regeneratedSectionsFloor = z
  .array(z.string())
  .refine((sections) => sections.length <= 10, {
    message:
      "regenerated_sections declares more than 10 sections; likely integrity bypass. Maximum 10 sections (enforced at schema level); runtime validates <=50% of source lines.",
  });

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

/**
 * The lexical half of the CWE-22 guard, as a predicate.
 *
 * `safePathSchema` is the Zod-facing form; this is the same rule for imperative
 * call sites that resolve a path outside a schema (the CLI path resolvers and
 * the subtree filename-rewrite guard). Exported so those sites IMPORT the rule
 * rather than re-stating it — three hand-rolled copies of this check were the
 * exact drift pattern the F-8 map rule already taught us to avoid.
 */
export function lexicalPathViolation(target: string): string | null {
  if (target.length === 0) return "empty path";
  if (target.startsWith("/") || /^[A-Z]:\\/i.test(target))
    return `absolute path rejected: ${target}`;
  if (target.split(/[/\\]/).includes("..")) return `path traversal rejected: ${target}`;
  return null;
}

/**
 * Path field rejecting traversal and absolute paths (CWE-22), applied to every
 * path in a plan. Deliberately SYNCHRONOUS: a Zod schema containing an async
 * refinement can only be used with `parseAsync`, and attaching containment here
 * would make every consumer of this primitive async-only — including the many
 * sync `safeParse` call sites that only care about shape.
 *
 * The realpath containment layer is applied once at the plan envelope instead,
 * via `withPathContainment` below, where `parseAsync` is guaranteed.
 */
export const safePathSchema = z
  .string()
  .min(1)
  // Delegates to the single predicate below — the Zod form and the imperative
  // form are the same rule, not two copies of it.
  .superRefine((v, ctx) => {
    const violation = lexicalPathViolation(v);
    if (violation !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `CWE-22: ${violation}`,
      });
    }
  });

/** Every path-shaped value in a plan envelope, for containment checking. */
function collectPlanPaths(plan: unknown): string[] {
  if (typeof plan !== "object" || plan === null) return [];
  const record = plan as Record<string, unknown>;
  const paths: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") paths.push(v);
  };
  push(record["source_path"]);
  push(record["target_path"]);
  for (const entry of Array.isArray(record["sources"]) ? record["sources"] : []) {
    if (typeof entry === "string") push(entry);
    else if (entry && typeof entry === "object") push((entry as Record<string, unknown>)["path"]);
  }
  const clusters = record["clusters"];
  if (clusters && typeof clusters === "object") {
    for (const cluster of Object.values(clusters as Record<string, unknown>)) {
      if (cluster && typeof cluster === "object") {
        push((cluster as Record<string, unknown>)["destination_path"]);
      }
    }
  }
  return paths;
}

/**
 * Assert every path in a plan envelope resolves inside the containment root
 * (CWE-22, ADR-002 D-5).
 *
 * Deliberately a standalone async check rather than a Zod refinement on the
 * schema. Attaching it to the schema would make the schema async-only —
 * breaking every synchronous `safeParse` consumer — and, wrapped generically,
 * would erase the inferred plan type. Containment also needs environment
 * configuration and filesystem access, which makes it a boundary concern rather
 * than a shape concern. Both CLI entry points call this immediately after
 * `parseAsync` and before any file I/O.
 *
 * Paths are resolved against `planDir` — the directory holding the plan file —
 * because that is exactly how the executor resolves them. Checking containment
 * against any other base would validate a different path than the one actually
 * written, which is a security check that checks nothing.
 *
 * Returns the offending paths; empty means contained (or no root configured).
 */
export async function findUncontainedPaths(plan: unknown, planDir: string): Promise<string[]> {
  if (!process.env["SKILLS_DOCS_ROOT"]) return [];
  const offenders: string[] = [];
  for (const declared of collectPlanPaths(plan)) {
    const issues: string[] = [];
    const ctx = {
      addIssue: (issue: { message?: string }) => issues.push(issue.message ?? "uncontained"),
    } as unknown as z.RefinementCtx;
    await containedWritePath(resolve(planDir, declared), ctx);
    if (issues.length > 0) offenders.push(declared);
  }
  return offenders;
}

/**
 * Scaffold strings are rendered into markdown structure, and scaffolding is
 * excluded from both byte proofs — so a malformed string is not caught by the
 * hash check, which deliberately does not look there.
 *
 * Line breaks are the injection vector: a title containing `\n---` closes the
 * frontmatter block early, and an observation containing `\n## Relations` forges
 * the final-two-sections structure. Neither corrupts the preserved slice, but
 * both produce a destination whose structure is not what the plan described,
 * which defeats rendering from structured fields at all.
 */
const SCAFFOLD_TEXT_MAX = 500;
const structuralText = (max: number = SCAFFOLD_TEXT_MAX) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((v) => !/[\r\n]/.test(v), {
      message: "must not contain line breaks (structural injection guard)",
    });

const scaffoldTag = structuralText(80).refine((v) => /^\S+$/.test(v), {
  message: "tags must not contain whitespace",
});

/**
 * Volume bound mirroring the regenerated_sections integrity floor. That rule
 * exists so a plan cannot declare so much content derived that hash validation
 * covers almost nothing; unbounded scaffolding is the same bypass from the other
 * side, since a destination that is mostly rendered scaffold carries a passing
 * proof that guarantees very little about the note a reader actually sees.
 */
/**
 * Neither observations nor relations carry a hard maximum, per the canonical
 * conventions. Observations: minimum three, unbounded above, H3 SUB-GROUPING
 * required past fifteen. Relations: minimum two, unbounded above, H3
 * TYPE-GROUPING required past twelve. Both thresholds are FORMATTING rules —
 * "structure this so it stays scannable" — not caps, and encoding either as a
 * `.max()` converts a formatting rule into content loss.
 *
 * The historical eight-relation cap was removed for exactly this reason: a note
 * that legitimately `contains` twenty children had to either drop edges or fake
 * them. The fifteen-observation cap was the same mistake against a CRIT that
 * legitimately tracks twenty findings.
 *
 * Tag counts DO keep their maxima (2-5 in frontmatter, 1-3 per observation).
 * Those are canonical bounds in their own right, not formatting thresholds.
 *
 * A count cap was a poor proxy for the integrity concern above in any case. What
 * that concern is really about is the RATIO of rendered scaffold to preserved
 * content: a destination that is mostly scaffold carries a proof that guarantees
 * little. Ten relations on a two-line slice is that bypass; thirty relations on
 * a two-thousand-line slice is not. The count is not the ratio, and the schema
 * layer cannot see the ratio because it validates the plan before any content is
 * extracted. `decompose.ts` already computes `scaffold_bytes` per destination,
 * which is where a real ratio guard belongs.
 */

export const ClusterScaffoldSchema = z
  .object({
    frontmatter: z
      .object({
        title: structuralText(),
        type: structuralText(80),
        status: structuralText(80),
        permalink: structuralText(300),
        tags: z.array(scaffoldTag).min(1).max(10),
      })
      .strict(),
    observations: z
      .array(
        ObservationSchema.extend({
          text: structuralText(),
          tags: z.array(scaffoldTag).min(1).max(3),
        }),
      )
      .min(1),
    relations: z.array(RelationSchema.extend({ target: structuralText() })).min(1),
  })
  .strict();

/**
 * Disposition of a cluster's line range. `write` produces a destination file;
 * `retain` is counted by the coverage proof but written nowhere, letting a split
 * account for every source byte without forcing the source's own frontmatter and
 * trailing sections verbatim into a child note.
 */
export const dispositionEnum = z.enum(["write", "retain"]);

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
