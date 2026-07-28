import type { List, ListItem, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseRelations } from "../core/relations.js";
import type { AnalysisFrontmatter, AnalysisNote } from "../schemas/analysis-note.js";
import { AnalysisNoteSchema } from "../schemas/analysis-note.js";
import type { Observation } from "../schemas/common.js";
import { extractFrontmatter, proseFromChildren, sectionizeH2 } from "./ast-helpers.js";

/**
 * AnalysisNote parser (SPEC-008 TASK-006, REQ-002 New Parser Suite, 2026-05-24).
 *
 * Pattern mirrors `parseAdrNote` (TASK-005): unified+remark for AST, js-yaml via
 * extractFrontmatter for YAML, ast-helpers for shared section/list parsing.
 * Non-typed body sections fold into an opaque `sections: Record<string,string>`,
 * exactly the design of AnalysisNoteSchema (TASK-002).
 *
 * Per-type variation: ANALYSIS detects the `## Open Questions` H2 section by an
 * exact, case-sensitive heading match on the parsed sections Record (NOT a
 * substring scan over prose — prose mentioning "open questions" inside another
 * section does not trigger). The boolean is surfaced as `hasOpenQuestions` on
 * the parser return value (TASK DoD item 4). It is NOT a field on the
 * schema-validated `AnalysisNote` model: AnalysisNoteSchema is `.strict()`, so
 * the derived flag rides alongside the validated note rather than inside it,
 * keeping the model a clean `.parse()` round-trip. The structural rejection
 * (ACCEPTED + Open Questions) is enforced by the schema superRefine via the
 * `sections` Record key presence, not by this flag.
 *
 * The schema's `type: z.literal("analysis")` is the parser's type-guard for
 * misrouted markdown: feeding non-ANALYSIS markdown fails at the frontmatter
 * sub-schema layer with a typed Zod path.
 */

const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

/**
 * H2 section headings that are NOT folded into the opaque `sections` Record.
 * Each has a typed home on AnalysisNote: observations[], relations[].
 */
const SPECIAL_SECTIONS = new Set<string>(["Observations", "Relations"]);

/**
 * Canonical heading text for the Open Questions section. Detection is an
 * exact-key lookup on the parsed sections Record (case-sensitive), matching
 * the AnalysisNoteSchema convention.
 */
const OPEN_QUESTIONS_SECTION = "Open Questions";

/**
 * Parser return type: the schema-validated AnalysisNote plus the derived
 * `hasOpenQuestions` flag (TASK DoD item 4). The flag is computed from
 * section-heading presence; the schema enforces the ACCEPTED-gate rejection.
 */
export type ParsedAnalysisNote = AnalysisNote & { hasOpenQuestions: boolean };

/**
 * Build the frontmatter view passed to AnalysisNoteSchema. Per-field type
 * checks are delegated to the Zod schema so the caller receives a single,
 * structured ZodError with `path` arrays for every malformed field (including
 * missing required fields and a wrong `type` literal).
 */
function parseFrontmatter(raw: Record<string, unknown>): AnalysisFrontmatter {
  return {
    title: raw["title"] as AnalysisFrontmatter["title"],
    type: raw["type"] as AnalysisFrontmatter["type"],
    status: raw["status"] as AnalysisFrontmatter["status"],
    permalink: raw["permalink"] as AnalysisFrontmatter["permalink"],
    tags: raw["tags"] as AnalysisFrontmatter["tags"],
  };
}

/**
 * Serialize an H2 section's children back to a single prose string. Same
 * convention as parseAdrNote: opaque section content joined with blank lines.
 * Non-paragraph nodes (lists, tables, code blocks) flatten via mdToString so
 * callers see content even when the section is structured.
 */
function serializeSectionContent(children: RootContent[]): string {
  const blocks: string[] = [];
  for (const node of children) {
    const text = mdToString(node).trim();
    if (text.length > 0) blocks.push(text);
  }
  return blocks.join("\n\n").trim();
}

function listItemText(item: RootContent): string {
  const children = (item as { children?: RootContent[] }).children ?? [];
  return proseFromChildren(children).trim();
}

/**
 * Shared Observations parser. Each item follows `[category] body #tag1 #tag2`.
 * Mirrors parseAdrNote's local copy (ast-helpers exports no typed Observations
 * parser).
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
 * Parse an ANALYSIS note markdown string into a validated AnalysisNote plus the
 * derived `hasOpenQuestions` flag.
 *
 * Throws ZodError on any schema violation (wrong type, missing required field,
 * ACCEPTED + Open Questions gate failure, etc.) with structured `path` arrays.
 * Throws ParseError on structural issues that predate schema validation
 * (missing frontmatter block).
 */
export function parseAnalysisNote(markdown: string): ParsedAnalysisNote {
  const ast = processor.parse(markdown);
  const fmRaw = extractFrontmatter(ast);
  const frontmatter = parseFrontmatter(fmRaw);

  const sections = sectionizeH2(ast);

  // Build the opaque sections Record from every H2 that isn't special-cased.
  // Open Questions, when present, lands here so the schema superRefine can
  // detect it by exact key under the ACCEPTED gate.
  const opaqueSections: Record<string, string> = {};
  for (const [heading, children] of sections) {
    if (SPECIAL_SECTIONS.has(heading)) continue;
    const content = serializeSectionContent(children);
    if (content.length > 0) opaqueSections[heading] = content;
  }

  const model: AnalysisNote = {
    frontmatter,
    sections: opaqueSections,
    observations: parseObservations(sections.get("Observations") ?? []),
    relations: parseRelations(sections.get("Relations") ?? []),
  };

  const validated = AnalysisNoteSchema.parse(model);

  // Derived flag (TASK DoD item 4): exact, case-sensitive section-heading
  // presence. Detected on the raw section map BEFORE the opaque-content filter
  // so an Open Questions section that is empty still registers as present.
  const hasOpenQuestions = sections.has(OPEN_QUESTIONS_SECTION);

  return { ...validated, hasOpenQuestions };
}

// Re-export type for downstream callers that only import the parser.
export type { AnalysisNote, AnalysisFrontmatter };
