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
 *   6. Partition the source by each cluster's line range, prove byte
 *      accountability, apply mutations per cluster, stage every destination,
 *      hash-validate all, then rename all per ADR-001 F-8
 *   7. Emit a JSON-lines audit log to stdout (one line per destination)
 *
 * Exit codes:
 *   0 = success
 *   1 = validation error (invalid argv, missing file, Zod failure, cluster
 *       without a line range)
 *   2 = integrity failure — the partition does not account for every source
 *       byte, or a per-cluster round-trip hash mismatch. Nothing is renamed.
 */
// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
// All file I/O below is Bun-native: Bun.file for reads/probes, Bun.write to stage.
import { dirname, resolve } from "node:path";
import yaml from "js-yaml";
import { ZodError } from "zod";
import { cleanup, clusterAtomicRename, rename, stage } from "./core/atomic-write.js";
import { rollbackCluster, validateSubtreeHashes } from "./core/cluster-rollback.js";
import {
  type ClusterScaffold,
  assembleScaffolded,
  stripScaffold,
} from "./core/cluster-scaffold.js";
import { sha256 } from "./core/hash.js";
import {
  type ClusterRange,
  type PartitionSegment,
  buildPartition,
  verifyCoverage,
} from "./core/partition.js";
import type { RenumberMap, WikilinkMap } from "./core/types.js";
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
  const planFile = Bun.file(planPath);
  if (!(await planFile.exists())) {
    throw new PlanValidationError(`plan file not found: ${planPath}`, [
      { path: planPath, message: "file does not exist" },
    ]);
  }
  // Bun.file().size reads metadata only — the 1 MB guard still runs before any
  // content is loaded, preserving the CWE-400 mitigation ordering.
  const size = planFile.size;
  if (size > MAX_PLAN_BYTES) {
    throw new PlanValidationError(`plan file exceeds 1 MB size guard (${size} bytes)`, [
      { path: planPath, message: `size ${size} > ${MAX_PLAN_BYTES}` },
    ]);
  }
  const text = await planFile.text();
  // FAILSAFE_SCHEMA prevents YAML bombs and type coercion attacks
  return yaml.load(text, { schema: yaml.FAILSAFE_SCHEMA });
}

export interface DecomposeAuditEntry {
  source_path: string;
  source_type: string;
  cluster_id: string;
  /**
   * Present for every written destination; absent only for a retained cluster,
   * which by definition produces no file. Existing consumers reading the audit
   * for written destinations are unaffected.
   */
  destination_path?: string;
  destination_sha256?: string;
  /** `retain` clusters are counted for coverage but never written. */
  disposition?: "write" | "retain";
  /** Line range extracted for this cluster; absent on the degenerate path. */
  range?: { start: number; end: number };
  /** SHA-256 of the pre-mutation source extraction (S in the F-8 protocol). */
  source_segment_sha256?: string;
}

type DistributionPlanParsed = ReturnType<typeof DistributionPlanSchema.parse>;
type Mutations = { renumber_map: RenumberMap; wikilink_map: WikilinkMap };

/** Integrity failure that maps to exit code 2 (nothing was renamed). */
function integrityError(message: string): Error {
  const err = new Error(message);
  (err as Error & { code?: number }).code = 2;
  return err;
}

/**
 * Execute a validated distribution plan. Returns the audit-log entries; the
 * CLI wrapper emits them as JSON-lines to stdout.
 *
 * Per-cluster pipeline per DESIGN-001-SPEC-005 Component 3 and the ADR-001 F-8
 * hash protocol:
 *
 *   1. Extract S_i for every cluster by its plan line range, in range order.
 *   2. Prove byte accountability — the segments must reconstruct the source
 *      exactly, so no content is dropped or duplicated by the split. This is
 *      the partitioned successor to the whole-content round trip, and the
 *      executor-level statement of REQ-006-SPEC-005 AC-2 (recompose merges
 *      with `join("")`, so the shards must concatenate back to the source).
 *   3. Apply mutations to each segment and stage every destination to `.tmp`.
 *   4. Hash-validate ALL staged destinations: reverseMutations(D_i) must equal
 *      S_i for every cluster.
 *   5. Only then rename all — per-cluster all-or-nothing. Any failure removes
 *      every `.tmp` and leaves the source untouched.
 *
 * The source note is never modified on a clustered split; disposition of the
 * original is the caller's decision (decompose SKILL.md Step 6 reports that the
 * source remains unchanged).
 */
