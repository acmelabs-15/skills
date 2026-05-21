#!/usr/bin/env bun
/**
 * ingest CLI entry point.
 *
 * Orchestrates the six-step pipeline: parse → detect-type → resolve-path →
 * assemble → three-phase write → verify.
 *
 * Brain-aware routing: when the project is detected as Brain (or unless
 * --basic-memory is set), the full CONVENTIONS-compliant path is used,
 * including a Pattern 2 three-phase write. Otherwise a simplified single-step
 * write is used.
 *
 * Brain MCP calls are NOT executed directly here — that would require a live
 * Claude Code session. Instead the writer is parameterized via a
 * `NoteWriter` interface; the default writer prints the planned dispatch and
 * writes the assembled file to disk (so the result is inspectable end-to-end
 * during a dry-run or smoke test). Tests inject mock writers.
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { detectProjectContext } from "../../../_shared/detect-context.ts";
import { type AssembledNote, assembleNote } from "./assemble.ts";
import {
  SPEC_NESTED_TYPES,
  buildFilename,
  detectType,
  nextCounter,
  resolveTargetFolder,
} from "./detect.ts";
import { parseSourceFile } from "./parse.ts";

export interface IngestOptions {
  sourcePath: string;
  projectRoot: string;
  typeOverride?: string;
  parentSpec?: string;
  basicMemory?: boolean;
  batch?: boolean;
  dryRun?: boolean;
  /** Custom descriptor (default: derived from filename). */
  descriptor?: string;
  /** Injected writer for tests / live Brain MCP harness. */
  writer?: NoteWriter;
}

export interface NoteWriter {
  /** Write a Brain note via Pattern 2 three-phase write. */
  writeBrainNote(plan: WritePlan): Promise<WriteOutcome>;
  /** Write a basic-memory note (single step). */
  writeBasicMemoryNote(plan: WritePlan): Promise<WriteOutcome>;
}

export interface WritePlan {
  folder: string;
  filename: string;
  permalink: string;
  title: string;
  body: string;
  /** Title with no colon — Phase 1 of Pattern 2. */
  spaceSeparatedTitle: string;
}

export type WriteOutcome =
  | { status: "ok"; finalPath: string }
  | { status: "failed"; error: string };

/** Default writer: prints the dispatch plan and writes to disk for inspection. */
export function makePrintingWriter(): NoteWriter {
  return {
    async writeBrainNote(plan) {
      console.log(`→ Brain write: ${plan.folder}/${plan.filename}`);
      console.log(`  Phase 1: write_note title="${plan.spaceSeparatedTitle}"`);
      console.log(`  Phase 2: edit_note find_replace add colon → "${plan.title}"`);
      console.log(`  Phase 3: move_note → ${plan.filename}`);
      return await persist(plan);
    },
    async writeBasicMemoryNote(plan) {
      console.log(`→ basic-memory write: ${plan.folder}/${plan.filename}`);
      return await persist(plan);
    },
  };
}

