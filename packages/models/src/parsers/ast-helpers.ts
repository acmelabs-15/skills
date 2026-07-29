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
