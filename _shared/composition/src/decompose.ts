#!/usr/bin/env bun
/**
 * /decompose CLI entry point per DESIGN-001-SPEC-005 Component 3.
 *
 * Pipeline:
 *   1. Parse argv for --plan <path>
 *   2. Read the YAML file with a 1 MB size guard (CWE-400 mitigation)
 *   3. Parse with js-yaml FAILSAFE_SCHEMA (CWE-502 mitigation)
 *   4. Validate via DistributionPlanSchema.parseAsync (CWE-22 boundary + bijection)
 *   5. Dispatch to the adapter via getAdapter(source_type)
 *   6. Apply mutations, hash-validate via reverseMutations identity, write
 *      via temp-then-rename atomic write per ADR-001 F-8
 *   7. Emit a JSON-lines audit log to stdout (one line per destination)
 *
 * Exit codes:
 *   0 = success
 *   1 = validation error (invalid argv, missing file, Zod failure)
 *   2 = hash mismatch (round-trip identity failed)
 */
import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import yaml from "js-yaml";
import { ZodError } from "zod";
import { cleanup, rename, stage } from "./core/atomic-write.js";
import { sha256 } from "./core/hash.js";
import { getAdapter } from "./registry.js";
import {
  DistributionPlanSchema,
  PlanValidationError,
  zodErrorToIssues,
} from "./schemas/plan-yaml.js";

const MAX_PLAN_BYTES = 1024 * 1024; // 1 MB per ADR-001 Confirmation

interface ParsedArgs {
  planPath: string;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const planFlagIndex = argv.indexOf("--plan");
  if (planFlagIndex < 0 || planFlagIndex >= argv.length - 1) {
    throw new PlanValidationError("Usage: decompose.ts --plan <path-to-plan.yaml>", [
      { path: "<argv>", message: "missing or malformed --plan argument" },
    ]);
  }
  const planPath = argv[planFlagIndex + 1];
  if (!planPath || planPath.startsWith("-")) {
    throw new PlanValidationError("Usage: decompose.ts --plan <path-to-plan.yaml>", [
      { path: "<argv>", message: "missing or malformed --plan argument" },
    ]);
  }
  return { planPath };
}

export async function loadPlanYaml(planPath: string): Promise<unknown> {
  if (!existsSync(planPath)) {
    throw new PlanValidationError(`plan file not found: ${planPath}`, [
      { path: planPath, message: "file does not exist" },
    ]);
  }
  const size = statSync(planPath).size;
  if (size > MAX_PLAN_BYTES) {
    throw new PlanValidationError(`plan file exceeds 1 MB size guard (${size} bytes)`, [
      { path: planPath, message: `size ${size} > ${MAX_PLAN_BYTES}` },
    ]);
  }
  const text = await Bun.file(planPath).text();
  // FAILSAFE_SCHEMA prevents YAML bombs and type coercion attacks
  return yaml.load(text, { schema: yaml.FAILSAFE_SCHEMA });
}

export interface DecomposeAuditEntry {
  source_path: string;
  source_type: string;
  cluster_id: string;
  destination_path: string;
  destination_sha256: string;
}

/**
 * Execute a validated distribution plan. Returns the audit-log entries; the
 * CLI wrapper emits them as JSON-lines to stdout.
 *
 * The minimum-viable per-cluster pipeline applies the plan's renumber_map and
 * wikilink_map mutations to the full source content (extractByRange is
 * deferred to per-cluster `range` once adapters define it; the SHA-256 round
 * trip identity holds because we still call reverseMutations as the validator).
 */
export async function executeDistributionPlan(
  plan: ReturnType<typeof DistributionPlanSchema.parse>,
  planPath: string,
): Promise<DecomposeAuditEntry[]> {
  let adapter: ReturnType<typeof getAdapter>;
  try {
    adapter = getAdapter(plan.source_type);
  } catch (err) {
    throw new PlanValidationError((err as Error).message, [
      { path: "source_type", message: (err as Error).message },
    ]);
  }
  const sourceAbs = resolveRelativeToPlan(plan.source_path, planPath);
  if (!existsSync(sourceAbs)) {
    throw new PlanValidationError(`source_path not found: ${sourceAbs}`, [
      { path: "source_path", message: `file does not exist: ${sourceAbs}` },
    ]);
  }
  const sourceContent = await Bun.file(sourceAbs).text();

  const mutations = {
    renumber_map: plan.renumber_map,
    wikilink_map: plan.wikilink_map,
  } as const;

  const mutated = adapter.applyMutations(sourceContent, mutations);
  // Hash-validate per ADR-001 F-8: reverse must recover the original byte-for-byte.
  const recovered = adapter.reverseMutations(mutated, mutations);
  if (sha256(recovered) !== sha256(sourceContent)) {
    const err = new Error(
      `hash mismatch: reverseMutations(applyMutations(source)) !== source for ${sourceAbs}`,
    );
    (err as Error & { code?: number }).code = 2;
    throw err;
  }

  const audit: DecomposeAuditEntry[] = [];
  const clusters = plan.clusters ?? {};
  const clusterIds = Object.keys(clusters);
  // If no clusters declared, the plan is a degenerate single-output renumber
  // applied to the source path itself (rare but supported by the schema).
  if (clusterIds.length === 0) {
    const destPath = sourceAbs;
    await stage(destPath, mutated);
    rename(destPath);
    audit.push({
      source_path: plan.source_path,
      source_type: plan.source_type,
      cluster_id: "<self>",
      destination_path: destPath,
      destination_sha256: sha256(mutated),
    });
    return audit;
  }

  for (const clusterId of clusterIds) {
    const cluster = clusters[clusterId];
    if (!cluster) continue;
    const destRel = cluster.destination_path ?? `${sourceAbs}.${clusterId}.md`;
    const destAbs = resolveRelativeToPlan(destRel, planPath);
    try {
      await stage(destAbs, mutated);
      rename(destAbs);
      audit.push({
        source_path: plan.source_path,
        source_type: plan.source_type,
        cluster_id: clusterId,
        destination_path: destAbs,
        destination_sha256: sha256(mutated),
      });
    } catch (err) {
      cleanup(destAbs);
      throw err;
    }
  }
  return audit;
}

function resolveRelativeToPlan(target: string, planPath: string): string {
  if (target.startsWith("/")) return target;
  const planDir = dirname(resolve(planPath));
  return resolve(planDir, target);
}

export async function main(argv: readonly string[]): Promise<number> {
  try {
    const { planPath } = parseArgs(argv);
    const raw = await loadPlanYaml(planPath);
    const plan = await DistributionPlanSchema.parseAsync(raw).catch((err: unknown) => {
      if (err instanceof ZodError) {
        throw new PlanValidationError(
          `plan YAML failed schema validation: ${planPath}`,
          zodErrorToIssues(err),
        );
      }
      throw err;
    });
    const entries = await executeDistributionPlan(plan, planPath);
    for (const entry of entries) {
      process.stdout.write(`${JSON.stringify(entry)}\n`);
    }
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

// Bun-native shebang execution check
if (import.meta.main) {
  const exit = await main(process.argv.slice(2));
  process.exit(exit);
}
