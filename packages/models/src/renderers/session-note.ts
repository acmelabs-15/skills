import yaml from "js-yaml";
import type { Observation, Relation } from "../schemas/common.js";
import type { BoundPlanRef, Event, SessionNote } from "../schemas/session-note.js";

/**
 * SessionNote renderer (ADR-003 D-3 deterministic Bun+TS render).
 *
 * Canonical section order:
 *   frontmatter → H1 → Scope → Bound PLAN → per-event H2 → Observations → Relations.
 *
 * Each event is rendered as a `## Event NN — Title` H2 with typed-field bullets
 * first, then prose body. Field order per event type is fixed for round-trip
 * stability.
 */

const NL = "\n";

function renderFrontmatter(fm: SessionNote["frontmatter"]): string {
  const ordered: Record<string, unknown> = {
    title: fm.title,
    type: fm.type,
    status: fm.status,
    binds_to: fm.binds_to,
    permalink: fm.permalink,
    tags: fm.tags,
  };
  const body = yaml
    .dump(ordered, { lineWidth: -1, quotingType: '"', forceQuotes: false })
    .trimEnd();
  return `---${NL}${body}${NL}---`;
}

function renderBoundPlans(plans: BoundPlanRef[]): string {
  const lines = ["## Bound Plans", ""];
  for (const p of plans) {
    lines.push(`- **Ref**: ${p.ref}`);
    lines.push(`  - **Worked Parts**: ${p.worked_parts.join(", ")}`);
  }
  return lines.join(NL);
}

function padN(n: number): string {
  return n.toString().padStart(2, "0");
}

function renderEvent(event: Event): string {
  const lines: string[] = [`## Event ${padN(event.n)} — ${event.title}`, ""];
  lines.push(`- **Type**: ${event.type}`);

  switch (event.type) {
    case "session-start":
      if (event.project) lines.push(`- **Project**: ${event.project}`);
      if (event.branch) lines.push(`- **Branch**: ${event.branch}`);
      if (event.starting_sha) lines.push(`- **Starting SHA**: ${event.starting_sha}`);
      break;
    case "bootstrap":
      if (event.step) lines.push(`- **Step**: ${event.step}`);
      break;
    case "part-transition":
      lines.push(`- **Part**: ${event.part}`);
      lines.push(`- **From**: ${event.from}`);
      lines.push(`- **To**: ${event.to}`);
      if (event.outcome) lines.push(`- **Outcome**: ${event.outcome}`);
      break;
    case "decision-lock":
      lines.push(`- **Part**: ${event.part}`);
      lines.push(`- **Decision IDs**: ${event.decision_ids.join(", ")}`);
      break;
    case "task-transition":
      lines.push(`- **Task**: ${event.task}`);
      lines.push(`- **From**: ${event.from}`);
      lines.push(`- **To**: ${event.to}`);
      break;
    case "agent-dispatch":
      lines.push(`- **Agent**: ${event.agent}`);
      if (event.task) lines.push(`- **Task**: ${event.task}`);
      if (event.part) lines.push(`- **Part**: ${event.part}`);
      if (event.token_usage !== undefined) lines.push(`- **Token Usage**: ${event.token_usage}`);
      if (event.duration_seconds !== undefined)
        lines.push(`- **Duration Seconds**: ${event.duration_seconds}`);
      break;
    case "debate-result":
      lines.push(`- **Target**: ${event.target}`);
      lines.push(`- **Verdict**: ${event.verdict}`);
      lines.push(
        `- **Tally**: accept=${event.tally.accept}, concerns=${event.tally.concerns}, block=${event.tally.block}`,
      );
      if (event.p0 !== undefined) lines.push(`- **P0**: ${event.p0}`);
      if (event.p1 !== undefined) lines.push(`- **P1**: ${event.p1}`);
      if (event.p2 !== undefined) lines.push(`- **P2**: ${event.p2}`);
      if (event.artifact) lines.push(`- **Artifact**: ${event.artifact}`);
      break;
    case "pending-decision-surfaced":
      lines.push(`- **PUD ID**: ${event.pud_id}`);
      lines.push(`- **Part**: ${event.part}`);
      break;
    case "pending-decision-resolved":
      lines.push(`- **PUD ID**: ${event.pud_id}`);
      lines.push(`- **Selected Option**: ${event.selected_option}`);
      break;
    case "state-change":
      lines.push(`- **Scope**: ${event.scope}`);
      lines.push(`- **Target**: ${event.target}`);
      break;
  }

  if (event.body) {
    lines.push("");
    lines.push(event.body);
  }
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

export function renderSessionNote(session: SessionNote): string {
  const sections: string[] = [];
  sections.push(renderFrontmatter(session.frontmatter));
  sections.push("");
  sections.push(`# ${session.frontmatter.title}`);
  sections.push("");
  sections.push("## Scope");
  sections.push("");
  sections.push(session.scope);
  sections.push("");
  sections.push(renderBoundPlans(session.bound_plans));
  sections.push("");
  for (let i = 0; i < session.events.length; i++) {
    const e = session.events[i];
    if (!e) continue;
    sections.push(renderEvent(e));
    sections.push("");
  }
  sections.push(renderObservations(session.observations));
  sections.push("");
  sections.push(renderRelations(session.relations));
  sections.push("");
  return sections.join(NL);
}
