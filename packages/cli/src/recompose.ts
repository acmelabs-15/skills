#!/usr/bin/env bun
/**
 * /recompose CLI entry point per DESIGN-001-SPEC-005 Component 4.
 *
 * Mirror of decompose.ts: loads + validates a composition plan YAML, dispatches
 * to the adapter, reads N sources (or 1 with renumber-only), applies the
 * `renumber_map`/`wikilink_map` mutations to merged content, validates round
 * trip via reverseMutations identity, then writes the singular target via
 * temp-then-rename atomic write.
 *
 * Exit codes match decompose.ts:
 *   0 = success
 *   1 = validation error
 *   2 = hash mismatch
 */
// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
// All file I/O below is Bun-native: Bun.file for reads/probes, Bun.write to stage.
import { dirname, resolve } from "node:path";
import { cleanup, rename, stage } from "@acmelabs/core/core/atomic-write";
import { stripScaffold } from "@acmelabs/core/core/cluster-scaffold";
import { sha256 } from "@acmelabs/core/core/hash";
import {
  CompositionPlanSchema,
  PlanValidationError,
  zodErrorToIssues,
} from "@acmelabs/core/schemas/plan-yaml";
import yaml from "js-yaml";
import { ZodError } from "zod";
import { findUncontainedPaths, lexicalPathViolation } from "../../core/src/schemas/base.js";
import { invokedName } from "./invoked-name.ts";
import { getAdapter } from "./registry.js";

const MAX_PLAN_BYTES = 1024 * 1024;

interface ParsedArgs {
  planPath: string;
  /**
   * Base directory that plan-relative paths resolve against. Defaults to the
   * plan file's own directory.
   *
   * Exists because ADR-001 F-7 LOCKS plans to `docs/_restructure/` while
   * destinations live in sibling directories like `docs/decisions/` — reaching
   * them from the plan's directory needs `../`, which the CWE-22 guard rejects.
   * Supplying the base from the CALLER rather than from the plan keeps that
   * guard intact on the untrusted document: an LLM-authored plan still cannot
   * contain `..`, and cannot redirect its own resolution base.
   */
  root?: string;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const planFlagIndex = argv.indexOf("--plan");
  if (planFlagIndex < 0 || planFlagIndex >= argv.length - 1) {
    throw new PlanValidationError(
      `Usage: ${invokedName("recompose.ts")} --plan <path-to-plan.yaml>`,
      [{ path: "<argv>", message: "missing or malformed --plan argument" }],
    );
  }
  const planPath = argv[planFlagIndex + 1];
  if (!planPath || planPath.startsWith("-")) {
    throw new PlanValidationError(
      `Usage: ${invokedName("recompose.ts")} --plan <path-to-plan.yaml>`,
      [{ path: "<argv>", message: "missing or malformed --plan argument" }],
    );
  }
  const rootFlagIndex = argv.indexOf("--root");
  const root =
    rootFlagIndex >= 0 && rootFlagIndex < argv.length - 1 ? argv[rootFlagIndex + 1] : undefined;
  if (rootFlagIndex >= 0 && (root === undefined || root.startsWith("-"))) {
    throw new PlanValidationError(
      `Usage: ${invokedName("recompose.ts")} --plan <path> [--root <dir>]`,
      [{ path: "<argv>", message: "--root given without a directory" }],
    );
  }
  return root === undefined ? { planPath } : { planPath, root };
}

export async function loadPlanYaml(planPath: string): Promise<unknown> {
  const planFile = Bun.file(planPath);
  if (!(await planFile.exists())) {
    throw new PlanValidationError(`plan file not found: ${planPath}`, [
      { path: planPath, message: "file does not exist" },
    ]);
  }
  // Metadata-only read; the 1 MB guard still precedes any content load.
  const size = planFile.size;
  if (size > MAX_PLAN_BYTES) {
    throw new PlanValidationError(`plan file exceeds 1 MB size guard (${size} bytes)`, [
      { path: planPath, message: `size ${size} > ${MAX_PLAN_BYTES}` },
    ]);
  }
  const text = await planFile.text();
  return yaml.load(text, { schema: yaml.FAILSAFE_SCHEMA });
}

export interface RecomposeAuditEntry {
  sources: string[];
  source_type: string;
  target_path: string;
  target_sha256: string;
}

