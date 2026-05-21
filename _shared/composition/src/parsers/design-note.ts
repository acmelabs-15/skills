import type { List, ListItem, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Observation, Relation } from "../schemas/common.js";
import type {
  ComplianceCheckboxItem,
  DesignFrontmatter,
  DesignNote,
} from "../schemas/design-note.js";
import { DesignNoteSchema } from "../schemas/design-note.js";
import { ParseError, extractFrontmatter, proseFromChildren, sectionizeH2 } from "./ast-helpers.js";

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

/**
 * Section headings that are NOT folded into the opaque `sections` Record.
 * Observations and Relations have dedicated typed fields (universal final-two-
 * sections invariant). Compliance / Architecture Compliance is parsed as a
 * checkbox list into `compliance_criteria`.
 */
const SPECIAL_SECTIONS = new Set<string>([
  "Observations",
  "Relations",
  "Compliance",
  "Architecture Compliance",
]);

function asString(v: unknown): string {
  if (typeof v !== "string") throw new ParseError(`expected string, got ${typeof v}`, []);
  return v;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) throw new ParseError("expected array", []);
  return v.map((x) => asString(x));
}

function parseFrontmatter(raw: Record<string, unknown>): DesignFrontmatter {
  return {
    title: asString(raw["title"]),
    type: "design",
    permalink: asString(raw["permalink"]),
    status: asString(raw["status"]) as DesignFrontmatter["status"],
    tags: asStringArray(raw["tags"]),
  };
}

/**
 * Serialize an H2 section's children back to a single prose string.
 *
 * Goal: preserve as much section content as possible while staying within
 * the AST-helper toolkit. Paragraphs join with blank lines (proseFromChildren
 * convention). Non-paragraph nodes (code blocks, tables, lists) are flattened
 * via mdToString so callers see content even when the section is not pure
 * prose. The schema treats this as opaque text; the parser does not attempt
 * to round-trip structure.
 */
function serializeSectionContent(children: RootContent[]): string {
  const blocks: string[] = [];
  for (const node of children) {
    const text = mdToString(node).trim();
    if (text.length > 0) blocks.push(text);
  }
  return blocks.join("\n\n").trim();
}

function parseComplianceFromText(text: string): {
  text: string;
  deferred_rationale: string | undefined;
} {
  const m = text.match(/^([\s\S]*?)\s*\(deferred:\s*(.+)\)\s*$/);
  if (m?.[1] !== undefined && m[2] !== undefined) {
    return { text: m[1].trim(), deferred_rationale: m[2].trim() };
  }
  return { text, deferred_rationale: undefined };
}

function parseCompliance(children: RootContent[]): ComplianceCheckboxItem[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: ComplianceCheckboxItem[] = [];
  for (const item of list.children as ListItem[]) {
    if (typeof item.checked !== "boolean") continue;
    const raw = mdToString(item).trim();
    const parsed = parseComplianceFromText(raw);
    const c: ComplianceCheckboxItem = { text: parsed.text, done: item.checked };
    if (parsed.deferred_rationale) c.deferred_rationale = parsed.deferred_rationale;
    out.push(c);
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

function parseRelations(children: RootContent[]): Relation[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: Relation[] = [];
  for (const item of list.children as ListItem[]) {
    const text = listItemText(item);
    const m = text.match(/^(\w+)\s+\[\[(.+?)\]\]\s*$/);
    if (!m) continue;
    const [, verb, target] = m;
    if (!verb || !target) continue;
    out.push({ verb: verb as Relation["verb"], target });
  }
  return out;
}

export function parseDesignNote(markdown: string): DesignNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);

  // Build the opaque sections Record from every H2 that isn't special-cased.
  const opaqueSections: Record<string, string> = {};
  for (const [heading, children] of sections) {
    if (SPECIAL_SECTIONS.has(heading)) continue;
    const content = serializeSectionContent(children);
    if (content.length > 0) opaqueSections[heading] = content;
  }

  const model: DesignNote = {
    frontmatter,
    sections: opaqueSections,
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };

  // Either Compliance or Architecture Compliance, whichever is present.
  // If both exist, prefer "Compliance" then "Architecture Compliance".
  const complianceChildren = sections.get("Compliance") ?? sections.get("Architecture Compliance");
  if (complianceChildren) {
    const items = parseCompliance(complianceChildren);
    if (items.length > 0) model.compliance_criteria = items;
  }

  return DesignNoteSchema.parse(model);
}
