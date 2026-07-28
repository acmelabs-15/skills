import type { Heading, List, ListItem, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseRelations } from "../relations.js";
import type { Observation } from "../schemas/common.js";
import type {
  SpecPhase,
  SpecRootCheckboxItem,
  SpecRootFrontmatter,
  SpecRootNote,
} from "../schemas/spec-root-note.js";
import { SpecRootNoteSchema } from "../schemas/spec-root-note.js";
import { ParseError, extractFrontmatter, proseFromChildren, sectionizeH2 } from "./ast-helpers.js";

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

/**
 * Section headings NOT folded into the opaque `sections` Record. These have
 * dedicated typed fields on SpecRootNote.
 */
const SPECIAL_SECTIONS = new Set<string>([
  "Context",
  "Scope",
  "Phases",
  "Success Criteria",
  "Artifact Status",
  "Observations",
  "Relations",
]);

function asString(v: unknown): string {
  if (typeof v !== "string") throw new ParseError(`expected string, got ${typeof v}`, []);
  return v;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) throw new ParseError("expected array", []);
  return v.map((x) => asString(x));
}

function parseFrontmatter(raw: Record<string, unknown>): SpecRootFrontmatter {
  return {
    title: asString(raw["title"]),
    type: "spec",
    permalink: asString(raw["permalink"]),
    status: asString(raw["status"]) as SpecRootFrontmatter["status"],
    tags: asStringArray(raw["tags"]),
  };
}

function serializeSectionContent(children: RootContent[]): string {
  const blocks: string[] = [];
  for (const node of children) {
    const text = mdToString(node).trim();
    if (text.length > 0) blocks.push(text);
  }
  return blocks.join("\n\n").trim();
}

function flatListTexts(list: List): string[] {
  const out: string[] = [];
  for (const item of list.children as ListItem[]) {
    const text = mdToString(item).trim();
    if (text.length > 0) out.push(text);
  }
  return out;
}

/**
 * Parse `## Scope` looking for H3 sub-headings `### In Scope` / `### Out of Scope`.
 * Falls back to a flat top-level list assigned to `scope_in`.
 */
function parseScope(children: RootContent[]): { scope_in: string[]; scope_out: string[] } {
  let inScope: string[] | undefined;
  let outScope: string[] | undefined;
  let currentBucket: "in" | "out" | null = null;
  for (const node of children) {
    if (node.type === "heading" && (node as Heading).depth === 3) {
      const heading = mdToString(node as Heading).trim();
      if (/^in scope$/i.test(heading)) {
        currentBucket = "in";
      } else if (/^out of scope$/i.test(heading)) {
        currentBucket = "out";
      } else {
        currentBucket = null;
      }
      continue;
    }
    if (currentBucket && node.type === "list") {
      const items = flatListTexts(node as List);
      if (currentBucket === "in") inScope = (inScope ?? []).concat(items);
      else outScope = (outScope ?? []).concat(items);
    }
  }

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

const WIKILINK_RE = /\[\[([^\]]+?)\]\]/g;

function extractWikilinks(text: string): string[] {
  const refs: string[] = [];
  for (const m of text.matchAll(WIKILINK_RE)) {
    if (m[1]) refs.push(m[1].trim());
  }
  return refs;
}

/**
 * Parse `## Phases` looking for H3 sub-headings `### Phase N: <name>`. Each
 * phase aggregates wikilink refs found in its body (typically REQ refs).
 */
function parsePhases(children: RootContent[]): SpecPhase[] {
  const phases: SpecPhase[] = [];
  let currentName: string | null = null;
  let currentBody: RootContent[] = [];
  const flush = (): void => {
    if (currentName !== null) {
      const refs: string[] = [];
      for (const node of currentBody) {
        const text = mdToString(node);
        refs.push(...extractWikilinks(text));
      }
      phases.push({ name: currentName, req_refs: refs });
    }
  };
  for (const node of children) {
    if (node.type === "heading" && (node as Heading).depth === 3) {
      flush();
      currentName = mdToString(node as Heading).trim();
      currentBody = [];
      continue;
    }
    if (currentName !== null) currentBody.push(node);
  }
  flush();
  return phases;
}

function parseCheckboxItemText(text: string): {
  text: string;
  deferred_rationale: string | undefined;
} {
  const m = text.match(/^([\s\S]*?)\s*\(deferred:\s*(.+)\)\s*$/);
  if (m?.[1] !== undefined && m[2] !== undefined) {
    return { text: m[1].trim(), deferred_rationale: m[2].trim() };
  }
  return { text, deferred_rationale: undefined };
}

/**
 * Parse a checkbox list. Lists may live directly under the H2, or under H3
 * sub-headings (Artifact Status often has Requirements / Designs / Tasks
 * sub-buckets). Flatten across all lists in scope.
 */
function parseCheckboxList(children: RootContent[]): SpecRootCheckboxItem[] {
  const out: SpecRootCheckboxItem[] = [];
  for (const node of children) {
    if (node.type !== "list") continue;
    for (const item of (node as List).children as ListItem[]) {
      if (typeof item.checked !== "boolean") continue;
      const raw = mdToString(item).trim();
      const parsed = parseCheckboxItemText(raw);
      const cb: SpecRootCheckboxItem = { text: parsed.text, done: item.checked };
      if (parsed.deferred_rationale) cb.deferred_rationale = parsed.deferred_rationale;
      out.push(cb);
    }
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

export function parseSpecRootNote(markdown: string): SpecRootNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);
  const contextProse = proseFromChildren(sections.get("Context") ?? []);
  const scope = parseScope(sections.get("Scope") ?? []);

  const opaqueSections: Record<string, string> = {};
  for (const [heading, children] of sections) {
    if (SPECIAL_SECTIONS.has(heading)) continue;
    const content = serializeSectionContent(children);
    if (content.length > 0) opaqueSections[heading] = content;
  }

  const model: SpecRootNote = {
    frontmatter,
    context: contextProse,
    scope_in: scope.scope_in,
    scope_out: scope.scope_out,
    sections: opaqueSections,
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };

  if (sections.has("Phases")) {
    const phases = parsePhases(sections.get("Phases") ?? []);
    if (phases.length > 0) model.phases = phases;
  }
  if (sections.has("Success Criteria")) {
    const items = parseCheckboxList(sections.get("Success Criteria") ?? []);
    if (items.length > 0) model.success_criteria = items;
  }
  if (sections.has("Artifact Status")) {
    const items = parseCheckboxList(sections.get("Artifact Status") ?? []);
    if (items.length > 0) model.artifact_status = items;
  }

  return SpecRootNoteSchema.parse(model);
}
