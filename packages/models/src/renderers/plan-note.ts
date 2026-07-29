import yaml from "js-yaml";
import type { Observation, Relation } from "../schemas/common.js";
import type {
  BuildWorkflowItem,
  DodItem,
  Part,
  PendingDecision,
  PlanNote,
  Task,
} from "../schemas/plan-note.js";

/**
 * PlanNote renderer (ADR-003 D-3 deterministic Bun+TS render).
 *
 * This rebuilds the ENTIRE document from the model. It is not a patcher and it
 * does not merge with the file on disk, so anything absent from the model is
 * absent from the output. An earlier version of this comment claimed the renderer
 * "regenerates the two derived sections", which understated it to the point of
 * being wrong: every section is regenerated, and unmodelled ones used to vanish.
 *
 * Modelled section order:
 *   frontmatter → H1 → Scope → Objectives → Phase Progression → Tasks →
 *   Pending User Decisions → Blockers → Observations →
 *   Relations.
 *
 * Two other categories share the document:
 *
 * - `unmodelled_sections` — H2s no field describes, carried verbatim by the
 *   parser and re-inserted here at their recorded position. This is what keeps a
 *   round trip from deleting authored content the schema has no opinion about.
 * - `DROPPED_H2_HEADINGS` — Progress Dashboard and Cross-Part Dependency Graph.
 *   Formerly derived rollups regenerated on every render; no longer emitted at
 *   all. A source file still carrying one parses cleanly and loses the section on
 *   output, with no error, because their presence is a historical artifact.
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
    lines.push("| ID | Status | Topic | Decision |");
    lines.push("|:--|:--|:--|:--|");
    for (const d of part.decisions) {
      // The verbatim chosen option is the point of the row: an audit downstream
      // compares an authored ADR against it. A pipe inside the text would break the
      // table, so it is escaped rather than dropped.
      const decision = d.decision ? d.decision.replaceAll("|", "\\|") : "—";
      lines.push(`| ${d.id} | ${d.status} | ${d.topic} | ${decision} |`);
    }
  }

  if (part.build_workflow_items && part.build_workflow_items.length > 0) {
    lines.push("", "**Build Workflow Items**:", "");
    const sorted = sortBuildWorkflowItems(part.build_workflow_items);
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      if (!item) continue;
      if (i > 0) lines.push("");
      lines.push(...renderBuildWorkflowItem(item));
    }
  }

  return lines.join(NL);
}

function sortBuildWorkflowItems(items: BuildWorkflowItem[]): BuildWorkflowItem[] {
  // Stable order: per task_ref ascending (lex), impl before qa within a task_ref.
  return [...items].sort((a, b) => {
    const taskCmp = a.task_ref.localeCompare(b.task_ref);
    if (taskCmp !== 0) return taskCmp;
    if (a.type === b.type) return 0;
    return a.type === "impl" ? -1 : 1;
  });
}

function renderBuildWorkflowItem(item: BuildWorkflowItem): string[] {
  return [
    `#### ${item.id}`,
    "",
    `- **Type**: ${item.type}`,
    `- **Task Ref**: ${item.task_ref}`,
    `- **Status**: ${item.status}`,
    `- **Owning Session**: ${item.owning_session ?? "—"}`,
    `- **Transitioned At Event**: ${item.transitioned_at_event ?? "—"}`,
    `- **Failed Iterations**: ${item.failed_iterations}`,
    `- **QA Ref**: ${item.qa_ref ?? "—"}`,
    `- **Fix Brief For Event**: ${item.fix_brief_for_event ?? "—"}`,
  ];
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

/**
 * Session-scoped work items, partitioned by status.
 *
 * Two partitions, not three. `Backlog` was `plan.tasks.filter((_t) => false)` —
 * hardcoded empty, so every task landed in Active or Archive regardless of status
 * and the section rendered `(none)` forever. A partition that cannot receive a row
 * is not a partition; it is a heading that lies about the model having somewhere to
 * put scheduled-but-not-started work. If that distinction is wanted later it needs
 * a status atom to hang on, not an empty filter.
 *
 * On what belongs here at all: these are session-scoped items — "Adjudicate Q1",
 * "Author ADR-001" — which are plan state with a status machine, per ADR-003 D-2.
 * SPEC tasks are a different thing and stay in the SPEC subtree, surfacing in a
 * plan only as derived rollup. The rule against a plan-level task tier is about
 * those, not about this register.
 */
function renderTasks(plan: PlanNote): string {
  const active = plan.tasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "PENDING" || t.status === "BLOCKED",
  );
  const archive = plan.tasks.filter(
    (t) => t.status === "DONE" || t.status === "DEFERRED" || t.status === "ABANDONED",
  );

  // Sort each partition by ID for stability
  const idOrder = (a: Task, b: Task) => a.id.localeCompare(b.id);
  active.sort(idOrder);
  archive.sort(idOrder);

  const lines = ["## Tasks", ""];
  lines.push(renderTaskTable("Active", active));
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
  // Modelled sections in canonical order, each tagged with the position it holds
  // among the source's H2s so preserved sections can be interleaved back in.
  const modelled: string[] = [
    renderScope(plan),
    renderObjectives(plan),
    renderPhaseProgression(plan),
    renderTasks(plan),
    renderPendingDecisions(plan.pending_decisions),
    renderBlockers(plan.blockers),
    renderObservations(plan.observations),
    renderRelations(plan.relations),
  ];

  // Preserved sections re-enter at their recorded index. Ascending order matters:
  // each splice shifts everything after it, so inserting low-to-high keeps every
  // later index valid without recomputing offsets.
  const body = [...modelled];
  const preserved = [...(plan.unmodelled_sections ?? [])].sort((a, b) => a.index - b.index);
  for (const section of preserved) {
    const at = Math.min(section.index, body.length);
    body.splice(at, 0, section.text);
  }

  const out: string[] = [
    renderFrontmatter(plan.frontmatter),
    "",
    `# ${plan.frontmatter.title}`,
    "",
  ];
  for (const section of body) {
    out.push(section);
    out.push("");
  }
  return out.join(NL);
}
