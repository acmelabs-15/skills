#!/usr/bin/env bun
/**
 * defrag CLI entry point.
 *
 * Parses --report-only, --staleness, --project-root, --basic-memory flags.
 * Orchestrates the audit → report → delegation cycle.
 *
 * In report-only mode, writes the report to defrag/reports/defrag-YYYY-MM-DD.md
 * and exits (code 0 if candidates found, code 2 if clean).
 *
 * In interactive mode, prints the report and walks each candidate one at a time.
 * Confirmed candidates are delegated to /decompose, /recompose, Brain MCP
 * delete_note, or Brain MCP edit_note. Failures are logged and skipped; the
 * cycle never aborts on a single candidate failure.
 *
 * The actual Skill invocation pattern (Claude Code's `Skill(skill="decompose")`
 * dispatch) only resolves inside a Claude Code session; this CLI prints the
 * dispatch instruction so a human operator (or a Claude Code orchestrator wrapper)
 * can act on it. Programmatic delegation is performed by passing a
 * `DelegationAdapter` from the test harness.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type AuditCandidate, type AuditResult, audit } from "./audit.ts";
import { type ActionSummary, emptySummary, formatActionSummary, report } from "./report.ts";

export interface DefragOptions {
  reportOnly: boolean;
  projectRoot: string;
  stalenessDays: number;
  lineMax: number;
  basicMemory: boolean;
  /** Override today for deterministic tests. */
  today?: string;
  /** Optional delegation adapter (defaults to a stub that records intents). */
  delegation?: DelegationAdapter;
}

export interface DelegationAdapter {
  decompose(c: AuditCandidate): Promise<DelegationOutcome>;
  recompose(cs: AuditCandidate[]): Promise<DelegationOutcome>;
  deleteNote(c: AuditCandidate): Promise<DelegationOutcome>;
  structuralFix(c: AuditCandidate): Promise<DelegationOutcome>;
}

export type DelegationOutcome =
  | { status: "ok"; detail?: string }
  | { status: "failed"; error: string }
  | { status: "skipped"; reason: string };

/** Default delegation adapter: prints the dispatch and records as 'ok' (no-op). */
export const printingDelegation: DelegationAdapter = {
  async decompose(c) {
    console.log(`  → Invoke /decompose skill with path=${c.path} type=${c.entityType}`);
    return { status: "ok", detail: "printed dispatch" };
  },
  async recompose(cs) {
    const paths = cs.map((c) => c.path).join(", ");
    console.log(`  → Invoke /recompose skill with paths=[${paths}]`);
    return { status: "ok", detail: "printed dispatch" };
  },
  async deleteNote(c) {
    console.log(`  → Invoke Brain MCP delete_note for ${c.path}`);
    return { status: "ok", detail: "printed dispatch" };
  },
  async structuralFix(c) {
    console.log(`  → Invoke Brain MCP edit_note (insert H3 grouping) for ${c.path}`);
    return { status: "ok", detail: "printed dispatch" };
  },
};

export function parseArgs(argv: string[]): DefragOptions {
  const opts: DefragOptions = {
    reportOnly: false,
    projectRoot: process.cwd(),
    stalenessDays: 90,
    lineMax: 500,
    basicMemory: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--report-only") opts.reportOnly = true;
    else if (a === "--basic-memory") opts.basicMemory = true;
    else if (a === "--project-root") {
      const v = argv[++i];
      if (v !== undefined) opts.projectRoot = v;
    } else if (a === "--staleness") {
      const v = argv[++i];
      if (v !== undefined) opts.stalenessDays = Number.parseInt(v, 10);
    } else if (a === "--line-max") {
      const v = argv[++i];
      if (v !== undefined) opts.lineMax = Number.parseInt(v, 10);
    } else if (a === "--help" || a === "-h") {
      console.log(usage());
      process.exit(0);
    }
  }
  return opts;
}

export function usage(): string {
  return [
    "defrag — Brain knowledge-graph curator",
    "",
    "Usage:",
    "  bun skills/defrag/scripts/defrag.ts [options]",
    "",
    "Options:",
    "  --report-only         Run audit, write report, exit (no delegation; cron-safe)",
    "  --project-root <dir>  Project root (default: cwd)",
    "  --staleness <days>    Staleness threshold in days (default: 90)",
    "  --line-max <n>        Line count above which a note splits (default: 500)",
    "  --basic-memory        Treat project as basic-memory (skip CONVENTIONS checks)",
    "  -h, --help            Show this help",
    "",
    "Exit codes:",
    "  0  Candidates handled (or empty graph in report-only mode after handling)",
    "  2  Report-only mode found candidates",
    "  1  Internal error",
  ].join("\n");
}

