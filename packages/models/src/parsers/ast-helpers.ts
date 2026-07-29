import yaml from "js-yaml";
import type { Heading, List, ListItem, Root, RootContent, Table, Yaml } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";

export class ParseError extends Error {
  readonly path: string[];
  constructor(message: string, path: string[]) {
    super(`Parse error at ${path.join(".") || "<root>"}: ${message}`);
    this.path = path;
  }
}

/** Extract YAML frontmatter from a remark AST. */
export function extractFrontmatter(ast: Root): Record<string, unknown> {
  const yamlNode = ast.children.find((n): n is Yaml => n.type === "yaml");
  if (!yamlNode) throw new ParseError("No frontmatter found", ["frontmatter"]);
  const parsed = yaml.load(yamlNode.value);
  if (typeof parsed !== "object" || parsed === null) {
    throw new ParseError("Frontmatter did not parse as a mapping", ["frontmatter"]);
  }
  return parsed as Record<string, unknown>;
}

/** Split top-level children into a map of H2 heading text → children belonging to that section. */
export function sectionizeH2(ast: Root): Map<string, RootContent[]> {
  return sectionizeByDepth(ast.children, 2);
}

/** An H2 section captured as raw source text, with the order it appeared in. */
export interface RawSection {
  /** Heading text without the `## ` prefix, e.g. `Risks (pre-mortem)`. */
  heading: string;
  /** The section verbatim, heading line included, trailing blank lines trimmed. */
  text: string;
  /** 0-based index among all H2s in the source, so document order survives. */
  index: number;
}

/**
 * Capture every H2 section whose heading is not in `known`, sliced verbatim from
 * the source string rather than re-serialised from the AST.
 *
 * Raw slicing is the point. A model-then-render round trip normalises whatever it
 * does not understand — table padding, emphasis characters, list markers, hard
 * breaks — so a section carried as AST comes back subtly rewritten. Sections
 * captured here are ones no schema describes, which makes any normalisation
 * silent corruption of content nobody is validating. Slicing by line offset
 * guarantees the bytes that arrive are the bytes that leave.
 *
 * Matching is exact on heading text, so `Risks` and `Risks (pre-mortem)` are
 * different headings; callers wanting prefix tolerance pass a predicate.
 */
export function captureUnknownH2Sections(
  markdown: string,
  ast: Root,
  known: (heading: string) => boolean,
): RawSection[] {
  const lines = markdown.split("\n");
  const h2s: { heading: string; startLine: number }[] = [];
  for (const node of ast.children) {
    if (node.type !== "heading" || (node as Heading).depth !== 2) continue;
    const startLine = node.position?.start.line;
    if (startLine === undefined) continue;
    h2s.push({ heading: mdToString(node as Heading).trim(), startLine });
  }

  const out: RawSection[] = [];
  for (let i = 0; i < h2s.length; i++) {
    const entry = h2s[i];
    if (!entry || known(entry.heading)) continue;
    // Runs to the line before the next H2, or to end-of-file for the last one.
    const nextStart = h2s[i + 1]?.startLine;
    const endLine = nextStart === undefined ? lines.length : nextStart - 1;
    const slice = lines.slice(entry.startLine - 1, endLine);
    while (slice.length > 0 && slice[slice.length - 1]?.trim() === "") slice.pop();
    out.push({ heading: entry.heading, text: slice.join("\n"), index: i });
  }
  return out;
}

/** Split a children array into a map of H3 heading text → children. */
export function sectionizeH3(children: RootContent[]): Map<string, RootContent[]> {
  return sectionizeByDepth(children, 3);
}

/** Split a children array into a map of H4 heading text → children. */
export function sectionizeH4(children: RootContent[]): Map<string, RootContent[]> {
  return sectionizeByDepth(children, 4);
}

function sectionizeByDepth(children: RootContent[], depth: number): Map<string, RootContent[]> {
  const sections = new Map<string, RootContent[]>();
  let current: string | null = null;
  let bucket: RootContent[] = [];
  for (const node of children) {
    if (node.type === "heading" && (node as Heading).depth === depth) {
      if (current !== null) sections.set(current, bucket);
      current = mdToString(node as Heading).trim();
      bucket = [];
      continue;
    }
    if (current !== null) bucket.push(node);
  }
  if (current !== null) sections.set(current, bucket);
  return sections;
}

/** Extract plain prose text from a children array (paragraphs, text nodes). Joins paragraphs with blank lines. */
export function proseFromChildren(children: RootContent[]): string {
  const paragraphs: string[] = [];
  for (const node of children) {
    if (node.type === "paragraph") {
      paragraphs.push(mdToString(node));
    }
  }
  return paragraphs.join("\n\n").trim();
}

/** Find the first GFM table node in children. */
export function findTable(children: RootContent[]): Table | undefined {
  return children.find((n): n is Table => n.type === "table");
}

/**
 * Find the first table whose header row carries all the given columns.
 *
 * Positional table lookup — "the first table in this section" — is a silent wrong
 * answer whenever a section holds more than one table, and real notes routinely
 * do: a task list, a DoD table and a decisions table can all sit inside one part.
 * The first-table rule then reads task rows as decisions and fails on a status
 * enum, pointing at the enum rather than at the mis-identification.
 *
 * Matching on columns says what the table IS. Comparison is case-insensitive and
 * trimmed, since header spelling varies between hand-authored and rendered notes.
 */
