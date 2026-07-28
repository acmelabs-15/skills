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
import { findUncontainedPaths, lexicalPathViolation } from "../schemas/base.js";
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
import type { MutationSpec, RenumberMap, WikilinkMap } from "./core/types.js";
import { getAdapter } from "./registry.js";
import {
  DistributionPlanSchema,
  PlanValidationError,
  zodErrorToIssues,
} from "./schemas/plan-yaml.js";

const MAX_PLAN_BYTES = 1024 * 1024; // 1 MB per ADR-001 Confirmation

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
  const rootFlagIndex = argv.indexOf("--root");
  const root =
    rootFlagIndex >= 0 && rootFlagIndex < argv.length - 1 ? argv[rootFlagIndex + 1] : undefined;
  if (rootFlagIndex >= 0 && (root === undefined || root.startsWith("-"))) {
    throw new PlanValidationError("Usage: decompose.ts --plan <path> [--root <dir>]", [
      { path: "<argv>", message: "--root given without a directory" },
    ]);
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
  /**
   * Which destination bytes are preserved source vs rendered scaffolding.
   * `verbatim` — the whole file is the checksummed content slice.
   * `scaffolded` — prologue/epilogue were rendered around it and excluded from
   * the hash scope; `scaffold_bytes` records how much of the file that was.
   */
  scaffold_provenance?: "verbatim" | "scaffolded";
  scaffold_bytes?: number;
  /**
   * The exact scaffold applied, so a composition plan that recovers this shard
   * can be reconstructed FROM the audit log rather than re-authored by hand.
   * Recovery of a scaffolded shard is conditional on the composition plan
   * restating a byte-identical scaffold; recording it here is what makes that
   * condition satisfiable after the fact.
   */
  scaffold?: ClusterScaffold;
  /**
   * SHA-256 of the checksummed content slice AFTER mutation — the subject of the
   * F-8 comparison. Distinct from `destination_sha256`, which covers the whole
   * written file including rendered scaffolding.
   */
  body_sha256?: string;
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
 * original is the caller's decision (decompose SKILL.md Step 7 reports that the
 * source remains unchanged).
 */
export async function executeDistributionPlan(
  plan: DistributionPlanParsed,
  planPath: string,
  root?: string,
): Promise<DecomposeAuditEntry[]> {
  const adapter = resolveAdapter(plan.source_type);
  const sourceAbs = resolveRelativeToPlan(plan.source_path, planPath, root);
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
  return executePartition(adapter, plan, planPath, sourceAbs, sourceContent, mutations, root);
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
        `cluster "${clusterId}" declares no line range; extraction is range-driven. The identifiers/decisions/renumbered_to fields are annotation and cross-check only — they cannot locate content on their own`,
        [
          {
            path: `clusters.${clusterId}.range`,
            message:
              "required for per-cluster extraction; identifiers are cross-checked against the extracted slice, never used to find it",
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
  root?: string,
): Promise<DecomposeAuditEntry[]> {
  const clusters = plan.clusters ?? {};
  const segments = buildPartition(
    (content, range) => adapter.extractByRange(content, range),
    sourceContent,
    collectClusterRanges(plan),
  );

  // GAP-1 resolution (c): `identifiers` are annotation, not an extraction
  // mechanism — but where a plan supplies them they are worth spending as a
  // post-extraction cross-check. A declared identifier missing from its slice
  // means the range drifted off the section the author meant, which the
  // coverage proof cannot see (a wrong-but-contiguous partition still covers
  // every byte). Checked before any staging.
  for (const segment of segments) {
    const declared = clusters[segment.clusterId]?.identifiers ?? [];
    const missing = declared.filter((id) => !segment.content.includes(id));
    if (missing.length > 0) {
      throw new PlanValidationError(
        `cluster "${segment.clusterId}" declares identifiers absent from its line range: ${missing.join(", ")}`,
        missing.map((id) => ({
          path: `clusters.${segment.clusterId}.identifiers`,
          message: `"${id}" does not appear in lines ${segment.range.start}-${segment.range.end === -1 ? "EOF" : segment.range.end}`,
        })),
      );
    }
  }

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
      // Per-cluster overrides layer onto the plan-level maps, making D-2's
      // frontmatter_map and D-5's regenerated_sections reachable per cluster.
      const clusterMutations: MutationSpec = {
        ...mutations,
        ...(cluster?.frontmatter_map ? { frontmatter_map: cluster.frontmatter_map } : {}),
        ...(cluster?.regenerated_sections
          ? { regenerated_sections: cluster.regenerated_sections }
          : {}),
      };
      const mutatedBody = adapter.applyMutations(segment.content, clusterMutations);
      const scaffold = cluster?.scaffold;
      return {
        segment,
        scaffold,
        mutations: clusterMutations,
        destAbs: resolveRelativeToPlan(destRel, planPath, root),
        mutatedBody,
        // Scaffolding wraps the hashed body; it is never part of the hash scope.
        fileContent: scaffold ? assembleScaffolded(scaffold, mutatedBody) : mutatedBody,
      };
    });

  const tmpPaths = written.map((s) => `${s.destAbs}.tmp`);
  try {
    await Promise.all(written.map((s) => stage(s.destAbs, s.fileContent)));
    verifyStagedHashes(adapter, written);
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
      audit.scaffold_provenance = entry.scaffold ? "scaffolded" : "verbatim";
      audit.scaffold_bytes = entry.fileContent.length - entry.mutatedBody.length;
      audit.body_sha256 = sha256(entry.mutatedBody);
      if (entry.scaffold) audit.scaffold = entry.scaffold;
    }
    return audit;
  });
}

/** One staged destination awaiting hash validation. */
interface StagedDestination {
  segment: PartitionSegment;
  scaffold: ClusterScaffold | undefined;
  mutations: MutationSpec;
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
): void {
  const forValidation = written.map((s) => {
    if (!s.scaffold) {
      return {
        filePath: s.destAbs,
        sourceContent: s.segment.content,
        stagedContent: s.fileContent,
        mutations: s.mutations,
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
      mutations: s.mutations,
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
    const plan = await DistributionPlanSchema.parseAsync(raw).catch((err: unknown) => {
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
    const entries = await executeDistributionPlan(plan, planPath, root);
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
