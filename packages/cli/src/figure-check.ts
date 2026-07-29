#!/usr/bin/env bun
/**
 * Figure-staleness CLI — count re-derivation.
 *
 * A stated figure that summarises a structure can be re-derived from that
 * structure. Where it can, it should be, because a figure is only checked when
 * someone counts, and nobody counts a number that reads plausibly.
 *
 * Two modes, usable together:
 *
 *   scan   — zero-config built-ins over the notes given: totals rows against
 *            their column sums, "N of M" tallies against checkbox lists, and
 *            "N rows"/"N items" claims against an unambiguous adjacent table
 *            or list.
 *   checks — explicit checks from a JSON file, for claims that need pointing
 *            at, including cross-note ones ("197 surfaces" in a PRD against the
 *            inventory's own tables).
 *
 * Usage:
 *   bun run src/figure-check.ts --docs-root <dir> --note <note.md> [--note ...]
 *   bun run src/figure-check.ts --docs-root <dir> --checks <checks.json>
 *   bun run src/figure-check.ts --docs-root <dir> --all [--out <report.json>]
 *
 * Exit codes:
 *   0 = no mismatch. UNANCHORED findings do not fail a run; they are the
 *       tool declining to guess, which is a report line rather than a defect.
 *   1 = validation error (argv, missing file, malformed JSON, Zod rejection).
 *   2 = at least one MISMATCH. Mirrors the defrag convention where 2 means
 *       "the audit found work".
 *
 * Strictly read-only over the docs tree. The only file written is `--out`.
 */

// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
import { resolve } from "node:path";
import { runCheck } from "@acmelabs/core/core/figure-derive";
import { scanNote } from "@acmelabs/core/core/figure-scan";
import { type NoteIndex, buildNoteIndex } from "@acmelabs/core/core/note-index";
import {
  ChecksFileSchema,
  type FigureFinding,
  type FigureReport,
} from "@acmelabs/core/schemas/figure-check";
import { PlanValidationError, zodErrorToIssues } from "@acmelabs/core/schemas/plan-yaml";
import { ZodError } from "zod";
import { invokedName } from "./invoked-name.ts";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

interface ParsedArgs {
  docsRoot?: string;
  notes: string[];
  all: boolean;
  checksFile?: string;
  out?: string;
}

const USAGE = `Usage: ${invokedName("figure-check.ts")} --docs-root <dir> (--note <note.md> ... | --all | --checks <file.json>) [--out <file>]`;

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
  const parsed: ParsedArgs = { notes: [], all: false };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    switch (flag) {
      case "--docs-root":
        parsed.docsRoot = flagValue(argv, index++, flag);
        break;
      case "--note":
        parsed.notes.push(flagValue(argv, index++, flag));
        break;
      case "--all":
        parsed.all = true;
        break;
      case "--checks":
        parsed.checksFile = flagValue(argv, index++, flag);
        break;
      case "--out":
        parsed.out = flagValue(argv, index++, flag);
        break;
      default:
        throw usageError(`unknown argument: ${flag}`);
    }
  }
  if (!parsed.docsRoot) throw usageError("--docs-root is required");
  if (parsed.notes.length === 0 && !parsed.all && !parsed.checksFile) {
    throw usageError("supply --note <note.md>, --all, or --checks <file.json>");
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

function summarize(findings: readonly FigureFinding[]): FigureReport["summary"] {
  const count = (verdict: FigureFinding["verdict"]): number =>
    findings.filter((finding) => finding.verdict === verdict).length;
  const mismatch = count("MISMATCH");
  return {
    total: findings.length,
    match: count("MATCH"),
    mismatch,
    unanchored: count("UNANCHORED"),
    clean: mismatch === 0,
  };
}

function compareFindings(a: FigureFinding, b: FigureFinding): number {
  return a.note.localeCompare(b.note) || (a.line ?? 0) - (b.line ?? 0) || a.id.localeCompare(b.id);
}

async function scanTargets(parsed: ParsedArgs, index: NoteIndex): Promise<FigureFinding[]> {
  const notes = parsed.all
    ? index.all()
    : parsed.notes.map((reference) => {
        const note = index.resolve(reference);
        if (!note) {
          throw new PlanValidationError(`no note in the tree carries ${reference}`, [
            { path: reference, message: "unresolved note reference" },
          ]);
        }
        return note;
      });
  return notes.flatMap((note) => scanNote(note));
}

export async function run(parsed: ParsedArgs): Promise<{ report: FigureReport; exit: number }> {
  const docsRoot = resolve(parsed.docsRoot ?? ".");
  const index = await buildNoteIndex(docsRoot);
  const findings: FigureFinding[] = [];
  if (parsed.all || parsed.notes.length > 0) {
    findings.push(...(await scanTargets(parsed, index)));
  }
  if (parsed.checksFile) {
    const raw = await readJson(parsed.checksFile);
    const checks = parseOrThrow(ChecksFileSchema, raw, parsed.checksFile);
    findings.push(...checks.map((check) => runCheck(check, index)));
  }
  findings.sort(compareFindings);
  const report: FigureReport = {
    docsRoot,
    generatedAt: new Date().toISOString(),
    notesScanned: index.size,
    findings,
    summary: summarize(findings),
  };
  return { report, exit: report.summary.clean ? 0 : 2 };
}

async function emit(payload: unknown, out: string | undefined): Promise<void> {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (out) await Bun.write(resolve(out), json);
  else process.stdout.write(json);
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
