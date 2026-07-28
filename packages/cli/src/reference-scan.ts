#!/usr/bin/env bun
/**
 * Inbound-reference impact scanner CLI.
 *
 * Two modes over one module:
 *
 *   scan  — enumerate every inbound reference to the declared targets and emit
 *           an impact manifest. This is the plan-time step: run it BEFORE a
 *           decompose or recompose so the repointing worklist is part of the
 *           plan rather than a discovery made during review.
 *   check — re-scan against a prior manifest and report closure. This is the
 *           execution-time step: failure to reach closure is a finding to
 *           surface, never a silent pass.
 *
 * Both modes use ONE discovery mechanism — the two-stage funnel — and there is no
 * tree-walking alternative to fall back to:
 *
 *   stage one   ask the complete-retrieval search surface which notes reference
 *               the targets. `--references` covers wikilink edges, `--exhaustive`
 *               covers bare-text mentions, and one exhaustive query per declared
 *               alias covers retired identities no query on the current identity
 *               can reach. Each query reports whether its own set is provably
 *               complete, and the manifest records the AND of those claims.
 *   stage two   open ONLY those notes and produce exact `line:column` findings.
 *               No search response carries a line or a column, so the file read is
 *               the only thing that can address a repair.
 *
 * A live brain server is therefore a hard dependency. An unreachable search FAILS
 * the run: degrading to an empty candidate set would be indistinguishable from
 * "nothing references these targets".
 *
 * `--project` is OPTIONAL. Omitted, the flag is left off the query and the CLI
 * resolves a project itself (BM_PROJECT, BM_ACTIVE_PROJECT, BRAIN_PROJECT, then a
 * cwd match against configured code paths). The project that answered is read back
 * off the response and recorded on the manifest with whether it was caller-supplied
 * or CLI-resolved, so an unnamed project never means an unknown one.
 *
 * Findings come from three legs. TEXT and GRAPH are computed here and are
 * deterministic; they are what closure gates on. SEARCH entries arrive only via
 * `--merge` and are forced advisory, so they can never gate a build.
 *
 * Usage:
 *   bun run src/reference-scan.ts --docs-root <dir> --project <name> \
 *     --targets <targets.json> [--merge <semantic.json>] [--out <manifest.json>]
 *   bun run src/reference-scan.ts --docs-root <dir> --project <name> \
 *     --target <note.md> [--target <note.md> ...] [--out <manifest.json>]
 *   bun run src/reference-scan.ts --check --manifest <manifest.json> \
 *     [--docs-root <dir>] [--project <name>] [--retain <retain.json>] [--out <closure.json>]
 *
 * Exit codes:
 *   0 = success. In scan mode this includes "found references" — findings are
 *       the answer, not a failure. In check mode it means closure was reached.
 *   1 = validation error (argv, missing file, malformed JSON, Zod rejection).
 *   2 = check mode only: closure NOT reached, at least one OUTSTANDING entry.
 *       Mirrors the defrag convention where 2 means "the audit found work".
 *
 * The scan is strictly read-only. It opens notes and never writes one; the only
 * file it creates is the manifest at `--out`.
 */

// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
import { resolve } from "node:path";
import { ZodError } from "zod";
import type { SearchRunner } from "@acmelabs/core/core/brain-cli";
import { checkClosure } from "@acmelabs/core/core/reference-closure";
import { type TargetSpec, buildImpactManifest } from "@acmelabs/core/core/reference-scan";
import { PlanValidationError, zodErrorToIssues } from "@acmelabs/core/schemas/plan-yaml";
import {
  type ImpactManifest,
  ImpactManifestSchema,
  MergeFileSchema,
  RetainFileSchema,
  type RetainRule,
  type SearchReferenceFinding,
  TargetsFileSchema,
} from "@acmelabs/core/schemas/reference-manifest";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

interface ParsedArgs {
  mode: "scan" | "check";
  docsRoot?: string;
  targetsFile?: string;
  targets: string[];
  manifestFile?: string;
  retainFile?: string;
  mergeFile?: string;
  out?: string;
  /** Brain project stage-one discovery queries. Required on scan. */
  project?: string;
}

const USAGE =
  "Usage: reference-scan.ts --docs-root <dir> [--project <name>] (--targets <file.json> | --target <note.md> ...) [--merge <file.json>] [--out <file>]\n" +
  "       reference-scan.ts --check --manifest <file.json> [--docs-root <dir>] [--project <name>] [--retain <file.json>] [--out <file>]";

