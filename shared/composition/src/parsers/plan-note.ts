import type { Heading, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Observation, Relation } from "../schemas/common.js";
import type {
  BuildWorkflowItem,
  DecisionState,
  DodItem,
  EditorMirrorEntry,
  Part,
  PendingDecision,
  PlanNote,
  Task,
} from "../schemas/plan-note.js";
import { PlanNoteSchema } from "../schemas/plan-note.js";
import {
  ParseError,
  bulletFieldMap,
  checkboxItems,
  extractFrontmatter,
  findTable,
  proseFromChildren,
  sectionizeH2,
  sectionizeH3,
  tableRows,
} from "./ast-helpers.js";

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

function asString(v: unknown): string {
  if (typeof v !== "string") throw new ParseError(`expected string, got ${typeof v}`, []);
  return v;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) throw new ParseError("expected array", []);
  return v.map((x) => asString(x));
}

function parseFrontmatter(raw: Record<string, unknown>): PlanNote["frontmatter"] {
  return {
    title: asString(raw["title"]),
    type: "plan",
    status: asString(raw["status"]) as PlanNote["frontmatter"]["status"],
    complexity_tier: asString(raw["complexity_tier"]) as PlanNote["frontmatter"]["complexity_tier"],
    branches: asStringArray(raw["branches"]),
    permalink: asString(raw["permalink"]),
    tags: asStringArray(raw["tags"]),
  };
}

function parseScope(children: RootContent[]): { scope: string; source_reference?: string } {
  // First paragraph(s) are scope; a trailing paragraph starting with **Source**: is source_reference
  const paragraphs: string[] = [];
  let sourceReference: string | undefined;
  for (const node of children) {
    if (node.type !== "paragraph") continue;
    const text = proseFromChildren([node]);
    const sourceMatch = text.match(/^(?:\*\*)?Source(?:\*\*)?:\s*(.+)$/);
    if (sourceMatch?.[1]) {
      sourceReference = sourceMatch[1];
    } else {
      paragraphs.push(text);
    }
  }
  const scope = paragraphs.join("\n\n");
  if (sourceReference !== undefined) {
    return { scope, source_reference: sourceReference };
  }
  return { scope };
}

function parseObjectives(children: RootContent[]): PlanNote["objectives"] {
  return checkboxItems(children).map((it, idx) => ({
    id: `O-${idx + 1}`,
    text: it.text,
    done: it.done,
  }));
}

function parseDodFromText(text: string): {
  text: string;
  done: boolean;
  deferred_rationale?: string;
} {
  const m = text.match(/^(.*?)\s*\(deferred:\s*(.+)\)\s*$/);
  if (m?.[1] !== undefined && m[2] !== undefined) {
    return { text: m[1].trim(), done: false, deferred_rationale: m[2].trim() };
  }
  return { text, done: false };
}

function parseDodList(children: RootContent[]): DodItem[] {
  const items = checkboxItems(children);
  return items.map((it) => {
    const parsed = parseDodFromText(it.text);
    const out: DodItem = { text: parsed.text, done: it.done };
    if (parsed.deferred_rationale) out.deferred_rationale = parsed.deferred_rationale;
    return out;
  });
}

function parsePart(partId: string, children: RootContent[]): Part {
  const fieldMap = bulletFieldMap(children);
  const part: Part = {
    id: partId,
    phase: fieldMap.get("Phase") ?? "",
    title: fieldMap.get("Title") ?? "",
    substatus: (fieldMap.get("Substatus") ?? "PENDING") as Part["substatus"],
    source_artifacts: parseListField(fieldMap.get("Source Artifacts")),
    depends_on: parseListField(fieldMap.get("Depends On")),
    dod: [],
  };
  const owning = fieldMap.get("Owning Session");
  if (owning) part.owning_session = owning;
  const completing = fieldMap.get("Completing Session");
  if (completing) part.completing_session = completing;
  const outcome = fieldMap.get("Outcome");
  if (outcome) part.outcome = outcome;

  // DoD list is the SECOND list in the part body (first list is the bullet fields)
  const lists = children.filter((n) => n.type === "list");
  if (lists.length >= 2) {
    const dodList = lists[1];
    if (dodList) part.dod = parseDodList([dodList]);
  }

  // Decisions table (if present)
  const tbl = findTable(children);
  if (tbl) {
    const rows = tableRows(tbl);
    const decisions: DecisionState[] = rows.map((r) => ({
      id: r["ID"] ?? "",
      status: (r["Status"] ?? "PENDING") as DecisionState["status"],
      topic: r["Topic"] ?? "",
    }));
    if (decisions.length > 0) part.decisions = decisions;
  }

  // Build Workflow Items (if present) — H4 blocks beneath this part.
  const buildItems = parseBuildWorkflowItems(children);
  if (buildItems.length > 0) part.build_workflow_items = buildItems;
  return part;
}

