#!/usr/bin/env bun
/**
 * Repoint executor CLI — the repair stage between `reference-scan` and
 * `reference-scan --check`.
 *
 * The three-phase workflow the composition skills use applies here in full: an
 * LLM authors the plan, a human adjudicates it, a script executes it. `--dry-run`
 * is what makes the middle phase possible, so it is the DEFAULT: writing to the
 * graph requires saying `--apply` out loud.
 *
 * Usage:
 *   bun run src/repoint.ts --manifest <manifest.json> --plan <repoint.yaml> \
 *     [--docs-root <dir>] [--out <report.json>]          # preview, writes nothing
 *   bun run src/repoint.ts --manifest <manifest.json> --plan <repoint.yaml> \
 *     --apply [--docs-root <dir>] [--out <report.json>]  # execute
 *
 * Plan shape:
 *   plan_type: repoint
 *   renumber_map:  { "ANALYSIS-034": "ANALYSIS-041" }      # entity IDs
 *   wikilink_map:  { "ANALYSIS-034: Old": "ANALYSIS-041: New" }   # full titles
 *   permalink_map: { "analysis/analysis-034-old": "analysis/analysis-041-new" }
 *   section_map:   { "ANALYSIS-034": { "Section 6": "Section 3" } }
 *
 * Exit codes:
 *   0 = every mechanically repairable finding was applied or was already applied,
 *       and the residual worklist is empty.
 *   1 = validation error (argv, missing file, malformed JSON or YAML, Zod
 *       rejection, unsafe path). Nothing was written.
 *   2 = the run completed but work remains: at least one residual entry. Mirrors
 *       the closure checker and defrag, where 2 means "there is work here". A
 *       manifest carrying judgment-class or unmapped findings exits 2 by design —
 *       those are worklist items, not failures.
 *   3 = integrity failure: the pass could not be proven reversible. Nothing was
 *       renamed. Distinguished from 2 because 2 is an expected outcome and this
 *       is a bug.
 *
 * The report is JSON on stdout, or at `--out`. Rendering it for a human is the
 * calling skill's job, as it is for every other CLI in this family.
 */

// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
import { resolve } from "node:path";
import { executeRepoint } from "@acmelabs/core/core/repoint";
import { PlanValidationError, zodErrorToIssues } from "@acmelabs/core/schemas/plan-yaml";
import {
  type ImpactManifest,
  ImpactManifestSchema,
} from "@acmelabs/core/schemas/reference-manifest";
import { type RepointPlan, RepointPlanSchema } from "@acmelabs/core/schemas/repoint-plan";
import yaml from "js-yaml";
import { ZodError } from "zod";

const MAX_PLAN_BYTES = 1024 * 1024; // 1 MB, matching decompose/recompose
const MAX_MANIFEST_BYTES = 8 * 1024 * 1024; // 8 MB, matching reference-scan

interface ParsedArgs {
  manifestFile: string;
  planFile: string;
  docsRoot?: string;
  out?: string;
  apply: boolean;
}

const USAGE =
  "Usage: repoint.ts --manifest <file.json> --plan <file.yaml> [--apply] [--docs-root <dir>] [--out <file>]\n" +
  "       preview is the default; --apply is required to write";

function usageError(message: string): PlanValidationError {
  return new PlanValidationError(`${message}\n${USAGE}`, [{ path: "<argv>", message }]);
}

function flagValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw usageError(`${flag} requires a value`);
  return value;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const parsed: Partial<ParsedArgs> & { apply: boolean } = { apply: false };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    switch (flag) {
      case "--manifest":
        parsed.manifestFile = flagValue(argv, index++, flag);
        break;
      case "--plan":
        parsed.planFile = flagValue(argv, index++, flag);
        break;
      case "--docs-root":
        parsed.docsRoot = flagValue(argv, index++, flag);
        break;
      case "--out":
        parsed.out = flagValue(argv, index++, flag);
        break;
      case "--apply":
        parsed.apply = true;
        break;
      // Accepted and ignored: preview is already the default, and a caller who
      // says it explicitly should not get a usage error for being careful.
      case "--dry-run":
        break;
      default:
        throw usageError(`unknown argument: ${flag}`);
    }
  }
  if (!parsed.manifestFile) throw usageError("--manifest <file.json> is required");
  if (!parsed.planFile) throw usageError("--plan <file.yaml> is required");
  return parsed as ParsedArgs;
}

async function sizedFile(path: string, maxBytes: number): Promise<string> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new PlanValidationError(`file not found: ${path}`, [
      { path, message: "file does not exist" },
    ]);
  }
  // Bun.file().size is metadata only, so the guard runs before any content load.
  if (file.size > maxBytes) {
    throw new PlanValidationError(`file exceeds the ${maxBytes}-byte guard: ${path}`, [
      { path, message: `size ${file.size} > ${maxBytes}` },
    ]);
  }
  return await file.text();
}

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

export async function loadPlan(planPath: string): Promise<RepointPlan> {
  const text = await sizedFile(planPath, MAX_PLAN_BYTES);
  // FAILSAFE_SCHEMA (CWE-502) matches the decompose/recompose loaders. Every
  // scalar resolves as a string, which is right for a plan whose every value is
  // an identifier.
  const raw = yaml.load(text, { schema: yaml.FAILSAFE_SCHEMA });
  return parseOrThrow(RepointPlanSchema, raw, planPath);
}

/**
 * Parse a manifest read back from disk, naming the remedy when it will not validate.
 *
 * A manifest that fails validation is stale — regenerate it. No migration path and no
 * shape-specific detection: whatever it is missing, a scan produced it and a scan
 * replaces it, so one message covers every way it can be wrong.
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

async function loadManifest(manifestPath: string): Promise<unknown> {
  const text = await sizedFile(manifestPath, MAX_MANIFEST_BYTES);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new PlanValidationError(`file is not valid JSON: ${manifestPath}`, [
      { path: manifestPath, message: (err as Error).message },
    ]);
  }
}

async function emit(payload: unknown, out: string | undefined): Promise<void> {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (out) await Bun.write(resolve(out), json);
  else process.stdout.write(json);
}

export async function main(argv: readonly string[]): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    const raw = await loadManifest(parsed.manifestFile);
    // A manifest that will not validate is stale; the remedy is to regenerate it, and
    // the message says so rather than surfacing a bare union error.
    const manifest = parseManifest(raw, parsed.manifestFile);
    const report = await executeRepoint({
      manifest,
      plan: await loadPlan(parsed.planFile),
      dryRun: !parsed.apply,
      ...(parsed.docsRoot ? { docsRoot: resolve(parsed.docsRoot) } : {}),
    });
    await emit(report, parsed.out);
    return report.summary.residual === 0 ? 0 : 2;
  } catch (err) {
    if (err instanceof PlanValidationError) {
      process.stderr.write(
        `${JSON.stringify({ error: "PlanValidationError", message: err.message, issues: err.issues })}\n`,
      );
      return 1;
    }
    if ((err as { code?: number })?.code === 2) {
      process.stderr.write(
        `${JSON.stringify({ error: "IrreversibleRepoint", message: (err as Error).message })}\n`,
      );
      return 3;
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
