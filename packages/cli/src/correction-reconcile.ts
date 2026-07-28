#!/usr/bin/env bun
/**
 * Correction-reconciliation CLI — reconcile by diff.
 *
 * A correction that names its target and quotes the text it retires is a
 * machine-checkable obligation. This walks every such obligation in the sources
 * given and reports, per obligation, whether the change actually landed at the
 * target assertion.
 *
 * Usage:
 *   bun run src/correction-reconcile.ts --docs-root <dir> \
 *     --source <note.md> [--source <note.md> ...] \
 *     [--obligations <tuples.json>] [--out <report.json>]
 *
 *   bun run src/correction-reconcile.ts --docs-root <dir> \
 *     --obligations <tuples.json> [--out <report.json>]
 *
 * Exit codes:
 *   0 = every obligation landed. Findings of LANDED-UNMARKED do not fail the
 *       run; they are a discipline signal, not a factual defect.
 *   1 = validation error (argv, missing file, malformed JSON, Zod rejection).
 *   2 = at least one OUTSTANDING or TARGET-NOT-FOUND obligation. Mirrors the
 *       defrag convention where 2 means "the audit found work".
 *
 * Strictly read-only over the docs tree. The only file written is `--out`.
 *
 * `--source` is repeatable and is the sole way notes enter an extraction run:
 * the tool performs no discovery of its own. A semantic-search pass producing
 * that list is the documented future input for the seam, advisory only — see
 * the module note in core/correction-extract.ts.
 */

// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
import { resolve } from "node:path";
import { ZodError } from "zod";
import { extractObligations } from "@acmelabs/core/core/correction-extract";
import { reconcile } from "@acmelabs/core/core/correction-verify";
import { buildNoteIndex, readNoteAt } from "@acmelabs/core/core/note-index";
import type {
  CorrectionObligation,
  ObligationInput,
  ReconcileReport,
  UnextractableItem,
} from "@acmelabs/core/schemas/correction-obligation";
import { ObligationsFileSchema } from "@acmelabs/core/schemas/correction-obligation";
import { PlanValidationError, zodErrorToIssues } from "@acmelabs/core/schemas/plan-yaml";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

interface ParsedArgs {
  docsRoot?: string;
  sources: string[];
  obligationsFile?: string;
  out?: string;
}

const USAGE =
  "Usage: correction-reconcile.ts --docs-root <dir> (--source <note.md> ... | --obligations <file.json>) [--out <file>]";

function usageError(message: string): PlanValidationError {
  return new PlanValidationError(`${message}\n${USAGE}`, [{ path: "<argv>", message }]);
}

function flagValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw usageError(`${flag} requires a value`);
  }
  return value;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const parsed: ParsedArgs = { sources: [] };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    switch (flag) {
      case "--docs-root":
        parsed.docsRoot = flagValue(argv, index++, flag);
        break;
      case "--source":
        parsed.sources.push(flagValue(argv, index++, flag));
        break;
      case "--obligations":
        parsed.obligationsFile = flagValue(argv, index++, flag);
        break;
      case "--out":
        parsed.out = flagValue(argv, index++, flag);
        break;
      default:
        throw usageError(`unknown argument: ${flag}`);
    }
  }
  if (!parsed.docsRoot) throw usageError("--docs-root is required");
  if (parsed.sources.length === 0 && !parsed.obligationsFile) {
    throw usageError("supply at least one --source <note.md> or --obligations <file.json>");
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

/**
 * Config tuples carry the caller's reading of a correction the patterns missed.
 * The entity ID is taken from the target as written, so a config author may
 * write "ANALYSIS-026 Section 5.4" exactly as the source note does.
 */
function toObligation(input: ObligationInput): CorrectionObligation {
  const entityId = /^[A-Z][A-Z0-9-]*/.exec(input.targetNote.trim())?.[0] ?? input.targetNote.trim();
  return {
    sourceNote: input.sourceNote,
    sourceAnchor: input.sourceAnchor,
    targetNote: input.targetNote,
    targetEntityId: entityId,
    ...(input.targetSection === undefined ? {} : { targetSection: input.targetSection }),
    quotedStaleText: input.quotedStaleText,
    alternateQuotes: input.alternateQuotes ?? [],
    mandatedChange: input.mandatedChange,
    origin: "config",
  };
}

async function collectObligations(
  parsed: ParsedArgs,
  docsRoot: string,
): Promise<{
  obligations: CorrectionObligation[];
  unextractable: UnextractableItem[];
  sources: string[];
}> {
  const obligations: CorrectionObligation[] = [];
  const unextractable: UnextractableItem[] = [];
  const sources: string[] = [];
  for (const source of parsed.sources) {
    const note = await readNoteAt(docsRoot, source);
    sources.push(note.path);
    const extracted = extractObligations({
      sourceNote: note.path,
      content: note.content,
      sourceEntityId: note.entityId,
      noteType: note.noteType,
    });
    obligations.push(...extracted.obligations);
    unextractable.push(...extracted.unextractable);
  }
  if (parsed.obligationsFile) {
    const raw = await readJson(parsed.obligationsFile);
    const inputs = parseOrThrow(ObligationsFileSchema, raw, parsed.obligationsFile);
    for (const input of inputs) {
      obligations.push(toObligation(input));
      if (!sources.includes(input.sourceNote)) sources.push(input.sourceNote);
    }
  }
  return { obligations, unextractable, sources };
}

async function emit(payload: unknown, out: string | undefined): Promise<void> {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (out) await Bun.write(resolve(out), json);
  else process.stdout.write(json);
}

export async function run(parsed: ParsedArgs): Promise<{ report: ReconcileReport; exit: number }> {
  const docsRoot = resolve(parsed.docsRoot ?? ".");
  const index = await buildNoteIndex(docsRoot);
  const { obligations, unextractable, sources } = await collectObligations(parsed, docsRoot);
  const report = reconcile({ docsRoot, sources, obligations, unextractable, index });
  return { report, exit: report.summary.closed ? 0 : 2 };
}

export async function main(argv: readonly string[]): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    const { report, exit } = await run(parsed);
    await emit(report, parsed.out);
    return exit;
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

if (import.meta.main) {
  const exit = await main(process.argv.slice(2));
  process.exit(exit);
}