export async function runReportOnly(
  options: DefragOptions,
  result: AuditResult,
): Promise<{ reportPath: string; reportContent: string; exitCode: 0 | 2 }> {
  const date = options.today ?? new Date().toISOString().slice(0, 10);
  const dir = join(options.projectRoot, "defrag", "reports");
  await mkdir(dir, { recursive: true });
  const reportPath = join(dir, `defrag-${date}.md`);
  const reportContent = report(result, { date, projectRoot: options.projectRoot });
  await writeFile(reportPath, reportContent, "utf8");
  return {
    reportPath,
    reportContent,
    exitCode: result.candidates.length > 0 ? 2 : 0,
  };
}

export async function runInteractive(
  options: DefragOptions,
  result: AuditResult,
  confirm: (c: AuditCandidate) => Promise<boolean> = () => Promise.resolve(true),
): Promise<ActionSummary> {
  const delegation = options.delegation ?? printingDelegation;
  const summary = emptySummary();

  for (const c of result.by.split) {
    if (!(await confirm(c))) {
      summary.skipped++;
      continue;
    }
    const r = await safeCall(() => delegation.decompose(c));
    tallyOutcome(r, summary, "split");
  }
  if (result.by.merge.length > 0) {
    // Merge: group all candidates of same entity-type as a single batch.
    const byType = new Map<string, AuditCandidate[]>();
    for (const c of result.by.merge) {
      const list = byType.get(c.entityType) ?? [];
      list.push(c);
      byType.set(c.entityType, list);
    }
    for (const [, group] of byType) {
      // Only delegate if user confirms at least one member.
      const confirmed: AuditCandidate[] = [];
      for (const c of group) if (await confirm(c)) confirmed.push(c);
      if (confirmed.length === 0) {
        summary.skipped += group.length;
        continue;
      }
      const r = await safeCall(() => delegation.recompose(confirmed));
      tallyOutcome(r, summary, "merge", confirmed.length);
      summary.skipped += group.length - confirmed.length;
    }
  }
  for (const c of result.by.stale) {
    if (!(await confirm(c))) {
      summary.skipped++;
      continue;
    }
    const r = await safeCall(() => delegation.deleteNote(c));
    tallyOutcome(r, summary, "delete");
  }
  for (const c of result.by["structural-fix"]) {
    if (!(await confirm(c))) {
      summary.skipped++;
      continue;
    }
    const r = await safeCall(() => delegation.structuralFix(c));
    tallyOutcome(r, summary, "structural-fix");
  }
  return summary;
}

function tallyOutcome(
  outcome: DelegationOutcome,
  summary: ActionSummary,
  kind: "split" | "merge" | "delete" | "structural-fix",
  count = 1,
): void {
  if (outcome.status === "ok") {
    if (kind === "split") summary.split += count;
    else if (kind === "merge") summary.merge += count;
    else if (kind === "delete") summary.delete += count;
    else summary.structuralFix += count;
  } else if (outcome.status === "failed") {
    summary.failed += count;
    console.error(`  ✗ delegation failed: ${outcome.error}`);
  } else {
    summary.skipped += count;
    console.error(`  – delegation skipped: ${outcome.reason}`);
  }
}

async function safeCall(fn: () => Promise<DelegationOutcome>): Promise<DelegationOutcome> {
  try {
    return await fn();
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

export async function main(argv: string[]): Promise<number> {
  const options = parseArgs(argv);
  const result = await audit({
    projectRoot: options.projectRoot,
    stalenessDays: options.stalenessDays,
    lineMax: options.lineMax,
  });

  if (options.reportOnly) {
    const { reportPath, exitCode } = await runReportOnly(options, result);
    console.log(`Report written to ${reportPath}`);
    console.log(`Notes scanned: ${result.notesScanned}, candidates: ${result.candidates.length}`);
    return exitCode;
  }

  // Interactive mode.
  console.log(report(result, { projectRoot: options.projectRoot }));
  if (result.candidates.length === 0) {
    console.log("No candidates. Graph is clean.");
    return 0;
  }
  const summary = await runInteractive(options, result);
  console.log("\nSummary:");
  console.log(`  ${formatActionSummary(summary)}`);
  return 0;
}

// Direct CLI invocation guard.
if (import.meta.main) {
  main(Bun.argv.slice(2)).then((code) => process.exit(code));
}
