import yaml from "js-yaml";
import type { Observation, Relation } from "../schemas/common.js";
import type { SpecPhase, SpecRootCheckboxItem, SpecRootNote } from "../schemas/spec-root-note.js";

/**
 * SpecRootNote renderer (Phase X.C deferred follow-up to X.D.7, 2026-05-21).
 *
 * Deterministic markdown render matching the parsed structure. Section order:
 *   frontmatter → H1 → Context → Scope → Phases? → Success Criteria? →
 *   Artifact Status? → opaque sections (insertion order) → Observations →
 *   Relations.
 *
 * Targets SEMANTIC round-trip — parse(render(parse(x))) === parse(x) — NOT
 * byte identity with arbitrary source SPECs. The opaque `sections` field is
 * a Record<string, string> whose insertion order is preserved by JS object
 * key ordering (ES2015+ string-key insertion order is part of the spec) and
 * by the parser's deterministic walk via sectionizeH2's Map. Renderer
 * iterates keys in object-insertion order, which matches the document order
 * of non-special H2 headings at parse time. Re-parse of the rendered output
 * regenerates the same key order, so semantic equality holds across the
 * parse → render → parse cycle.
 */

const NL = "\n";

function renderFrontmatter(fm: SpecRootNote["frontmatter"]): string {
  // Stable key order matching the schema field declaration order.
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

function renderContext(note: SpecRootNote): string {
  return ["## Context", "", note.context].join(NL);
}

function renderScope(note: SpecRootNote): string {
  // Use H3 sub-headings (### In Scope / ### Out of Scope) — the parser's
  // parseScope() switches buckets on H3 only. **bold** markers would fall
  // through to "flat list → scope_in" and lose scope_out on round-trip.
  // Section 4.7 of KNOWLEDGE-GRAPH-STRUCTURES.md permits both forms; we pick
  // H3 for renderer determinism.
  const lines: string[] = ["## Scope", "", "### In Scope", ""];
  if (note.scope_in.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of note.scope_in) lines.push(`- ${item}`);
  }
  lines.push("", "### Out of Scope", "");
  if (note.scope_out.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of note.scope_out) lines.push(`- ${item}`);
  }
  return lines.join(NL);
}

function renderPhases(phases: SpecPhase[]): string {
  const lines: string[] = ["## Phases", ""];
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (!phase) continue;
    lines.push(`### ${phase.name}`);
    lines.push("");
    if (phase.req_refs.length === 0) {
      lines.push("- (no refs)");
    } else {
      for (const ref of phase.req_refs) lines.push(`- [[${ref}]]`);
    }
    if (i < phases.length - 1) lines.push("");
  }
  return lines.join(NL);
}

function renderCheckboxItems(items: SpecRootCheckboxItem[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    let line = `- [${item.done ? "x" : " "}] ${item.text}`;
    if (item.deferred_rationale) {
      line += ` (deferred: ${item.deferred_rationale})`;
    }
    out.push(line);
  }
  return out;
}

function renderSuccessCriteria(items: SpecRootCheckboxItem[]): string {
  return ["## Success Criteria", "", ...renderCheckboxItems(items)].join(NL);
}

function renderArtifactStatus(items: SpecRootCheckboxItem[]): string {
  return ["## Artifact Status", "", ...renderCheckboxItems(items)].join(NL);
}

function renderOpaqueSection(heading: string, content: string): string {
  return [`## ${heading}`, "", content].join(NL);
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

export function renderSpecRootNote(note: SpecRootNote): string {
  const sections: string[] = [];
  sections.push(renderFrontmatter(note.frontmatter));
  sections.push("");
  sections.push(`# ${note.frontmatter.title}`);
  sections.push("");
  sections.push(renderContext(note));
  sections.push("");
  sections.push(renderScope(note));
  sections.push("");
  if (note.phases !== undefined) {
    sections.push(renderPhases(note.phases));
    sections.push("");
  }
  if (note.success_criteria !== undefined) {
    sections.push(renderSuccessCriteria(note.success_criteria));
    sections.push("");
  }
  if (note.artifact_status !== undefined) {
    sections.push(renderArtifactStatus(note.artifact_status));
    sections.push("");
  }
  for (const heading of Object.keys(note.sections)) {
    const content = note.sections[heading];
    if (content === undefined) continue;
    sections.push(renderOpaqueSection(heading, content));
    sections.push("");
  }
  sections.push(renderObservations(note.observations));
  sections.push("");
  sections.push(renderRelations(note.relations));
  sections.push("");
  return sections.join(NL);
}