export async function executeCompositionPlan(
  plan: ReturnType<typeof CompositionPlanSchema.parse>,
  planPath: string,
  root?: string,
): Promise<RecomposeAuditEntry> {
  let adapter: ReturnType<typeof getAdapter>;
  try {
    adapter = getAdapter(plan.source_type);
  } catch (err) {
    throw new PlanValidationError((err as Error).message, [
      { path: "source_type", message: (err as Error).message },
    ]);
  }
  const targetAbs = resolveRelativeToPlan(plan.target_path, planPath, root);
  const sources = (plan.sources ?? [plan.target_path]).map((entry) =>
    typeof entry === "string" ? { path: entry } : entry,
  );
  const sourceAbsPaths = sources.map((s) => resolveRelativeToPlan(s.path, planPath, root));

  const sourceFiles = sourceAbsPaths.map((p) => Bun.file(p));
  const presence = await Promise.all(sourceFiles.map((f) => f.exists()));
  const missingIndex = presence.indexOf(false);
  if (missingIndex >= 0) {
    const missing = sourceAbsPaths[missingIndex];
    throw new PlanValidationError(`source not found: ${missing}`, [
      { path: "sources", message: `file does not exist: ${missing}` },
    ]);
  }

  const rawContents = await Promise.all(sourceFiles.map((f) => f.text()));
  // Shards written by a scaffolded decompose carry a prologue/epilogue that is
  // derived content, not preserved source. Strip exactly the planned scaffolding
  // so the join operates on content slices — the inverse of assembleScaffolded.
  const contents = rawContents.map((content, i) => {
    const scaffold = sources[i]?.scaffold;
    if (!scaffold) return content;
    const stripped = stripScaffold(scaffold, content);
    if (!stripped.ok) {
      const err = new Error(
        `scaffold verification failed for ${sourceAbsPaths[i]}: ${stripped.reason}`,
      );
      (err as Error & { code?: number }).code = 2;
      throw err;
    }
    return stripped.body;
  });
  // Join in declared order. For the single-source identity case this is just
  // the file's content unchanged before mutation.
  const merged = contents.join("");

  const mutations = {
    renumber_map: plan.renumber_map,
    wikilink_map: plan.wikilink_map,
  } as const;

  const mutated = adapter.applyMutations(merged, mutations);
  const recovered = adapter.reverseMutations(mutated, mutations);
  if (sha256(recovered) !== sha256(merged)) {
    const err = new Error(
      `hash mismatch: reverseMutations(applyMutations(merged)) !== merged for target ${targetAbs}`,
    );
    (err as Error & { code?: number }).code = 2;
    throw err;
  }

  try {
    await stage(targetAbs, mutated);
    rename(targetAbs);
  } catch (err) {
    await cleanup(targetAbs);
    throw err;
  }

  return {
    sources: sourceAbsPaths,
    source_type: plan.source_type,
    target_path: targetAbs,
    target_sha256: sha256(mutated),
  };
}

function resolveRelativeToPlan(target: string, planPath: string, root?: string): string {
  // Imports the shared lexical rule rather than re-stating it; the realpath
  // containment layer runs separately at the plan-load boundary.
  const violation = lexicalPathViolation(target);
  if (violation !== null) {
    throw new PlanValidationError(`Unsafe path in plan YAML (CWE-22): ${violation}`, [
      { path: "path", message: violation },
    ]);
  }
  const base = root !== undefined ? resolve(root) : dirname(resolve(planPath));
  return resolve(base, target);
}

export async function main(argv: readonly string[]): Promise<number> {
  try {
    const { planPath, root } = parseArgs(argv);
    const raw = await loadPlanYaml(planPath);
    const plan = await CompositionPlanSchema.parseAsync(raw).catch((err: unknown) => {
      if (err instanceof ZodError) {
        throw new PlanValidationError(
          `plan YAML failed schema validation: ${planPath}`,
          zodErrorToIssues(err),
        );
      }
      throw err;
    });

    // CWE-22 boundary (ADR-002 D-5): resolve symlinks and confirm every plan
    // path stays inside the containment root, before any file is touched.
    const uncontained = await findUncontainedPaths(
      plan,
      root !== undefined ? resolve(root) : dirname(resolve(planPath)),
    );
    if (uncontained.length > 0) {
      throw new PlanValidationError(
        `plan paths resolve outside the allowed docs root: ${uncontained.join(", ")}`,
        uncontained.map((p) => ({
          path: p,
          message: "resolves outside SKILLS_DOCS_ROOT (CWE-22)",
        })),
      );
    }
    const entry = await executeCompositionPlan(plan, planPath, root);
    process.stdout.write(`${JSON.stringify(entry)}\n`);
    return 0;
  } catch (err) {
    if (err instanceof PlanValidationError) {
      process.stderr.write(
        `${JSON.stringify({ error: "PlanValidationError", message: err.message, issues: err.issues })}\n`,
      );
      return 1;
    }
    const code = (err as { code?: number })?.code;
    if (code === 2) {
      process.stderr.write(
        `${JSON.stringify({ error: "HashMismatch", message: (err as Error).message })}\n`,
      );
      return 2;
    }
    process.stderr.write(
      `${JSON.stringify({ error: "UnexpectedError", message: (err as Error).message ?? String(err) })}\n`,
    );
    return 1;
  }
}

if (import.meta.main) {
  const exit = await main(process.argv.slice(2));
  process.exit(exit);
}