function usageError(message: string): PlanValidationError {
  return new PlanValidationError(`${message}\n${USAGE}`, [{ path: "<argv>", message }]);
}

/** Read the value following `flag`, refusing a missing value or another flag. */
function flagValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw usageError(`${flag} requires a value`);
  }
  return value;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const parsed: ParsedArgs = { mode: "scan", targets: [] };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    switch (flag) {
      case "--check":
        parsed.mode = "check";
        break;
      case "--docs-root":
        parsed.docsRoot = flagValue(argv, index++, flag);
        break;
      case "--targets":
        parsed.targetsFile = flagValue(argv, index++, flag);
        break;
      case "--target":
        parsed.targets.push(flagValue(argv, index++, flag));
        break;
      case "--manifest":
        parsed.manifestFile = flagValue(argv, index++, flag);
        break;
      case "--retain":
        parsed.retainFile = flagValue(argv, index++, flag);
        break;
      case "--merge":
        parsed.mergeFile = flagValue(argv, index++, flag);
        break;
      case "--project":
        parsed.project = flagValue(argv, index++, flag);
        break;
      case "--out":
        parsed.out = flagValue(argv, index++, flag);
        break;
      default:
        throw usageError(`unknown argument: ${flag}`);
    }
  }
  return validateArgs(parsed);
}

function validateArgs(parsed: ParsedArgs): ParsedArgs {
  if (parsed.mode === "check") {
    if (!parsed.manifestFile) throw usageError("--check requires --manifest <file.json>");
    return parsed;
  }
  if (!parsed.docsRoot) throw usageError("--docs-root is required");
  if (!parsed.targetsFile && parsed.targets.length === 0) {
    throw usageError("supply --targets <file.json> or at least one --target <note.md>");
  }
  return parsed;
}

async function readJson(path: string): Promise<unknown> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new PlanValidationError(`file not found: ${path}`, [
      { path, message: "file does not exist" },
    ]);
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new PlanValidationError(`file exceeds the ${MAX_INPUT_BYTES}-byte guard: ${path}`, [
      { path, message: `size ${file.size} > ${MAX_INPUT_BYTES}` },
    ]);
  }
  try {
    return await file.json();
  } catch (err) {
    throw new PlanValidationError(`file is not valid JSON: ${path}`, [
      { path, message: (err as Error).message },
    ]);
  }
}

/** Wrap a Zod rejection in the library's structured-issue error. */
function parseOrThrow<T>(schema: { parse: (raw: unknown) => T }, raw: unknown, label: string): T {
  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new PlanValidationError(`${label} failed schema validation`, zodErrorToIssues(err));
    }
    throw err;
  }
}

async function loadTargets(parsed: ParsedArgs): Promise<TargetSpec[]> {
  if (!parsed.targetsFile) return parsed.targets.map((path) => ({ path }));
  const raw = await readJson(parsed.targetsFile);
  return parseOrThrow(TargetsFileSchema, raw, parsed.targetsFile);
}

async function loadRetainRules(parsed: ParsedArgs): Promise<RetainRule[]> {
  if (!parsed.retainFile) return [];
  const raw = await readJson(parsed.retainFile);
  return parseOrThrow(RetainFileSchema, raw, parsed.retainFile);
}

/** Emit to `--out` when given, otherwise to stdout. */
async function emit(payload: unknown, out: string | undefined): Promise<void> {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (out) await Bun.write(resolve(out), json);
  else process.stdout.write(json);
}

async function loadMergeEntries(parsed: ParsedArgs): Promise<SearchReferenceFinding[]> {
  if (!parsed.mergeFile) return [];
  const raw = await readJson(parsed.mergeFile);
  return parseOrThrow(MergeFileSchema, raw, parsed.mergeFile);
}

/**
 * Parse a manifest read back from disk, naming the remedy when it will not validate.
 *
 * A manifest that fails validation is stale — regenerate it. There is deliberately no
 * migration path and no shape-specific detection: whatever a manifest is missing, it
 * was produced by a scan and a scan is what replaces it, so one message covers every
 * way it can be wrong. The Zod issues still list the offending fields underneath.
 */
function parseManifest(raw: unknown, label: string): ImpactManifest {
  try {
    return ImpactManifestSchema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new PlanValidationError(
        `${label}: stale or invalid manifest — re-run the scan to regenerate it`,
        zodErrorToIssues(err),
      );
    }
    throw err;
  }
}

