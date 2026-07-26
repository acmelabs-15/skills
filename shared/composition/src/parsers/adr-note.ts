import type { Heading, List, ListItem, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type {
  AdrFrontmatter,
  AdrNote,
  ClarificationItem,
  ConsideredOption,
} from "../schemas/adr-note.js";
import { AdrNoteSchema } from "../schemas/adr-note.js";
import type { Observation, Relation } from "../schemas/common.js";
import { parseRelations } from "../core/relations.js";
import {
  extractFrontmatter,
  findTable,
  proseFromChildren,
  sectionizeH2,
  sectionizeH3,
  tableRows,
} from "./ast-helpers.js";

/**
 * AdrNote parser (SPEC-008 TASK-005, REQ-002 New Parser Suite, 2026-05-24).
 *
 * Pattern mirrors `parseDesignNote`: unified+remark for AST, js-yaml via
 * extractFrontmatter for YAML, ast-helpers for shared section/list parsing.
 * Body sections that are not typed (Considered Options / Clarifications /
 * Observations / Relations) fold into an opaque `sections: Record<string,string>`
 * — exactly the design of AdrNoteSchema (TASK-001).
 *
 * Considered Options accepts two real-world shapes that emit identical
 * `{name, rationale}[]`: (a) a GFM table with `Option` + `Rationale` columns
 * (TASK DoD literal wording), and (b) H3-axis + H4-option subsections (the
 * shape used by docs/decisions/ADR-001-composition-library-architecture.md
 * and ANALYSIS H3/H4 conventions). Either is sufficient.
 *
 * Clarifications accepts (a) a checkbox list (`- [x] ...` / `- [ ] ...`) and
 * (b) a plain bullet list (no checkbox brackets). For (b), `done` defaults to
 * true so historical recorded clarifications under ACCEPTED ADRs validate.
 * An unchecked `- [ ]` clarification under ACCEPTED still triggers the schema
 * superRefine ACCEPTED gate, as required by TASK-001.
 *
 * The schema's `type: z.literal("decision")` is the parser's type-guard for
 * misrouted markdown: feeding non-ADR (e.g., a SESSION or TASK note) fails at
 * the frontmatter sub-schema layer with a typed Zod path.
 */

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

/**
 * H2 section headings that are NOT folded into the opaque `sections` Record.
 * Each has a typed home on AdrNote: considered_options[], clarifications[],
 * observations[], relations[].
 */
const SPECIAL_SECTIONS = new Set<string>([
  "Considered Options",
  "Clarifications",
  "Observations",
  "Relations",
]);

/**
 * Coerce a YAML-parsed date value to a `YYYY-MM-DD` string. js-yaml's default
 * schema parses ISO-8601 calendar dates into JavaScript Date objects; the ADR
 * schema requires the canonical string form. Date objects round-trip via
 * `toISOString().slice(0, 10)`. Any other type (including missing) falls
 * through to the schema layer as the raw value so Zod produces the typed
 * rejection with structured path — never a pre-schema ParseError.
 */
function coerceDateField(v: unknown): unknown {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return v;
}

/**
 * Build the frontmatter view passed to AdrNoteSchema. This intentionally does
 * NOT throw ParseError on type mismatch — all per-field type checks are
 * delegated to the Zod schema so the caller receives a single, structured
 * ZodError with `path` arrays for every malformed field (including missing
 * required fields and wrong `type` literal). Date fields are pre-coerced
 * because js-yaml auto-converts ISO dates to Date objects.
 */
function parseFrontmatter(raw: Record<string, unknown>): AdrFrontmatter {
  return {
    title: raw["title"] as AdrFrontmatter["title"],
    type: raw["type"] as AdrFrontmatter["type"],
    status: raw["status"] as AdrFrontmatter["status"],
    date: coerceDateField(raw["date"]) as AdrFrontmatter["date"],
    updated: coerceDateField(raw["updated"]) as AdrFrontmatter["updated"],
    permalink: raw["permalink"] as AdrFrontmatter["permalink"],
    tags: raw["tags"] as AdrFrontmatter["tags"],
  };
}

/**
 * Serialize an H2 section's children back to a single prose string. Same
 * convention as parseDesignNote: opaque section content joined with blank
 * lines. Non-paragraph nodes (lists, tables, code blocks) get flattened via
 * mdToString so callers see content even when the section is structured.
 */
function serializeSectionContent(children: RootContent[]): string {
  const blocks: string[] = [];
  for (const node of children) {
    const text = mdToString(node).trim();
    if (text.length > 0) blocks.push(text);
  }
  return blocks.join("\n\n").trim();
}

function stripOptionLabelPrefix(heading: string): string {
  // Common forms:
  //   "Option A: Zod"  →  "Zod"
  //   "Option A — Zod" →  "Zod"
  //   "Option A. Zod"  →  "Zod"
  //   "Zod"            →  "Zod"  (no prefix)
  const m = heading.match(/^Option\s+\S+\s*[:—.\-]\s*(.+)$/i);
  if (m?.[1]) return m[1].trim();
  return heading.trim();
}

/**
 * Parse Considered Options from a GFM table. Expected headers (case-insensitive):
 * "Option" (or "Name") and "Rationale". Optional extra columns (Pros/Cons) are
 * ignored. Returns an empty array if no table is found.
 */
function parseConsideredOptionsTable(children: RootContent[]): ConsideredOption[] {
  const table = findTable(children);
  if (!table) return [];
  const rows = tableRows(table);
  if (rows.length === 0) return [];
  const out: ConsideredOption[] = [];
  for (const row of rows) {
    // Find the option/name column and rationale column with case-insensitive lookup.
    const nameKey = Object.keys(row).find((k) => /^(option|name)$/i.test(k));
    const rationaleKey = Object.keys(row).find((k) => /^rationale$/i.test(k));
    if (!nameKey || !rationaleKey) continue;
    const name = (row[nameKey] ?? "").trim();
    const rationale = (row[rationaleKey] ?? "").trim();
    if (name.length === 0) continue;
    out.push({ name, rationale });
  }
  return out;
}

/**
 * Parse Considered Options from H3-axis + H4-option subsections. For each H3
 * axis, the H4 children become options with the rationale derived from the
 * H4 body content. When no H3 axes exist, treat the H3 children directly as
 * options (D-N style without axis grouping). The "Option A:" prefix is
 * stripped from heading text so `name` is the canonical option label.
 */
function parseConsideredOptionsSubsections(children: RootContent[]): ConsideredOption[] {
  const out: ConsideredOption[] = [];
  const axisMap = sectionizeH3(children);
  for (const [_axisHeading, axisChildren] of axisMap) {
    // Sub-divide axis children by H4. If no H4s, the H3 itself is the option.
    const h4Map = sectionizeByDepth(axisChildren, 4);
    if (h4Map.size === 0) {
      // No nested options under this axis; the axis IS an option.
      const rationale = serializeSectionContent(axisChildren);
      out.push({ name: stripOptionLabelPrefix(_axisHeading), rationale });
      continue;
    }
    for (const [optionHeading, optionChildren] of h4Map) {
      const rationale = serializeSectionContent(optionChildren);
      out.push({ name: stripOptionLabelPrefix(optionHeading), rationale });
    }
  }
  return out;
}

/**
 * Local H4 sectionizer. ast-helpers exports sectionizeH3 and sectionizeH4 but
 * sectionizeH4 operates on the entire children array under a specific H3
 * already (the AST-helper pattern), so duplicating here would create import
 * cycles. This local helper mirrors the ast-helpers depth-sectionizer.
 */
function sectionizeByDepth(children: RootContent[], depth: number): Map<string, RootContent[]> {
  const sections = new Map<string, RootContent[]>();
  let current: string | null = null;
  let bucket: RootContent[] = [];
  for (const node of children) {
    if (node.type === "heading" && (node as Heading).depth === depth) {
      if (current !== null) sections.set(current, bucket);
      current = mdToString(node).trim();
      bucket = [];
      continue;
    }
    if (current !== null) bucket.push(node);
  }
  if (current !== null) sections.set(current, bucket);
  return sections;
}

function parseConsideredOptions(children: RootContent[]): ConsideredOption[] {
  // Prefer the table form when present (TASK DoD literal wording), fall back
  // to subsection form (real-world ADRs like ADR-001).
  const fromTable = parseConsideredOptionsTable(children);
  if (fromTable.length > 0) return fromTable;
  return parseConsideredOptionsSubsections(children);
}

/**
 * Parse Clarifications from a list. Handles both checkbox items (`- [x] text`,
 * `- [ ] text`) and plain bullet items. For plain bullets (no checkbox),
 * `done` defaults to true so recorded clarifications under ACCEPTED ADRs
 * validate. Unchecked checkbox items under ACCEPTED still trigger the schema
 * superRefine gate (REQ-001 TASK-001 invariant).
 */
function parseClarifications(children: RootContent[]): ClarificationItem[] {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: ClarificationItem[] = [];
  for (const item of list.children as ListItem[]) {
    const text = mdToString(item).trim();
    if (text.length === 0) continue;
    const done = typeof item.checked === "boolean" ? item.checked : true;
    out.push({ text, done });
  }
  return out;
}

function listItemText(item: RootContent): string {
  const children = (item as { children?: RootContent[] }).children ?? [];
  return proseFromChildren(children).trim();
}

/**
 * Shared Observations parser. Same shape as parseDesignNote — local copy
 * because ast-helpers does not export a typed Observations parser. Each item
 * follows `[category] body #tag1 #tag2`.
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
 * Parse an ADR note markdown string into a validated AdrNote.
 *
 * Throws ZodError on any schema violation (wrong type, missing required
 * field, ACCEPTED-gate failure, etc.) with structured `path` arrays the
 * caller can surface verbatim. Throws ParseError on structural issues that
 * predate schema validation (missing frontmatter block).
 */
export function parseAdrNote(markdown: string): AdrNote {
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

  const consideredOptionsChildren = sections.get("Considered Options") ?? [];
  const consideredOptions = parseConsideredOptions(consideredOptionsChildren);

  const clarificationsChildren = sections.get("Clarifications");
  const clarifications =
    clarificationsChildren !== undefined ? parseClarifications(clarificationsChildren) : undefined;

  const model: AdrNote = {
    frontmatter,
    sections: opaqueSections,
    considered_options: consideredOptions,
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };

  if (clarifications !== undefined) {
    model.clarifications = clarifications;
  }

  return AdrNoteSchema.parse(model);
}

// Re-export type for downstream callers that only import the parser.
export type { AdrNote, AdrFrontmatter, ConsideredOption, ClarificationItem };
