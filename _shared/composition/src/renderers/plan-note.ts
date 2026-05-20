import yaml from "js-yaml";
import type { Observation, Relation } from "../schemas/common.js";
import type {
  DodItem,
  EditorMirrorEntry,
  Part,
  PendingDecision,
  PlanNote,
  Task,
} from "../schemas/plan-note.js";
import { renderMermaid } from "./mermaid.js";

/**
 * PlanNote renderer (ADR-003 D-3 deterministic Bun+TS render).
 *
 * Canonical section order:
 *   frontmatter → H1 → Scope → Objectives → Progress Dashboard → Cross-Part
 *   Dependency Graph → Phase Progression → Tasks → Pending User Decisions →
 *   Editor Mirror IDs → Blockers → Observations → Relations.
 *
 * Progress Dashboard + Cross-Part Dependency Graph are DERIVED from parts[]
 * (Information Model Category 2 rollups) — the parser SKIPS them and the
 * renderer regenerates them every time.
 */

const NL = "\n";

function renderFrontmatter(fm: PlanNote["frontmatter"]): string {
  // Use a stable key order matching the schema definition.
  const ordered: Record<string, unknown> = {
    title: fm.title,
    type: fm.type,
    status: fm.status,
    complexity_tier: fm.complexity_tier,
    branches: fm.branches,
    permalink: fm.permalink,
    tags: fm.tags,
  };
  const body = yaml
    .dump(ordered, { lineWidth: -1, quotingType: '"', forceQuotes: false })
    .trimEnd();
  return `---${NL}${body}${NL}---`;
}

function renderScope(plan: PlanNote): string {
  const lines = ["## Scope", "", plan.scope];
  if (plan.source_reference) {
    lines.push("", `**Source**: ${plan.source_reference}`);
  }
  return lines.join(NL);
}

function renderObjectives(plan: PlanNote): string {
  const lines = ["## Objectives", ""];
  for (const o of plan.objectives) {
    lines.push(`- [${o.done ? "x" : " "}] ${o.text}`);
  }
  return lines.join(NL);
}

function renderProgressDashboard(plan: PlanNote): string {
  // Group parts by phase, count substatuses.
  const phases = ["research", "decisions", "spec-decomposition", "spec", "build", "review", "end"];
  const rows = new Map<
    string,
    { PENDING: number; IN_PROGRESS: number; BLOCKED: number; DONE: number; total: number }
  >();
  for (const phase of phases) {
    rows.set(phase, { PENDING: 0, IN_PROGRESS: 0, BLOCKED: 0, DONE: 0, total: 0 });
  }
  for (const part of plan.parts) {
    const row = rows.get(part.phase);
    if (!row) continue;
    row.total += 1;
    if (part.substatus === "DONE") row.DONE += 1;
    else if (part.substatus === "IN_PROGRESS") row.IN_PROGRESS += 1;
    else if (part.substatus === "BLOCKED") row.BLOCKED += 1;
    else row.PENDING += 1;
  }
  const lines = [
    "## Progress Dashboard",
    "",
    "| Phase | PENDING | IN_PROGRESS | BLOCKED | DONE | Total |",
    "|:--|--:|--:|--:|--:|--:|",
  ];
  let totP = 0;
  let totI = 0;
  let totB = 0;
  let totD = 0;
  let totT = 0;
  for (const phase of phases) {
    const r = rows.get(phase);
    if (!r || r.total === 0) continue;
    lines.push(
      `| ${phase} | ${r.PENDING} | ${r.IN_PROGRESS} | ${r.BLOCKED} | ${r.DONE} | ${r.total} |`,
    );
    totP += r.PENDING;
    totI += r.IN_PROGRESS;
    totB += r.BLOCKED;
    totD += r.DONE;
    totT += r.total;
  }
  lines.push(`| **Total** | **${totP}** | **${totI}** | **${totB}** | **${totD}** | **${totT}** |`);
  return lines.join(NL);
}

function renderDepsGraph(plan: PlanNote): string {
  const lines = [
    "## Cross-Part Dependency Graph",
    "",
    "```mermaid",
    renderMermaid(plan.parts),
    "```",
  ];
  return lines.join(NL);
}

function renderDodList(dod: DodItem[]): string[] {
  const out: string[] = [];
  for (const item of dod) {
    let line = `- [${item.done ? "x" : " "}] ${item.text}`;
    if (item.deferred_rationale) {
      line += ` (deferred: ${item.deferred_rationale})`;
    }
    out.push(line);
  }
  return out;
}

function renderPart(part: Part): string {
  const lines: string[] = [`### ${part.id}`, ""];
  lines.push(`- **Phase**: ${part.phase}`);
  lines.push(`- **Title**: ${part.title}`);
  lines.push(`- **Substatus**: ${part.substatus}`);
  if (part.owning_session) lines.push(`- **Owning Session**: ${part.owning_session}`);
  if (part.completing_session) lines.push(`- **Completing Session**: ${part.completing_session}`);
  if (part.outcome) lines.push(`- **Outcome**: ${part.outcome}`);
  if (part.source_artifacts.length > 0) {
    lines.push(`- **Source Artifacts**: ${part.source_artifacts.join(", ")}`);
  } else {
    lines.push("- **Source Artifacts**: (none)");
  }
  if (part.depends_on.length > 0) {
    lines.push(`- **Depends On**: ${part.depends_on.join(", ")}`);
  } else {
    lines.push("- **Depends On**: (none)");
  }

  lines.push("", "**DoD**:", "");
  if (part.dod.length === 0) {
    lines.push("- (none)");
  } else {
    lines.push(...renderDodList(part.dod));
  }

  if (part.decisions && part.decisions.length > 0) {
    lines.push("", "**Decisions**:", "");
    lines.push("| ID | Status | Topic |");
    lines.push("|:--|:--|:--|");
    for (const d of part.decisions) {
      lines.push(`| ${d.id} | ${d.status} | ${d.topic} |`);
    }
  }

  return lines.join(NL);
}

