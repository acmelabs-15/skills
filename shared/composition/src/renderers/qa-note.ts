import yaml from "js-yaml";
import type { Observation, Relation } from "../schemas/common.js";
import type { QaApproach, QaNote, QaSummary, TestResultRow } from "../schemas/qa-note.js";

/**
 * QaNote renderer (Phase X.D.7 → tightened X.C, 2026-05-21).
 *
 * Deterministic markdown render matching the parsed structure. Section order:
 *   frontmatter → H1 → Objective → Approach → Results (Summary + Test Results
 *   by Category) → Findings (optional) → Observations → Relations.
 *
 * Round-trip is BYTE-IDENTICAL against the canonical fixture
 * (tests/fixtures/qa-note-sample.md), matching the PlanNote pattern.
 * The parser still tolerates phrasing variants seen in docs/qa exemplars
 * (inline code in Scope bullet, custom Target/Status cells on Execution Time
 * row) — those are normalized to the canonical renderer-output form on
 * re-render, so adapter-driven mutations of fixture-form QA notes survive
 * decompose → recompose unchanged.
 */

const NL = "\n";

function renderFrontmatter(fm: QaNote["frontmatter"]): string {
  const ordered: Record<string, unknown> = {
    title: fm.title,
    type: fm.type,
    permalink: fm.permalink,
    status: fm.status,
    tags: fm.tags,
  };
  const body = yaml
    .dump(ordered, { lineWidth: -1, quotingType: '"', forceQuotes: false })
    .trimEnd();
  return `---${NL}${body}${NL}---`;
}

function renderObjective(note: QaNote): string {
  const lines: string[] = ["## Objective", ""];
  lines.push(note.objective);
  const bullets: string[] = [];
  if (note.feature !== undefined) bullets.push(`- **Feature**: ${note.feature}`);
  if (note.scope !== undefined) bullets.push(`- **Scope**: ${note.scope}`);
  if (note.acceptance_criteria_refs !== undefined) {
    bullets.push(`- **Acceptance Criteria**: ${note.acceptance_criteria_refs.join(", ")}`);
  }
  if (bullets.length > 0) {
    lines.push("");
    lines.push(...bullets);
  }
  return lines.join(NL);
}

function renderApproach(approach: QaApproach): string {
  const lines: string[] = ["## Approach", ""];
  lines.push(`- **Test Types**: ${approach.test_types.join(", ")}`);
  lines.push(`- **Environment**: ${approach.environment}`);
  lines.push(`- **Data Strategy**: ${approach.data_strategy}`);
  if (approach.test_file !== undefined) {
    lines.push(`- **Test File**: \`${approach.test_file}\``);
  }
  return lines.join(NL);
}

function renderSummary(summary: QaSummary): string {
  const lines: string[] = ["### Summary", ""];
  lines.push("| Metric | Value | Target | Status |");
  lines.push("|--------|-------|--------|--------|");
  lines.push(`| Tests Run | ${summary.tests_run} | - | - |`);
  lines.push(`| Passed | ${summary.passed} | - | [${summary.verdict}] |`);
  const failedMark = summary.failed === 0 ? "[PASS]" : "[FAIL]";
  lines.push(`| Failed | ${summary.failed} | 0 | ${failedMark} |`);
  lines.push(`| Skipped | ${summary.skipped} | - | - |`);
  lines.push(`| Assertions | ${summary.assertions} | - | - |`);
  if (summary.execution_time_ms !== undefined) {
    lines.push(`| Execution Time | ${summary.execution_time_ms}ms | - | - |`);
  }
  return lines.join(NL);
}

function renderTestResults(results: TestResultRow[]): string {
  const lines: string[] = ["### Test Results by Category", ""];
  if (results.length === 0) {
    lines.push("(none)");
    return lines.join(NL);
  }
  lines.push("| Test | Category | Status | Notes |");
  lines.push("|------|----------|--------|-------|");
  for (const r of results) {
    const notes = r.notes ?? "-";
    lines.push(`| ${r.test} | ${r.category} | [${r.status}] | ${notes} |`);
  }
  return lines.join(NL);
}

function renderResults(note: QaNote): string {
  const sections: string[] = ["## Results", ""];
  sections.push(renderSummary(note.summary));
  sections.push("");
  sections.push(renderTestResults(note.test_results));
  return sections.join(NL);
}

function renderObservations(obs: Observation[]): string {
  const lines = ["## Observations", ""];
  for (const o of obs) {
    const tags = o.tags.map((t) => `#${t}`).join(" ");
    lines.push(`- [${o.category}] ${o.text} ${tags}`);
  }
  return lines.join(NL);
}

function renderRelations(rels: Relation[]): string {
  const lines = ["## Relations", ""];
  for (const r of rels) {
    lines.push(`- ${r.verb} [[${r.target}]]`);
  }
  return lines.join(NL);
}

export function renderQaNote(note: QaNote): string {
  const sections: string[] = [];
  sections.push(renderFrontmatter(note.frontmatter));
  sections.push("");
  sections.push(`# ${note.frontmatter.title}`);
  sections.push("");
  sections.push(renderObjective(note));
  sections.push("");
  sections.push(renderApproach(note.approach));
  sections.push("");
  sections.push(renderResults(note));
  sections.push("");
  if (note.findings !== undefined) {
    sections.push("## Findings");
    sections.push("");
    sections.push(note.findings);
    sections.push("");
  }
  sections.push(renderObservations(note.observations));
  sections.push("");
  sections.push(renderRelations(note.relations));
  sections.push("");
  return sections.join(NL);
}