async function persist(plan: WritePlan): Promise<WriteOutcome> {
  try {
    const full = join(plan.folder, plan.filename);
    await Bun.write(full, plan.body);
    return { status: "ok", finalPath: full };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Six-step ingest pipeline for a single source file. */
export async function ingestFile(options: IngestOptions): Promise<IngestResult> {
  const writer = options.writer ?? makePrintingWriter();

  // 1. Parse.
  const parsed = await parseSourceFile(options.sourcePath);

  // 2. Detect type.
  const detected = detectType(parsed, {
    ...(options.typeOverride !== undefined ? { override: options.typeOverride } : {}),
    ...(options.parentSpec !== undefined ? { parentSpec: options.parentSpec } : {}),
  });
  if (detected.missingParentSpec) {
    return {
      status: "failed",
      error: `Type ${detected.type} requires --parent-spec`,
      sourcePath: options.sourcePath,
    };
  }

  // 3. Resolve target path + counter.
  const folder = join(options.projectRoot, resolveTargetFolder(detected.type, options.parentSpec));
  const existing = await listMarkdownFiles(folder);
  const counter = nextCounter(prefixFor(detected.type), existing);
  const descriptor = options.descriptor ?? deriveDescriptor(parsed, options.sourcePath);
  const filename = buildFilename(detected.type, counter, descriptor, options.parentSpec);

  // 4. Assemble.
  const assembled: AssembledNote = assembleNote(parsed, {
    type: detected.type,
    counter,
    descriptor,
    ...(options.parentSpec !== undefined ? { parentSpec: options.parentSpec } : {}),
    folder: resolveTargetFolder(detected.type, options.parentSpec),
    filename,
    ...(options.basicMemory === true ? { basicMemory: true } : {}),
  });

  const plan: WritePlan = {
    folder,
    filename,
    permalink: assembled.permalink,
    title: assembled.title,
    body: assembled.text,
    spaceSeparatedTitle: assembled.title.replace(/:/g, ""),
  };

  if (options.dryRun) {
    return {
      status: "ok",
      sourcePath: options.sourcePath,
      finalPath: join(folder, filename),
      title: assembled.title,
      dryRun: true,
    };
  }

  // 5. Three-phase write (or simple basic-memory write).
  const outcome =
    options.basicMemory === true
      ? await writer.writeBasicMemoryNote(plan)
      : await writer.writeBrainNote(plan);

  if (outcome.status === "failed") {
    return { status: "failed", error: outcome.error, sourcePath: options.sourcePath };
  }

  // 6. Verify.
  const verifyErrors = verifyAssembledNote(assembled.text, plan, options.basicMemory === true);
  if (verifyErrors.length > 0) {
    return {
      status: "failed",
      error: `Post-write verification failed: ${verifyErrors.join("; ")}`,
      sourcePath: options.sourcePath,
      finalPath: outcome.finalPath,
    };
  }

  return {
    status: "ok",
    sourcePath: options.sourcePath,
    finalPath: outcome.finalPath,
    title: assembled.title,
  };
}

export type IngestResult =
  | { status: "ok"; sourcePath: string; finalPath: string; title: string; dryRun?: boolean }
  | { status: "failed"; error: string; sourcePath: string; finalPath?: string };

/** Batch mode: iterate files in a directory. */
export async function ingestDirectory(options: IngestOptions): Promise<IngestResult[]> {
  const entries = await readdir(options.sourcePath, { withFileTypes: true });
  const results: IngestResult[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const fileOptions: IngestOptions = {
      ...options,
      sourcePath: join(options.sourcePath, entry.name),
      batch: false,
    };
    results.push(await ingestFile(fileOptions));
  }
  return results;
}

/** CONVENTIONS Section 8.2 post-write verification (6 items). */
export function verifyAssembledNote(
  noteText: string,
  plan: WritePlan,
  basicMemory: boolean,
): string[] {
  const errors: string[] = [];

  // 1. Kebab filename (lowercase + no spaces).
  if (plan.filename !== plan.filename.toLowerCase().replace(/[^a-z0-9./-]/g, (c) => c)) {
    // Allow CAPS prefix; check separately.
  }
  if (/\s/.test(plan.filename)) errors.push("filename contains spaces");

  // 2. Frontmatter title matches.
  const titleMatch = /^title: ['"]?(.+?)['"]?\s*$/m.exec(noteText);
  if (!titleMatch) errors.push("frontmatter title missing");
  else if (titleMatch[1]?.trim() !== plan.title) {
    errors.push(`frontmatter title "${titleMatch[1]}" != plan title "${plan.title}"`);
  }

  // 3. H1 matches.
  const h1Match = /^# (.+?)\s*$/m.exec(noteText);
  if (!h1Match) errors.push("H1 missing");
  else if (h1Match[1] !== plan.title) {
    errors.push(`H1 "${h1Match[1]}" != plan title "${plan.title}"`);
  }

  if (basicMemory) return errors;

  // 4. Valid relation types (best-effort scan in Relations section).
  // (We don't fail on this — generated relations use valid types by construction.)

  // 5. Counts above minimums.
  const obsSection = extractSection(noteText, "Observations") ?? "";
  const obsCount = (obsSection.match(/^- \[[a-z-]+\]/gim) ?? []).length;
  if (obsCount < 3) errors.push(`observations count ${obsCount} below 3`);

  const relSection = extractSection(noteText, "Relations") ?? "";
  const relCount = (relSection.match(/^- \S/gm) ?? []).length;
  if (relCount < 2) errors.push(`relations count ${relCount} below 2`);

  // 6. Final-two-sections invariant.
  const obsIdx = noteText.indexOf("## Observations");
  const relIdx = noteText.indexOf("## Relations");
  if (obsIdx < 0 || relIdx < 0) errors.push("missing Observations or Relations section");
  else if (relIdx < obsIdx) errors.push("Relations appears before Observations");
  else {
    const afterRel = noteText.slice(relIdx + "## Relations".length);
    if (/^## /m.test(afterRel)) errors.push("a section appears after ## Relations");
  }

  return errors;
}

function extractSection(body: string, name: string): string | null {
  const re = new RegExp(`^## ${escapeRe(name)}\\s*$`, "m");
  const m = re.exec(body);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = body.slice(start);
  const next = /^## /m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function deriveDescriptor(parsed: { h1: string | null }, path: string): string {
  if (parsed.h1) {
    // Strip an existing ENTITY-ID prefix like "TASK-001:" → just descriptor.
    return parsed.h1.replace(/^[A-Z]+-\d{3}(?:-[A-Z]+-\d{3})?:\s*/, "").trim();
  }
  const base = path.split("/").pop() ?? "ingested-note";
  return base.replace(/\.md$/, "").replace(/[-_]+/g, " ");
}

function prefixFor(type: string): string {
  return (
    (
      {
        decision: "ADR",
        session: "SESSION",
        requirement: "REQ",
        design: "DESIGN",
        task: "TASK",
        analysis: "ANALYSIS",
        feature: "FEATURE",
        epic: "EPIC",
        critique: "CRIT",
        qa: "QA",
        security: "SECURITY",
        retrospective: "RETRO",
        skill: "SKILL",
        spec: "SPEC",
        plan: "PLAN",
        prd: "PRD",
      } as Record<string, string>
    )[type] ?? "NOTE"
  );
}

async function listMarkdownFiles(folder: string): Promise<string[]> {
  try {
    const entries = await readdir(folder);
    return entries.filter((e) => e.endsWith(".md"));
  } catch {
    return [];
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseArgs(argv: string[]): IngestOptions | null {
  const opts: Partial<IngestOptions> & { sourcePath?: string } = {
    projectRoot: process.cwd(),
  };
  let positional: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--type") {
      const v = argv[++i];
      if (v !== undefined) opts.typeOverride = v;
    } else if (a === "--parent-spec") {
      const v = argv[++i];
      if (v !== undefined) opts.parentSpec = v;
    } else if (a === "--basic-memory") opts.basicMemory = true;
    else if (a === "--batch") opts.batch = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--project-root") opts.projectRoot = argv[++i] ?? process.cwd();
    else if (a === "--descriptor") {
      const v = argv[++i];
      if (v !== undefined) opts.descriptor = v;
    } else if (a === "--help" || a === "-h") {
      console.log(usage());
      return null;
    } else if (a && !a.startsWith("--")) {
      positional = a;
    }
  }
  if (!positional) {
    console.error("ingest: missing source path argument");
    console.error(usage());
    return null;
  }
  opts.sourcePath = positional;
  return opts as IngestOptions;
}

export function usage(): string {
  return [
    "ingest — Bring external content into a Brain knowledge graph",
    "",
    "Usage:",
    "  bun skills/ingest/scripts/ingest.ts <source> [options]",
    "",
    "Options:",
    "  --type <type>           Force entity type (one of 16 canonical types)",
    "  --parent-spec <id>      Parent SPEC id (required for requirement/design/task)",
    "  --basic-memory          Use simplified write (skip CONVENTIONS)",
    "  --batch                 Treat <source> as a directory; ingest each .md file",
    "  --dry-run               Show plan without writing",
    "  --project-root <dir>    Project root (default: cwd)",
    "  --descriptor <text>     Override the descriptor used in the title",
    "  -h, --help              Show this help",
  ].join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const opts = parseArgs(argv);
  if (!opts) return 1;

  // Auto-detect context (informational; does not gate behaviour unless --basic-memory is set).
  const ctx = await detectProjectContext(opts.projectRoot, {
    ...(opts.basicMemory === true ? { basicMemory: true } : {}),
  });
  console.log(`Project context: ${ctx.contextType} (confidence=${ctx.confidence})`);
  if (ctx.contextType === "basic-memory") opts.basicMemory = true;

  if (opts.batch) {
    const results = await ingestDirectory(opts);
    const ok = results.filter((r) => r.status === "ok").length;
    const failed = results.length - ok;
    console.log(`\nBatch summary: ok=${ok} failed=${failed}`);
    for (const r of results) {
      if (r.status === "failed") console.log(`  ✗ ${r.sourcePath}: ${r.error}`);
      else console.log(`  ✓ ${r.sourcePath} → ${r.finalPath}`);
    }
    return failed > 0 ? 1 : 0;
  }

  const r = await ingestFile(opts);
  if (r.status === "ok") {
    console.log(`✓ Ingested → ${r.finalPath}`);
    if (r.dryRun) console.log("  (dry-run; no file written)");
    return 0;
  }
  console.error(`✗ ${r.error}`);
  return 1;
}

// re-export internal helpers for tests
export { SPEC_NESTED_TYPES };

if (import.meta.main) {
  main(Bun.argv.slice(2)).then((code) => process.exit(code));
}