function renderPhaseProgression(plan: PlanNote): string {
  const lines = ["## Phase Progression", ""];
  for (let i = 0; i < plan.parts.length; i++) {
    const part = plan.parts[i];
    if (!part) continue;
    lines.push(renderPart(part));
    if (i < plan.parts.length - 1) lines.push("");
  }
  return lines.join(NL);
}

function renderTaskTable(label: string, tasks: Task[]): string {
  const lines: string[] = [`### ${label}`, ""];
  if (tasks.length === 0) {
    lines.push("(none)");
    return lines.join(NL);
  }
  lines.push("| ID | Subject | Part | Status | Effort | Agent | Files | Created | Resolved |");
  lines.push("|:--|:--|:--|:--|:--|:--|:--|:--|:--|");
  for (const t of tasks) {
    const files = t.files.length > 0 ? t.files.join("; ") : "—";
    const effort = t.effort ?? "—";
    const agent = t.agent ?? "—";
    const created = t.created_at_event ?? "—";
    const resolved = t.resolved_at_event ?? "—";
    lines.push(
      `| ${t.id} | ${t.subject} | ${t.part} | ${t.status} | ${effort} | ${agent} | ${files} | ${created} | ${resolved} |`,
    );
  }
  return lines.join(NL);
}

function renderTasks(plan: PlanNote): string {
  const active = plan.tasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "PENDING" || t.status === "BLOCKED",
  );
  const backlog = plan.tasks.filter((_t) => false); // Spec only defines 3 partitions; backlog reserved for future "scheduled but not yet pending" — currently empty by definition.
  const archive = plan.tasks.filter(
    (t) => t.status === "DONE" || t.status === "DEFERRED" || t.status === "ABANDONED",
  );

  // Sort each partition by ID for stability
  const idOrder = (a: Task, b: Task) => a.id.localeCompare(b.id);
  active.sort(idOrder);
  backlog.sort(idOrder);
  archive.sort(idOrder);

  const lines = ["## Tasks", ""];
  lines.push(renderTaskTable("Active", active));
  lines.push("");
  lines.push(renderTaskTable("Backlog", backlog));
  lines.push("");
  lines.push(renderTaskTable("Archive", archive));
  return lines.join(NL);
}

function renderPendingDecisions(pds: PendingDecision[]): string {
  const lines = ["## Pending User Decisions", ""];
  if (pds.length === 0) {
    lines.push("(none)");
    return lines.join(NL);
  }
  for (let i = 0; i < pds.length; i++) {
    const pd = pds[i];
    if (!pd) continue;
    lines.push(`### ${pd.id}`);
    lines.push("");
    lines.push(`- **Part**: ${pd.part}`);
    lines.push(`- **Surfaced At Event**: ${pd.surfaced_at_event}`);
    lines.push(`- **Surfaced Session**: ${pd.surfaced_session}`);
    lines.push(`- **Question**: ${pd.question}`);
    lines.push("");
    lines.push("**Options**:");
    lines.push("");
    for (const opt of pd.options) {
      lines.push(`- **${opt.label}**: ${opt.description}`);
    }
    if (i < pds.length - 1) lines.push("");
  }
  return lines.join(NL);
}

function renderEditorMirror(rows: EditorMirrorEntry[]): string {
  const lines = ["## Editor Mirror IDs", ""];
  if (rows.length === 0) {
    lines.push("(none)");
    return lines.join(NL);
  }
  lines.push("| Task | CC ID | Cursor ID | Last Synced |");
  lines.push("|:--|:--|:--|:--|");
  for (const r of rows) {
    lines.push(
      `| ${r.task_id} | ${r.cc_id ?? "—"} | ${r.cursor_id ?? "—"} | ${r.last_synced ?? "—"} |`,
    );
  }
  return lines.join(NL);
}

function renderBlockers(blockers: string[]): string {
  const lines = ["## Blockers", ""];
  if (blockers.length === 0) {
    lines.push("(none)");
    return lines.join(NL);
  }
  for (const b of blockers) lines.push(`- ${b}`);
  return lines.join(NL);
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

export function renderPlanNote(plan: PlanNote): string {
  const sections: string[] = [];
  sections.push(renderFrontmatter(plan.frontmatter));
  sections.push("");
  sections.push(`# ${plan.frontmatter.title}`);
  sections.push("");
  sections.push(renderScope(plan));
  sections.push("");
  sections.push(renderObjectives(plan));
  sections.push("");
  sections.push(renderProgressDashboard(plan));
  sections.push("");
  sections.push(renderDepsGraph(plan));
  sections.push("");
  sections.push(renderPhaseProgression(plan));
  sections.push("");
  sections.push(renderTasks(plan));
  sections.push("");
  sections.push(renderPendingDecisions(plan.pending_decisions));
  sections.push("");
  sections.push(renderEditorMirror(plan.editor_mirror));
  sections.push("");
  sections.push(renderBlockers(plan.blockers));
  sections.push("");
  sections.push(renderObservations(plan.observations));
  sections.push("");
  sections.push(renderRelations(plan.relations));
  sections.push("");
  return sections.join(NL);
}
