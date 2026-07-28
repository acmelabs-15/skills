import type { List, ListItem, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseRelations } from "../core/relations.js";
import type { Observation } from "../schemas/common.js";
import type { EpicFrontmatter, EpicNote } from "../schemas/epic-note.js";
import { EpicNoteSchema } from "../schemas/epic-note.js";
import {
  extractFrontmatter,
  findTable,
  proseFromChildren,
  sectionizeH2,
  stripWikilink,
  tableRows,
} from "./ast-helpers.js";

/**
 * EpicNote parser (SPEC-008 TASK-006, REQ-002 New Parser Suite, 2026-05-24).
 *
 * Pattern mirrors `parseAdrNote` (TASK-005): unified+remark for AST, js-yaml via
 * extractFrontmatter for YAML, ast-helpers for shared section/list parsing.
 * Non-typed body sections fold into an opaque `sections: Record<string,string>`,
 * exactly the design of EpicNoteSchema (TASK-003).
 *
 * Per-type variation: EPIC parses the `## Contained Specs` body section into a
 * `containedSpecs: string[]` of SPEC references (TASK DoD item 5). The section
 * may be authored either as a GFM table (a `Spec` / `SPEC` column) or as a
 * bullet list of `[[SPEC-NNN: ...]]` wikilinks; both shapes yield the same
 * string array. The list mirrors the `contains` Relations entries (REQ-002 AC:
 * "a `contains` relation array populated from the Relations section"). The
 * derived list is surfaced as `containedSpecs` on the parser return value, NOT
 * a field on the schema-validated `EpicNote`: EpicNoteSchema is `.strict()`, so
 * the derived list rides alongside the validated note, keeping the model a
 * clean `.parse()` round-trip. The structural rejection (contains relations
 * present but Contained Specs section absent) is enforced by the schema
 * superRefine via section-key presence.
 *
 * The schema's `type: z.literal("epic")` is the parser's type-guard for
 * misrouted markdown: feeding non-EPIC markdown fails at the frontmatter
 * sub-schema layer with a typed Zod path.
 */

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

/**
 * H2 section headings that are NOT folded into the opaque `sections` Record
 * for their typed content. Contained Specs is the one structurally-parsed
 * section but it ALSO stays in the opaque Record so the schema superRefine can
 * detect its presence by exact key under the contains-relations gate.
 */
const SPECIAL_SECTIONS = new Set<string>(["Observations", "Relations"]);

/**
 * Canonical heading text for the Contained Specs body section. Matches the
 * EpicNoteSchema convention.
 */
const CONTAINED_SPECS_SECTION = "Contained Specs";

/**
 * Parser return type: the schema-validated EpicNote plus the derived
 * `containedSpecs` array (TASK DoD item 5). The array is the SPEC reference
 * list parsed from the Contained Specs body section, mirroring the `contains`
 * Relations entries.
 */
export type ParsedEpicNote = EpicNote & { containedSpecs: string[] };

/**
 * Build the frontmatter view passed to EpicNoteSchema. Per-field type checks
 * are delegated to the Zod schema so the caller receives a single, structured
 * ZodError with `path` arrays for every malformed field.
 */
function parseFrontmatter(raw: Record<string, unknown>): EpicFrontmatter {
  return {
    title: raw["title"] as EpicFrontmatter["title"],
    type: raw["type"] as EpicFrontmatter["type"],
    status: raw["status"] as EpicFrontmatter["status"],
    permalink: raw["permalink"] as EpicFrontmatter["permalink"],
    tags: raw["tags"] as EpicFrontmatter["tags"],
  };
}

/**
 * Serialize an H2 section's children back to a single prose string. Same
 * convention as parseAdrNote.
 */
function serializeSectionContent(children: RootContent[]): string {
  const blocks: string[] = [];
  for (const node of children) {
    const text = mdToString(node).trim();
    if (text.length > 0) blocks.push(text);
  }
  return blocks.join("\n\n").trim();
}

/**
 * Parse the Contained Specs section into a list of SPEC references. Accepts
 * two real-world shapes that emit the same string array:
 *   (a) a GFM table with a `Spec` / `SPEC` column (other columns ignored), and
 *   (b) a bullet list of `[[SPEC-NNN: ...]]` wikilinks or bare SPEC text.
 * Returns an empty array when the section has no parseable rows.
 */
function parseContainedSpecs(children: RootContent[]): string[] {
  const fromTable = parseContainedSpecsTable(children);
  if (fromTable.length > 0) return fromTable;
  return parseContainedSpecsList(children);
}

function parseContainedSpecsTable(children: RootContent[]): string[] {
  const table = findTable(children);
  if (!table) return [];
  const rows = tableRows(table);
  if (rows.length === 0) return [];
  const out: string[] = [];
  for (const row of rows) {
    const specKey = Object.keys(row).find((k) => /^spec$/i.test(k));
    if (!specKey) continue;
    const cell = (row[specKey] ?? "").trim();
    const ref = normalizeSpecRef(cell);
    if (ref.length > 0) out.push(ref);
  }
  return out;
}

function parseContainedSpecsList(children: RootContent[]): string[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: string[] = [];
  for (const item of list.children as ListItem[]) {
    const text = mdToString(item).trim();
    if (text.length === 0) continue;
    const ref = normalizeSpecRef(text);
    if (ref.length > 0) out.push(ref);
  }
  return out;
}

/**
 * Normalize a raw cell/bullet to a SPEC reference. Strips a surrounding
 * `[[...]]` wikilink to its inner title; otherwise returns the trimmed text.
 */
function normalizeSpecRef(raw: string): string {
  const wiki = stripWikilink(raw);
  if (wiki) return wiki.ref.trim();
  return raw.trim();
}

function listItemText(item: RootContent): string {
  const children = (item as { children?: RootContent[] }).children ?? [];
  return proseFromChildren(children).trim();
}

/**
 * Shared Observations parser. Each item follows `[category] body #tag1 #tag2`.
 */
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

/**
 * Parse an EPIC note markdown string into a validated EpicNote plus the derived
 * `containedSpecs` array.
 *
 * Throws ZodError on any schema violation (wrong type, missing required field,
 * contains-relations-without-Contained-Specs gate failure, etc.) with
 * structured `path` arrays. Throws ParseError on structural issues that predate
 * schema validation (missing frontmatter block).
 */
export function parseEpicNote(markdown: string): ParsedEpicNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);

  // Build the opaque sections Record from every H2 that isn't special-cased.
  // Contained Specs lands here (it is parsed for its typed content too) so the
  // schema superRefine can detect its presence by exact key under the
  // contains-relations gate.
  const opaqueSections: Record<string, string> = {};
  for (const [heading, children] of sections) {
    if (SPECIAL_SECTIONS.has(heading)) continue;
    const content = serializeSectionContent(children);
    if (content.length > 0) opaqueSections[heading] = content;
  }

  const model: EpicNote = {
    frontmatter,
    sections: opaqueSections,
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };

  const validated = EpicNoteSchema.parse(model);

  // Derived list (TASK DoD item 5): SPEC references parsed from the Contained
  // Specs section rows, mirroring the `contains` Relations entries.
  const containedSpecs = parseContainedSpecs(sections.get(CONTAINED_SPECS_SECTION) ?? []);

  return { ...validated, containedSpecs };
}

// Re-export type for downstream callers that only import the parser.
export type { EpicNote, EpicFrontmatter };