function optStr(value: string | undefined): string | undefined {
  if (value === undefined || value === "—" || value === "") return undefined;
  return value;
}

function optNum(value: string | undefined): number | undefined {
  const s = optStr(value);
  if (s === undefined) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function parseBuildWorkflowItems(children: RootContent[]): BuildWorkflowItem[] {
  // Walk the flat children list; for each H4 heading, the next list contains
  // the bullet fields for that build workflow item. Renderer order is
  // deterministic: `#### {id}` followed by an 8-bullet list.
  const items: BuildWorkflowItem[] = [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (!node || node.type !== "heading") continue;
    if ((node as Heading).depth !== 4) continue;
    const id = mdToString(node as Heading).trim();
    // Find the next list following this heading (skip paragraphs between).
    let listChild: RootContent | undefined;
    for (let j = i + 1; j < children.length; j++) {
      const candidate = children[j];
      if (!candidate) continue;
      if (candidate.type === "heading") break;
      if (candidate.type === "list") {
        listChild = candidate;
        break;
      }
    }
    if (!listChild) continue;
    const fm = bulletFieldMap([listChild]);
    const type = fm.get("Type") as BuildWorkflowItem["type"] | undefined;
    const taskRef = fm.get("Task Ref");
    const status = fm.get("Status") as BuildWorkflowItem["status"] | undefined;
    const failedIterationsRaw = fm.get("Failed Iterations");
    if (!type || !taskRef || !status) continue;
    const item: BuildWorkflowItem = {
      id,
      type,
      task_ref: taskRef,
      status,
      failed_iterations: failedIterationsRaw === undefined ? 0 : (Number(failedIterationsRaw) ?? 0),
    };
    const owningSession = optStr(fm.get("Owning Session"));
    if (owningSession !== undefined) item.owning_session = owningSession;
    const transitionedAt = optNum(fm.get("Transitioned At Event"));
    if (transitionedAt !== undefined) item.transitioned_at_event = transitionedAt;
    const testReportRef = optStr(fm.get("Test Report Ref"));
    if (testReportRef !== undefined) item.test_report_ref = testReportRef;
    const fixBriefFor = optNum(fm.get("Fix Brief For Event"));
    if (fixBriefFor !== undefined) item.fix_brief_for_event = fixBriefFor;
    items.push(item);
  }
  return items;
}

function parseListField(value: string | undefined): string[] {
  if (!value || value === "(none)") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parsePhaseProgression(children: RootContent[]): Part[] {
  const partSections = sectionizeH3(children);
  const parts: Part[] = [];
  for (const [partId, partChildren] of partSections) {
    parts.push(parsePart(partId, partChildren));
  }
  return parts;
}

function parseTaskTable(children: RootContent[]): Task[] {
  const tbl = findTable(children);
  if (!tbl) return [];
  const rows = tableRows(tbl);
  const tasks: Task[] = [];
  for (const r of rows) {
    const task: Task = {
      id: r["ID"] ?? "",
      subject: r["Subject"] ?? "",
      part: r["Part"] ?? "",
      files: r["Files"] && r["Files"] !== "—" ? r["Files"].split(";").map((s) => s.trim()) : [],
      status: (r["Status"] ?? "PENDING") as Task["status"],
    };
    const effort = r["Effort"];
    if (effort && effort !== "—") task.effort = effort as Task["effort"];
    const agent = r["Agent"];
    if (agent && agent !== "—") task.agent = agent;
    const created = r["Created"];
    if (created && created !== "—") task.created_at_event = Number(created);
    const resolved = r["Resolved"];
    if (resolved && resolved !== "—") task.resolved_at_event = Number(resolved);
    tasks.push(task);
  }
  return tasks;
}

function parseTasks(children: RootContent[]): Task[] {
  const subs = sectionizeH3(children);
  const all: Task[] = [];
  for (const label of ["Active", "Backlog", "Archive"]) {
    const c = subs.get(label);
    if (!c) continue;
    all.push(...parseTaskTable(c));
  }
  return all;
}

function parsePendingDecisions(children: RootContent[]): PendingDecision[] {
  const subs = sectionizeH3(children);
  const pds: PendingDecision[] = [];
  for (const [pudId, pudChildren] of subs) {
    const fm = bulletFieldMap(pudChildren);
    // Find options list (the SECOND list — first is the field bullets)
    const lists = pudChildren.filter((n) => n.type === "list");
    const options: PendingDecision["options"] = [];
    if (lists.length >= 2) {
      const optList = lists[1];
      if (optList) {
        const optMap = bulletFieldMap([optList]);
        for (const [label, description] of optMap) {
          options.push({ label, description });
        }
      }
    }
    if (options.length < 2) continue; // skip malformed PUDs
    pds.push({
      id: pudId,
      part: fm.get("Part") ?? "",
      question: fm.get("Question") ?? "",
      surfaced_at_event: Number(fm.get("Surfaced At Event") ?? 0),
      surfaced_session: fm.get("Surfaced Session") ?? "",
      options,
    });
  }
  return pds;
}

function parseEditorMirror(children: RootContent[]): EditorMirrorEntry[] {
  const tbl = findTable(children);
  if (!tbl) return [];
  const rows = tableRows(tbl);
  return rows.map((r) => ({
    task_id: r["Task"] ?? "",
    cc_id: r["CC ID"] === "—" ? null : (r["CC ID"] ?? null),
    cursor_id: r["Cursor ID"] === "—" ? null : (r["Cursor ID"] ?? null),
    last_synced: r["Last Synced"] === "—" ? null : (r["Last Synced"] ?? null),
  }));
}

function parseBlockers(children: RootContent[]): string[] {
  const list = children.find((n) => n.type === "list");
  if (!list) return [];
  // List items where the text is not "(none)"
  const items: string[] = [];
  for (const item of (list as { children: RootContent[] }).children as RootContent[]) {
    const text = listItemText(item);
    if (text && text !== "(none)") items.push(text);
  }
  return items;
}

function listItemText(item: RootContent): string {
  const children = (item as { children?: RootContent[] }).children ?? [];
  return proseFromChildren(children).trim();
}

function parseObservations(children: RootContent[]): Observation[] {
  const list = children.find((n) => n.type === "list");
  if (!list) return [];
  const out: Observation[] = [];
  for (const item of (list as { children: RootContent[] }).children as RootContent[]) {
    const text = listItemText(item);
    const m = text.match(/^\[(\w+)\]\s+(.+?)(?:\s+((?:#[\w-]+\s*)+))?\s*$/);
    if (!m) continue;
    const [, category, body, tagPart] = m;
    if (!category || !body) continue;
    const tags = tagPart
      ? tagPart
          .trim()
          .split(/\s+/)
          .map((t) => t.slice(1))
      : [];
    out.push({
      category: category as Observation["category"],
      text: body.trim(),
      tags,
    });
  }
  return out;
}

function parseRelations(children: RootContent[]): Relation[] {
  const list = children.find((n) => n.type === "list");
  if (!list) return [];
  const out: Relation[] = [];
  for (const item of (list as { children: RootContent[] }).children as RootContent[]) {
    const text = listItemText(item);
    const m = text.match(/^(\w+)\s+\[\[(.+?)\]\]\s*$/);
    if (!m) continue;
    const [, verb, target] = m;
    if (!verb || !target) continue;
    out.push({ verb: verb as Relation["verb"], target });
  }
  return out;
}

export function parsePlanNote(markdown: string): PlanNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);
  const scopeChildren = sections.get("Scope") ?? [];
  const scopeData = parseScope(scopeChildren);

  const model: PlanNote = {
    frontmatter,
    scope: scopeData.scope,
    objectives: parseObjectives(sections.get("Objectives") ?? []),
    parts: parsePhaseProgression(sections.get("Phase Progression") ?? []),
    tasks: parseTasks(sections.get("Tasks") ?? []),
    pending_decisions: parsePendingDecisions(sections.get("Pending User Decisions") ?? []),
    editor_mirror: parseEditorMirror(sections.get("Editor Mirror IDs") ?? []),
    blockers: parseBlockers(sections.get("Blockers") ?? []),
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };
  if (scopeData.source_reference !== undefined) {
    model.source_reference = scopeData.source_reference;
  }
  return PlanNoteSchema.parse(model);
}