/**
 * Report a discovery that could not prove itself, on stderr.
 *
 * A funnel that could not prove its scope complete produced a worklist that may be
 * short, and a short worklist looks exactly like a finished one. There is no census
 * to fall back to, which makes saying so LOUDLY the whole of the remedy: the reader
 * has to know which query could not vouch for itself, and why.
 */
function warnOnDiscovery(discovery: ImpactManifest["discovery"]): void {
  if (!discovery.provable) {
    process.stderr.write(
      `${JSON.stringify({
        warning: "FunnelCompletenessUnproven",
        detail:
          "stage-one discovery could not prove its scope complete; findings below may be short",
        queries: discovery.queries
          .filter((entry) => !entry.provable)
          .map((entry) => ({ leg: entry.leg, query: entry.query, reason: entry.reason })),
      })}\n`,
    );
  }
  if (discovery.projectMismatchSuspected) {
    // Named FIRST and separately from ordinary staleness. A wrong graph answers
    // fluently — every query proves itself complete over notes that really exist,
    // just not here — so the finding count looks plausible and only the disk
    // correspondence gives it away.
    process.stderr.write(
      `${JSON.stringify({
        warning: "ProjectMismatchSuspected",
        detail:
          "the search returned notes but essentially none exist under this docs root, which is what searching the wrong graph looks like",
        project: discovery.project,
        projectSource: discovery.projectSource,
        remedy:
          discovery.projectSource === "cli"
            ? "the project was resolved by the CLI from environment or working directory; pass --project <name> to pin it"
            : "confirm --project names the graph that corresponds to --docs-root",
        missingOnDisk: discovery.missingOnDisk.length,
      })}\n`,
    );
  } else if (discovery.missingOnDisk.length > 0) {
    process.stderr.write(
      `${JSON.stringify({
        warning: "CandidateMissingOnDisk",
        detail: "the index returned notes that are not on disk; stage two could not open them",
        paths: discovery.missingOnDisk,
      })}\n`,
    );
  }
}

async function runScan(parsed: ParsedArgs, runner?: SearchRunner): Promise<number> {
  const merge = await loadMergeEntries(parsed);
  const started = Bun.nanoseconds();
  const manifest = await buildImpactManifest({
    docsRoot: resolve(parsed.docsRoot ?? "."),
    targets: await loadTargets(parsed),
    ...(merge.length > 0 ? { merge } : {}),
    ...(parsed.project === undefined ? {} : { project: parsed.project }),
    ...(runner === undefined ? {} : { runner }),
  });
  const elapsedMs = Math.round((Bun.nanoseconds() - started) / 1e6);
  await emit(manifest, parsed.out);
  warnOnDiscovery(manifest.discovery);
  // Timing goes to stderr rather than into the manifest, so the artefact stays
  // byte-identical across runs over an unchanged graph while a regression is still
  // visible to whoever ran the scan.
  process.stderr.write(
    `${JSON.stringify({
      timing: "scan",
      elapsedMs,
      queries: manifest.discovery.queries.length,
      notesRead: manifest.filesScanned,
    })}\n`,
  );
  return 0;
}

async function runCheck(parsed: ParsedArgs, runner?: SearchRunner): Promise<number> {
  const raw = await readJson(parsed.manifestFile ?? "");
  const manifest = parseManifest(raw, parsed.manifestFile ?? "<manifest>");
  const report = await checkClosure({
    manifest,
    retain: await loadRetainRules(parsed),
    ...(parsed.docsRoot ? { docsRoot: resolve(parsed.docsRoot) } : {}),
    ...(parsed.project ? { project: parsed.project } : {}),
    ...(runner === undefined ? {} : { runner }),
  });
  await emit(report, parsed.out);
  return report.summary.closed ? 0 : 2;
}

/**
 * `runner` is the subprocess seam, threaded from here so the CLI itself is testable.
 *
 * Discovery now shells out on every run, which would otherwise make every CLI test
 * depend on a live server AND on that server resolving to a project whose notes
 * happen to sit under the fixture root. Both are conditions a test cannot arrange,
 * and a test that silently passes because discovery found nothing is worse than no
 * test. Production callers omit it and get the real binary.
 */
export async function main(argv: readonly string[], runner?: SearchRunner): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    return parsed.mode === "check" ? await runCheck(parsed, runner) : await runScan(parsed, runner);
  } catch (err) {
    if (err instanceof PlanValidationError) {
      process.stderr.write(
        `${JSON.stringify({ error: "PlanValidationError", message: err.message, issues: err.issues })}\n`,
      );
      return 1;
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