export function findTableWithColumns(
  children: RootContent[],
  required: readonly string[],
): Table | undefined {
  const want = required.map((c) => c.trim().toLowerCase());
  for (const node of children) {
    if (node.type !== "table") continue;
    const header = (node as Table).children[0];
    if (!header) continue;
    const cols = header.children.map((cell) => mdToString(cell).trim().toLowerCase());
    if (want.every((c) => cols.includes(c))) return node as Table;
  }
  return undefined;
}

/** Parse a GFM table into an array of header→cell-text records. */
export function tableRows(table: Table): Array<Record<string, string>> {
  const rows = table.children;
  if (rows.length === 0) return [];
  const headerRow = rows[0];
  if (!headerRow) return [];
  const headers = headerRow.children.map((cell) => mdToString(cell).trim());
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const rec: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      const cell = row.children[c];
      if (header === undefined) continue;
      rec[header] = cell ? mdToString(cell).trim() : "";
    }
    out.push(rec);
  }
  return out;
}

/** Parse a list into checkbox items. Each item must start with `- [ ]` or `- [x]`. */
export function checkboxItems(children: RootContent[]): Array<{ text: string; done: boolean }> {
  const list = children.find((n): n is List => n.type === "list");
  if (!list) return [];
  const out: Array<{ text: string; done: boolean }> = [];
  for (const item of list.children as ListItem[]) {
    if (typeof item.checked !== "boolean") continue;
    out.push({ text: mdToString(item).trim(), done: item.checked });
  }
  return out;
}

/**
 * Parse a list into a Map of "Key" → "value" pairs from bullets shaped like:
 *   - **Key**: value
 *   - Key: value
 * Returns an empty Map if no list found.
 */
export function bulletFieldMap(children: RootContent[]): Map<string, string> {
  const list = children.find((n): n is List => n.type === "list");
  const map = new Map<string, string>();
  if (!list) return map;
  for (const item of list.children as ListItem[]) {
    const text = mdToString(item).trim();
    const idx = text.indexOf(":");
    if (idx <= 0) continue;
    const rawKey = text.slice(0, idx).trim();
    // Strip surrounding ** if bold-marked
    const key = rawKey.replace(/^\*\*(.+)\*\*$/, "$1").trim();
    const value = text.slice(idx + 1).trim();
    map.set(key, value);
  }
  return map;
}

/**
 * Read `**Key**: value` fields whether they are written as list items or as
 * bold-prefixed paragraph lines.
 *
 * Both spellings occur in real plan notes, and the paragraph form dominates:
 *
 *     **Substatus**: DONE
 *     **Owning session**: SESSION-2026-06-16_01
 *
 * versus the list form the renderer emits:
 *
 *     - **Substatus**: DONE
 *
 * Keys are matched case-insensitively and returned lowercased, because the same
 * field appears as `Owning session` and `Owning Session` across notes — a
 * case-sensitive lookup silently missed one spelling and returned nothing, which
 * is worse than an error since the field simply appeared absent.
 *
 * A consecutive run of paragraph lines is treated as one field block, so a value
 * containing a colon (a wikilink, a URL) keeps everything after its FIRST colon.
 */
export function fieldMap(children: RootContent[]): Map<string, string> {
  const map = new Map<string, string>();
  // Stop at the first sub-heading. A section's own fields precede its
  // subsections, and everything after that first H3/H4/H5 belongs to a child —
  // reading through it makes a part's `Substatus` lookup return a nested build
  // workflow item's `Status` instead, which is a wrong answer rather than a
  // missing one.
  const own: RootContent[] = [];
  for (const node of children) {
    if (node.type === "heading" && (node as Heading).depth >= 3) break;
    own.push(node);
  }

  const record = (raw: string): void => {
    const idx = raw.indexOf(":");
    if (idx <= 0) return;
    const key = raw
      .slice(0, idx)
      .trim()
      .replace(/^\*\*(.+)\*\*$/, "$1")
      .trim()
      .toLowerCase();
    if (!key) return;
    const value = raw.slice(idx + 1).trim();
    // First occurrence wins: a field restated later in the same body is a
    // duplicate rather than an override, and preferring the first keeps the
    // reading order a human would use.
    if (!map.has(key)) map.set(key, value);
  };

  for (const node of own) {
    if (node.type === "list") {
      for (const item of (node as List).children as ListItem[]) {
        record(mdToString(item).trim());
      }
      continue;
    }
    if (node.type === "paragraph") {
      // A paragraph may hold several `**Key**: value` lines separated by soft
      // breaks. `mdToString` flattens those to newlines AND strips the emphasis
      // markers, so the text arriving here reads `Substatus: DONE` with no
      // asterisks — matching on a leading `**` finds nothing. Split on newlines
      // and let `record` decide by the colon instead.
      for (const line of mdToString(node).split("\n")) {
        record(line.trim());
      }
    }
  }
  return map;
}

/** Detect `[[Reference]]` wikilink syntax and return the inner reference, or null. */
export function stripWikilink(text: string): { ref: string } | null {
  const m = text.match(/^\s*\[\[(.+?)\]\]\s*$/);
  if (!m) return null;
  const ref = m[1];
  if (ref === undefined) return null;
  return { ref };
}

/** Get the H1 title text from an AST. */
export function extractH1(ast: Root): string | null {
  const heading = ast.children.find((n): n is Heading => n.type === "heading" && n.depth === 1);
  if (!heading) return null;
  return mdToString(heading).trim();
}
