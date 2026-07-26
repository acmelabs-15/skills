import type { List, ListItem, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Observation, Relation } from "../schemas/common.js";
import type {
  EarsAcceptanceItem,
  RequirementFrontmatter,
  RequirementNote,
} from "../schemas/requirement-note.js";
import { RequirementNoteSchema } from "../schemas/requirement-note.js";
import { ParseError, extractFrontmatter, proseFromChildren, sectionizeH2 } from "./ast-helpers.js";
import { parseRelations } from "../core/relations.js";

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

function asString(v: unknown): string {
  if (typeof v !== "string") throw new ParseError(`expected string, got ${typeof v}`, []);
  return v;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) throw new ParseError("expected array", []);
  return v.map((x) => asString(x));
}

function parseFrontmatter(raw: Record<string, unknown>): RequirementFrontmatter {
  return {
    title: asString(raw["title"]),
    type: "requirement",
    permalink: asString(raw["permalink"]),
    status: asString(raw["status"]) as RequirementFrontmatter["status"],
    tags: asStringArray(raw["tags"]),
  };
}

function parseAcDeferred(text: string): {
  text: string;
  deferred_rationale: string | undefined;
} {
  const m = text.match(/^([\s\S]*?)\s*\(deferred:\s*(.+)\)\s*$/);
  if (m?.[1] !== undefined && m[2] !== undefined) {
    return { text: m[1].trim(), deferred_rationale: m[2].trim() };
  }
  return { text, deferred_rationale: undefined };
}

function parseAcceptanceCriteria(children: RootContent[]): EarsAcceptanceItem[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: EarsAcceptanceItem[] = [];
  for (const item of list.children as ListItem[]) {
    if (typeof item.checked !== "boolean") continue;
    const raw = mdToString(item).trim();
    const parsed = parseAcDeferred(raw);
    const ac: EarsAcceptanceItem = { text: parsed.text, done: item.checked };
    if (parsed.deferred_rationale) ac.deferred_rationale = parsed.deferred_rationale;
    out.push(ac);
  }
  return out;
}

function listItemText(item: RootContent): string {
  const children = (item as { children?: RootContent[] }).children ?? [];
  return proseFromChildren(children).trim();
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


export function parseRequirementNote(markdown: string): RequirementNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);
  const requirementStatement = proseFromChildren(sections.get("Requirement Statement") ?? []);
  const patternProse = proseFromChildren(sections.get("Pattern") ?? []);
  const priorityProse = proseFromChildren(sections.get("Priority") ?? []);
  const categoryProse = proseFromChildren(sections.get("Category") ?? []);
  const contextProse = proseFromChildren(sections.get("Context") ?? []);

  const model: RequirementNote = {
    frontmatter,
    requirement_statement: requirementStatement,
    acceptance_criteria: parseAcceptanceCriteria(sections.get("Acceptance Criteria") ?? []),
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };
  if (patternProse.length > 0) model.pattern = patternProse;
  if (priorityProse.length > 0) model.priority = priorityProse;
  if (categoryProse.length > 0) model.category = categoryProse;
  if (contextProse.length > 0) model.context = contextProse;

  return RequirementNoteSchema.parse(model);
}
