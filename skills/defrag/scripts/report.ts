/**
 * defrag report generator.
 *
 * Formats an `AuditResult` into markdown grouped by violation type. Used by both
 * interactive output (printed to stdout) and report-only cron mode (written to
 * defrag/reports/defrag-YYYY-MM-DD.md).
 */

import type { AuditCandidate, AuditResult, ViolationType } from "./audit.ts";

const SECTION_ORDER: ViolationType[] = ["split", "merge", "stale", "structural-fix"];

const SECTION_HEADINGS: Record<ViolationType, string> = {
  split: "Split candidates",
  merge: "Merge candidates",
  stale: "Stale candidates",
  "structural-fix": "Structural fixes",
};

const SECTION_DESCRIPTIONS: Record<ViolationType, string> = {
  split:
    "Notes that exceed structural thresholds; recommend invoking decompose to split into smaller notes.",
  merge:
    "Notes below minimum content density; recommend invoking recompose to merge with related siblings.",
  stale:
    "Notes that have not been touched for longer than the staleness threshold and whose status is not terminal.",
  "structural-fix":
    "Notes that need H3 grouping headers added; edit_note inserts headers without modifying content.",
};

export interface ReportOptions {
  /** Date to label the report (default: today, ISO date). */
  date?: string;
  /** Project root path (recorded in report header). */
  projectRoot?: string;
}

export function report(result: AuditResult, options: ReportOptions = {}): string {
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const root = options.projectRoot ?? process.cwd();

  const lines: string[] = [];
  lines.push(`# defrag report — ${date}`);
  lines.push("");
  lines.push(`Project root: \`${root}\``);
  lines.push(`Notes scanned: ${result.notesScanned}`);
  lines.push(`Candidates: ${result.candidates.length}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Action | Count |");
  lines.push("|:--|:--|");
  for (const v of SECTION_ORDER) {
    lines.push(`| ${SECTION_HEADINGS[v]} | ${result.by[v].length} |`);
  }
  lines.push("");

  for (const v of SECTION_ORDER) {
    const items = result.by[v];
    lines.push(`## ${SECTION_HEADINGS[v]}`);
    lines.push("");
    lines.push(SECTION_DESCRIPTIONS[v]);
    lines.push("");
    if (items.length === 0) {
      lines.push("_None._");
      lines.push("");
      continue;
    }
    for (const c of items) {
      lines.push(`- \`${c.path}\` (${c.entityType}) — ${c.violationDetail}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** Final-summary line for interactive mode. */
export function formatActionSummary(counts: ActionSummary): string {
  return [
    `split=${counts.split}`,
    `merge=${counts.merge}`,
    `delete=${counts.delete}`,
    `structural-fix=${counts.structuralFix}`,
    `skipped=${counts.skipped}`,
    `failed=${counts.failed}`,
  ].join(" · ");
}

export interface ActionSummary {
  split: number;
  merge: number;
  delete: number;
  structuralFix: number;
  skipped: number;
  failed: number;
}

export function emptySummary(): ActionSummary {
  return { split: 0, merge: 0, delete: 0, structuralFix: 0, skipped: 0, failed: 0 };
}

export type { AuditCandidate };