export async function executeDistributionPlan(
  plan: DistributionPlanParsed,
  planPath: string,
): Promise<DecomposeAuditEntry[]> {
  const adapter = resolveAdapter(plan.source_type);
  const sourceAbs = resolveRelativeToPlan(plan.source_path, planPath);
  const sourceFile = Bun.file(sourceAbs);
  if (!(await sourceFile.exists())) {
    throw new PlanValidationError(`source_path not found: ${sourceAbs}`, [
      { path: "source_path", message: `file does not exist: ${sourceAbs}` },
    ]);
  }
  const sourceContent = await sourceFile.text();
  const mutations: Mutations = {
    renumber_map: plan.renumber_map,
    wikilink_map: plan.wikilink_map,
  };

  const clusters = plan.clusters ?? {};
  if (Object.keys(clusters).length === 0) {
    return [await executeRenumberInPlace(adapter, plan, sourceAbs, sourceContent, mutations)];
  }
  return executePartition(adapter, plan, planPath, sourceAbs, sourceContent, mutations);
}

function resolveAdapter(sourceType: string): ReturnType<typeof getAdapter> {
  try {
    return getAdapter(sourceType);
  } catch (err) {
    throw new PlanValidationError((err as Error).message, [
      { path: "source_type", message: (err as Error).message },
    ]);
  }
}

/**
 * Degenerate zero-cluster plan: a whole-file renumber written back over the
 * source. Retains the original whole-content round-trip check because here the
 * single destination IS the entire source.
 */
async function executeRenumberInPlace(
  adapter: ReturnType<typeof getAdapter>,
  plan: DistributionPlanParsed,
  sourceAbs: string,
  sourceContent: string,
  mutations: Mutations,
): Promise<DecomposeAuditEntry> {
  const mutated = adapter.applyMutations(sourceContent, mutations);
  const recovered = adapter.reverseMutations(mutated, mutations);
  if (sha256(recovered) !== sha256(sourceContent)) {
    throw integrityError(
      `hash mismatch: reverseMutations(applyMutations(source)) !== source for ${sourceAbs}`,
    );
  }
  try {
    await stage(sourceAbs, mutated);
    rename(sourceAbs);
  } catch (err) {
    await cleanup(sourceAbs);
    throw err;
  }
  return {
    source_path: plan.source_path,
    source_type: plan.source_type,
    cluster_id: "<self>",
    destination_path: sourceAbs,
    destination_sha256: sha256(mutated),
  };
}

/** Collect each cluster's declared line range, refusing under-specified plans. */
function collectClusterRanges(plan: DistributionPlanParsed): ClusterRange[] {
  const clusters = plan.clusters ?? {};
  const ranges: ClusterRange[] = [];
  for (const [clusterId, cluster] of Object.entries(clusters)) {
    if (!cluster) continue;
    if (!cluster.range) {
      // The adapter contract (ADR-002 D-2) exposes extractByRange only; there
      // is no identifier-driven extraction path to fall back on.
      throw new PlanValidationError(
        `cluster "${clusterId}" declares no line range; per-cluster extraction requires range.start/range.end`,
        [
          {
            path: `clusters.${clusterId}.range`,
            message: "required for per-cluster extraction (identifiers alone are not extractable)",
          },
        ],
      );
    }
    ranges.push({ clusterId, range: cluster.range });
  }
  return ranges;
}

