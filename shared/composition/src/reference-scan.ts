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
 * Findings come from three legs. TEXT and GRAPH are computed here and are
 * deterministic; they are what closure gates on. SEARCH entries are supplied
 * by the caller via `--merge` (this library makes no search calls), carry the
 * search `mode` that found them, and are forced advisory, so an
 * externally-supplied entry can never gate a build.
 *
 * Usage:
 *   bun run src/reference-scan.ts --docs-root <dir> --targets <targets.json> \
 *     [--merge <semantic.json>] [--out <manifest.json>]
 *   bun run src/reference-scan.ts --docs-root <dir> --target <note.md> \
 *     [--target <note.md> ...] [--out <manifest.json>]
 *   bun run src/reference-scan.ts --check --manifest <manifest.json> \
 *     [--docs-root <dir>] [--retain <retain.json>] [--out <closure.json>]
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
import { checkClosure } from "./core/reference-closure.js";
import { type TargetSpec, buildImpactManifest } from "./core/reference-scan.js";
import { augmentManifestWithSearch } from "./core/reference-search.js";
import { PlanValidationError, zodErrorToIssues } from "./schemas/plan-yaml.js";
import {
  ImpactManifestSchema,
  MergeFileSchema,
  RetainFileSchema,
  type RetainRule,
  type SearchReferenceFinding,
  TargetsFileSchema,
  detectLegacyManifest,
} from "./schemas/reference-manifest.js";

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
  /** Brain project to run the CLI-backed advisory leg against. */
  searchProject?: string;
  searchMode?: string;
  searchType?: string;
}

const USAGE =
  "Usage: reference-scan.ts --docs-root <dir> (--targets <file.json> | --target <note.md> ...) [--merge <file.json>] [--search-project <name> [--search-mode <mode>] [--search-type <type>]] [--out <file>]\n" +
  "       reference-scan.ts --check --manifest <file.json> [--docs-root <dir>] [--retain <file.json>] [--out <file>]";

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
      case "--search-project":
        parsed.searchProject = flagValue(argv, index++, flag);
        break;
      case "--search-mode":
        parsed.searchMode = flagValue(argv, index++, flag);
        break;
      case "--search-type":
        parsed.searchType = flagValue(argv, index++, flag);
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
 * Refuse a pre-discriminated manifest with a message naming the remedy.
 *
 * Runs BEFORE the Zod parse so the reader gets "re-run the scan" rather than a
 * four-branch union error listing every field of every branch. There is deliberately
 * no migration: the provenance a legacy SEARCH entry lacks was never recorded.
 */
function refuseLegacy(raw: unknown, label: string): void {
  const reason = detectLegacyManifest(raw);
  if (reason !== null) {
    throw new PlanValidationError(`${label}: ${reason}`, [{ path: label, message: reason }]);
  }
}

async function runScan(parsed: ParsedArgs): Promise<number> {
  const merge = await loadMergeEntries(parsed);
  const manifest = await buildImpactManifest({
    docsRoot: resolve(parsed.docsRoot ?? "."),
    targets: await loadTargets(parsed),
    ...(merge.length > 0 ? { merge } : {}),
  });
  if (!parsed.searchProject) {
    await emit(manifest, parsed.out);
    return 0;
  }
  // The advisory leg runs AFTER the deterministic manifest is complete, and only
  // widens it. A search outage therefore costs recall on prose references and
  // nothing else: the gate, the addresses and the write set are all already fixed.
  const augmented = await augmentManifestWithSearch({
    manifest,
    project: parsed.searchProject,
    ...(parsed.searchMode ? { mode: parsed.searchMode } : {}),
    ...(parsed.searchType ? { searchType: parsed.searchType } : {}),
  });
  await emit(augmented.manifest, parsed.out);
  // An enumeration that hit a page boundary is reported on stderr rather than
  // silently accepted: the advisory worklist may be short and the reader must know.
  if (!augmented.leg.complete) {
    process.stderr.write(
      `${JSON.stringify({ warning: "SearchEnumerationIncomplete", queries: augmented.leg.queries.filter((q) => !q.exhausted) })}\n`,
    );
  }
  return 0;
}

async function runCheck(parsed: ParsedArgs): Promise<number> {
  const raw = await readJson(parsed.manifestFile ?? "");
  refuseLegacy(raw, parsed.manifestFile ?? "<manifest>");
  const manifest = parseOrThrow(ImpactManifestSchema, raw, parsed.manifestFile ?? "<manifest>");
  const report = await checkClosure({
    manifest,
    retain: await loadRetainRules(parsed),
    ...(parsed.docsRoot ? { docsRoot: resolve(parsed.docsRoot) } : {}),
  });
  await emit(report, parsed.out);
  return report.summary.closed ? 0 : 2;
}

export async function main(argv: readonly string[]): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    return parsed.mode === "check" ? await runCheck(parsed) : await runScan(parsed);
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
