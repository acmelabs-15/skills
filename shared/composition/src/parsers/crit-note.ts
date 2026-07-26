import type { List, ListItem, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Observation, Relation } from "../schemas/common.js";
import type { CritFinding, CritFrontmatter, CritNote } from "../schemas/crit-note.js";
import { CritNoteSchema } from "../schemas/crit-note.js";
import { parseRelations } from "../core/relations.js";
import {
  extractFrontmatter,
  extractH1,
  findTable,
  proseFromChildren,
  sectionizeH2,
  tableRows,
} from "./ast-helpers.js";

/**
 * CritNote parser (SPEC-008 TASK-006, REQ-002 New Parser Suite, 2026-05-24).
 *
 * Pattern mirrors `parseAdrNote` (TASK-005): unified+remark for AST, js-yaml via
 * extractFrontmatter for YAML, ast-helpers for shared section/list parsing.
 * Non-typed body sections fold into an opaque `sections: Record<string,string>`,
 * exactly the design of CritNoteSchema (TASK-004).
 *
 * Per-type variation: CRIT parses the `## Findings` body section table into a
 * typed `findings: CritFinding[]` (TASK DoD item 6). Each row carries a
 * severity (P0/P1/P2 enum), a description, and a recommendation. Unlike the
 * derived flags on the ANALYSIS/EPIC parsers, `findings` IS a first-class field
 * on CritNoteSchema (TASK-004), so it goes directly into the model validated by
 * `.parse()` — there is no separate wrapper property.
 *
 * Parent-reference frontmatter: CRIT titles are parent-referenced
 * (CRIT-NNN-PARENT-NNN-...). The schema's frontmatter regex
 * `^CRIT-\d{3}-(ADR|ANALYSIS|SPEC|REQ|DESIGN|TASK)-\d{3}.*` rejects malformed
 * parent references at the frontmatter sub-schema layer with a typed Zod path.
 *
 * The schema's `type: z.literal("critique")` is the parser's type-guard for
 * misrouted markdown: feeding non-CRIT markdown fails at the frontmatter
 * sub-schema layer with a typed Zod path.
 */

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

/**
 * H2 section headings that are NOT folded into the opaque `sections` Record for
 * their typed content. Findings is parsed into the typed array; Observations
 * and Relations have their own typed homes.
 */
const SPECIAL_SECTIONS = new Set<string>(["Findings", "Observations", "Relations"]);

/**
 * Canonical heading text for the Findings body section.
 */
const FINDINGS_SECTION = "Findings";

/** Severity values the Findings table accepts. */
const SEVERITY_VALUES = new Set<string>(["P0", "P1", "P2"]);

/**
 * Build the frontmatter view passed to CritNoteSchema. Per-field type checks
 * are delegated to the Zod schema so the caller receives a single, structured
 * ZodError with `path` arrays for every malformed field (including a malformed
 * parent-reference title and a wrong `type` literal).
 */
function parseFrontmatter(raw: Record<string, unknown>): CritFrontmatter {
  return {
    title: raw["title"] as CritFrontmatter["title"],
    type: raw["type"] as CritFrontmatter["type"],
    status: raw["status"] as CritFrontmatter["status"],
    permalink: raw["permalink"] as CritFrontmatter["permalink"],
    tags: raw["tags"] as CritFrontmatter["tags"],
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
 * Parse the Findings section table into typed findings. Expected headers
 * (case-insensitive): `Severity`, `Description` (or `Finding`), and
 * `Recommendation`. Rows whose severity cell is not a P0/P1/P2 value, or whose
 * description/recommendation cells are empty, are skipped — the schema's
 * `findings.min(1)` invariant then rejects a CRIT whose Findings table yields
 * zero valid rows. Returns an empty array if no table is found so the schema
 * surfaces the missing-findings rejection with a typed path.
 */
function parseFindings(children: RootContent[]): CritFinding[] {
  const table = findTable(children);
  if (!table) return [];
  const rows = tableRows(table);
  if (rows.length === 0) return [];
  const out: CritFinding[] = [];
  for (const row of rows) {
    const severityKey = Object.keys(row).find((k) => /^severity$/i.test(k));
    const descriptionKey = Object.keys(row).find((k) => /^(description|finding)$/i.test(k));
    const recommendationKey = Object.keys(row).find((k) => /^recommendation$/i.test(k));
    if (!severityKey || !descriptionKey || !recommendationKey) continue;
    const severity = (row[severityKey] ?? "").trim().toUpperCase();
    const description = (row[descriptionKey] ?? "").trim();
    const recommendation = (row[recommendationKey] ?? "").trim();
    if (!SEVERITY_VALUES.has(severity)) continue;
    if (description.length === 0 || recommendation.length === 0) continue;
    out.push({
      severity: severity as CritFinding["severity"],
      description,
      recommendation,
    });
  }
  return out;
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
 * Parse a CRIT note markdown string into a validated CritNote.
 *
 * Throws ZodError on any schema violation (wrong type, malformed parent
 * reference, missing required field, zero findings, etc.) with structured
 * `path` arrays. Throws ParseError on structural issues that predate schema
 * validation (missing frontmatter block). Throws a plain Error on H1 drift —
 * the H1 heading must match the frontmatter title verbatim (CONVENTIONS
 * Section 4.3); drift is a parser-layer concern surfaced with a diagnostic
 * message, not a Zod schema error (SPEC-008 REQ-001 AC-5, TASK-047).
 */
export function parseCritNote(markdown: string): CritNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  // H1-drift check (BEFORE schema validation): the H1 heading must match the
  // frontmatter title character-for-character. A missing H1 is also drift. The
  // comparison is verbatim against extractH1's trimmed result.
  const h1 = extractH1(ast);
  if (h1 === null) {
    throw new Error(
      `CRIT H1 drift: no H1 heading present; expected an H1 matching frontmatter title "${frontmatter.title}"`,
    );
  }
  if (h1 !== frontmatter.title) {
    throw new Error(
      `CRIT H1 drift: H1 "${h1}" does not match frontmatter title "${frontmatter.title}"`,
    );
  }

  const sections = sectionizeH2(ast);

  // Build the opaque sections Record from every H2 that isn't special-cased.
  const opaqueSections: Record<string, string> = {};
  for (const [heading, children] of sections) {
    if (SPECIAL_SECTIONS.has(heading)) continue;
    const content = serializeSectionContent(children);
    if (content.length > 0) opaqueSections[heading] = content;
  }

  const model: CritNote = {
    frontmatter,
    sections: opaqueSections,
    findings: parseFindings(sections.get(FINDINGS_SECTION) ?? []),
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };

  return CritNoteSchema.parse(model);
}

// Re-export type for downstream callers that only import the parser.
export type { CritNote, CritFrontmatter, CritFinding };
