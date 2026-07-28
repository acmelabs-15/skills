import type { List, ListItem, Paragraph, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseRelations } from "../relations.js";
import type { Observation } from "../schemas/common.js";
import type {
  DodCheckboxItem,
  EffortSummaryRow,
  FileAffected,
  TaskFrontmatter,
  TaskNote,
} from "../schemas/task-note.js";
import { TaskNoteSchema } from "../schemas/task-note.js";
import {
  ParseError,
  extractFrontmatter,
  findTable,
  proseFromChildren,
  sectionizeH2,
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

function parseFrontmatter(raw: Record<string, unknown>): TaskFrontmatter {
  const fm: TaskFrontmatter = {
    title: asString(raw["title"]),
    type: "task",
    permalink: asString(raw["permalink"]),
    status: asString(raw["status"]) as TaskFrontmatter["status"],
    tags: asStringArray(raw["tags"]),
  };
  const effort = raw["effort"];
  if (typeof effort === "string" && effort.length > 0) {
    fm.effort = effort as TaskFrontmatter["effort"];
  }
  const estimate = raw["estimate"];
  if (typeof estimate === "string" && estimate.length > 0) {
    fm.estimate = estimate;
  }
  return fm;
}

function listItemText(item: RootContent): string {
  const children = (item as { children?: RootContent[] }).children ?? [];
  return proseFromChildren(children).trim();
}

function flatListTexts(list: List): string[] {
  const out: string[] = [];
  for (const item of list.children as ListItem[]) {
    // Skip checkbox-typed items (handled separately)
    if (typeof item.checked === "boolean") {
      out.push(mdToString(item).trim());
      continue;
    }
    const text = mdToString(item).trim();
    if (text.length > 0) out.push(text);
  }
  return out;
}

function isStrongMarker(node: RootContent, label: string): boolean {
  if (node.type !== "paragraph") return false;
  const text = mdToString(node as Paragraph).trim();
  // Match shapes like "**In Scope**:" or "**In Scope**" (with/without colon)
  const stripped = text.replace(/[:\s]+$/, "").trim();
  return stripped === `**${label}**` || stripped === label;
}

function findListAfter(children: RootContent[], startIdx: number): List | undefined {
  for (let i = startIdx + 1; i < children.length; i++) {
    const node = children[i];
    if (!node) continue;
    if (node.type === "paragraph") {
      // Another strong marker breaks the search — caller handles that case.
      const text = mdToString(node as Paragraph).trim();
      if (/^\*\*[^*]+\*\*[:\s]*$/.test(text)) return undefined;
      continue;
    }
    if (node.type === "list") return node as List;
    if (node.type === "heading") return undefined;
  }
  return undefined;
}

function parseScope(children: RootContent[]): { scope_in: string[]; scope_out: string[] } {
  let inScope: string[] | undefined;
  let outScope: string[] | undefined;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (!node) continue;
    if (isStrongMarker(node, "In Scope")) {
      const list = findListAfter(children, i);
      if (list) inScope = flatListTexts(list);
    } else if (isStrongMarker(node, "Out of Scope")) {
      const list = findListAfter(children, i);
      if (list) outScope = flatListTexts(list);
    }
  }

  // Looser style: no In/Out markers — single flat list maps to scope_in.
  if (inScope === undefined && outScope === undefined) {
    const list = children.find((n): n is List => n.type === "list");
    return {
      scope_in: list ? flatListTexts(list) : [],
      scope_out: [],
    };
  }
  return {
    scope_in: inScope ?? [],
    scope_out: outScope ?? [],
  };
}

function parseFilesAffected(children: RootContent[]): FileAffected[] {
  const tbl = findTable(children);
  if (!tbl) return [];
  const rows = tableRows(tbl);
  const out: FileAffected[] = [];
  for (const r of rows) {
    const file = (r["File"] ?? "").replace(/^`/, "").replace(/`$/, "").trim();
    const action = (r["Action"] ?? "").trim();
    const purpose = (r["Purpose"] ?? "").trim();
    if (!file || !action || !purpose) continue;
    out.push({
      file,
      action: action as FileAffected["action"],
      purpose,
    });
  }
  return out;
}

function parseFlatList(children: RootContent[]): string[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  return flatListTexts(list);
}

function parseDodFromText(text: string): {
  text: string;
  deferred_rationale: string | undefined;
} {
  const m = text.match(/^(.*?)\s*\(deferred:\s*(.+)\)\s*$/);
  if (m?.[1] !== undefined && m[2] !== undefined) {
    return { text: m[1].trim(), deferred_rationale: m[2].trim() };
  }
  return { text, deferred_rationale: undefined };
}

function parseCheckboxList(children: RootContent[]): DodCheckboxItem[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: DodCheckboxItem[] = [];
  for (const item of list.children as ListItem[]) {
    if (typeof item.checked !== "boolean") continue;
    const raw = mdToString(item).trim();
    const parsed = parseDodFromText(raw);
    const dod: DodCheckboxItem = { text: parsed.text, done: item.checked };
    if (parsed.deferred_rationale) dod.deferred_rationale = parsed.deferred_rationale;
    out.push(dod);
  }
  return out;
}

function parseEffortSummary(children: RootContent[]): EffortSummaryRow[] {
  const tbl = findTable(children);
  if (!tbl) return [];
  const rows = tableRows(tbl);
  const out: EffortSummaryRow[] = [];
  for (const r of rows) {
    const tier = (r["Tier"] ?? "").trim();
    const estimate = (r["Estimate"] ?? "").trim();
    const notes = (r["Notes"] ?? "").trim();
    if (!tier || !estimate) continue;
    out.push({
      tier: tier as EffortSummaryRow["tier"],
      estimate,
      notes,
    });
  }
  return out;
}

function parseObservations(children: RootContent[]): Observation[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: Observation[] = [];
  for (const item of list.children as ListItem[]) {
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

export function parseTaskNote(markdown: string): TaskNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);
  const objective = proseFromChildren(sections.get("Objective") ?? []);
  const scope = parseScope(sections.get("Scope") ?? []);
  const designContextProse = proseFromChildren(sections.get("Design Context") ?? []);
  const implNotesProse = proseFromChildren(sections.get("Implementation Notes") ?? []);

  const model: TaskNote = {
    frontmatter,
    objective,
    scope_in: scope.scope_in,
    scope_out: scope.scope_out,
    files_affected: parseFilesAffected(sections.get("Files Affected") ?? []),
    testing_requirements: parseFlatList(sections.get("Testing Requirements") ?? []),
    definition_of_done: parseCheckboxList(sections.get("Definition of Done") ?? []),
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };
  if (designContextProse.length > 0) model.design_context = designContextProse;
  if (implNotesProse.length > 0) model.implementation_notes = implNotesProse;
  if (sections.has("ADR Compliance")) {
    const adr = parseCheckboxList(sections.get("ADR Compliance") ?? []);
    if (adr.length > 0) model.adr_compliance = adr;
  }
  const effortSummary = parseEffortSummary(sections.get("Effort Summary") ?? []);
  if (effortSummary.length > 0) model.effort_summary = effortSummary;

  return TaskNoteSchema.parse(model);
}