async function executePartition(
  adapter: ReturnType<typeof getAdapter>,
  plan: DistributionPlanParsed,
  planPath: string,
  sourceAbs: string,
  sourceContent: string,
  mutations: Mutations,
): Promise<DecomposeAuditEntry[]> {
  const clusters = plan.clusters ?? {};
  const segments = buildPartition(
    (content, range) => adapter.extractByRange(content, range),
    sourceContent,
    collectClusterRanges(plan),
  );

  const coverage = verifyCoverage(sourceContent, segments);
  if (!coverage.complete) {
    throw integrityError(
      `partition does not account for every byte of ${sourceAbs}: ${coverage.defects.join("; ")} ` +
        `(source ${coverage.sourceSha256}, reconstructed ${coverage.reconstructedSha256})`,
    );
  }

  // Retained clusters are proven by the coverage check above but produce no file;
  // only written clusters proceed to staging.
  const written = segments
    .filter((segment) => clusters[segment.clusterId]?.disposition !== "retain")
    .map((segment) => {
      const cluster = clusters[segment.clusterId];
      const destRel = cluster?.destination_path ?? `${plan.source_path}.${segment.clusterId}.md`;
      const mutatedBody = adapter.applyMutations(segment.content, mutations);
      const scaffold = cluster?.scaffold;
      return {
        segment,
        scaffold,
        destAbs: resolveRelativeToPlan(destRel, planPath),
        mutatedBody,
        // Scaffolding wraps the hashed body; it is never part of the hash scope.
        fileContent: scaffold ? assembleScaffolded(scaffold, mutatedBody) : mutatedBody,
      };
    });

  const tmpPaths = written.map((s) => `${s.destAbs}.tmp`);
  try {
    await Promise.all(written.map((s) => stage(s.destAbs, s.fileContent)));
    verifyStagedHashes(adapter, written, mutations);
    await clusterAtomicRename(written.map((s) => s.destAbs));
  } catch (err) {
    await rollbackCluster(tmpPaths, []);
    throw err;
  }

  const writtenById = new Map(written.map((s) => [s.segment.clusterId, s]));
  return segments.map((segment) => {
    const entry = writtenById.get(segment.clusterId);
    const audit: DecomposeAuditEntry = {
      source_path: plan.source_path,
      source_type: plan.source_type,
      cluster_id: segment.clusterId,
      disposition: entry ? "write" : "retain",
      range: { start: segment.range.start, end: segment.range.end },
      source_segment_sha256: sha256(segment.content),
    };
    if (entry) {
      audit.destination_path = entry.destAbs;
      audit.destination_sha256 = sha256(entry.fileContent);
    }
    return audit;
  });
}

/** One staged destination awaiting hash validation. */
interface StagedDestination {
  segment: PartitionSegment;
  scaffold: ClusterScaffold | undefined;
  destAbs: string;
  mutatedBody: string;
  fileContent: string;
}

/**
 * Run the ADR-001 F-8 comparison over every staged destination.
 *
 * Scaffolded destinations are de-scaffolded first: the planned prologue/epilogue
 * are re-derived and verified against the staged bytes, then removed, so the
 * comparison subject is the content slice alone. Over that slice the check is
 * byte-for-byte as strong as it is for an unscaffolded destination.
 */
function verifyStagedHashes(
  adapter: ReturnType<typeof getAdapter>,
  written: readonly StagedDestination[],
  mutations: Mutations,
): void {
  const forValidation = written.map((s) => {
    if (!s.scaffold) {
      return {
        filePath: s.destAbs,
        sourceContent: s.segment.content,
        stagedContent: s.fileContent,
        mutations,
      };
    }
    const stripped = stripScaffold(s.scaffold, s.fileContent);
    if (!stripped.ok) {
      throw integrityError(`scaffold verification failed for ${s.destAbs}: ${stripped.reason}`);
    }
    return {
      filePath: s.destAbs,
      sourceContent: s.segment.content,
      stagedContent: stripped.body,
      mutations,
    };
  });

  const validation = validateSubtreeHashes(adapter, forValidation);
  if (validation.allPass) return;
  const failure = validation.firstFailure;
  throw integrityError(
    `hash mismatch for cluster destination ${failure?.filePath ?? "<unknown>"}: ` +
      `source ${failure?.sourceHash ?? "?"} !== reversed ${failure?.reversedHash ?? "?"}`,
  );
}

function resolveRelativeToPlan(target: string, planPath: string): string {
  if (target.startsWith("/") || /^[A-Z]:\\/i.test(target)) {
    throw new PlanValidationError("Absolute paths not allowed in plan YAML (CWE-22)", [
      { path: "path", message: `Absolute path rejected: ${target}` },
    ]);
  }
  if (target.split(/[/\\]/).includes("..")) {
    throw new PlanValidationError("Path traversal not allowed in plan YAML (CWE-22)", [
      { path: "path", message: `Path traversal rejected: ${target}` },
    ]);
  }
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
