import yaml from "js-yaml";
import type { Heading, List, ListItem, Root, RootContent, Table, Yaml } from "mdast";
import { toString } from "mdast-util-to-string";

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

/** Split a children array into a map of H3 heading text → children. */
export function sectionizeH3(children: RootContent[]): Map<string, RootContent[]> {
  return sectionizeByDepth(children, 3);
}

function sectionizeByDepth(children: RootContent[], depth: number): Map<string, RootContent[]> {
  const sections = new Map<string, RootContent[]>();
  let current: string | null = null;
  let bucket: RootContent[] = [];
  for (const node of children) {
    if (node.type === "heading" && (node as Heading).depth === depth) {
      if (current !== null) sections.set(current, bucket);
      current = toString(node as Heading).trim();
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
      paragraphs.push(toString(node));
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
  const headers = headerRow.children.map((cell) => toString(cell).trim());
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const rec: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      const cell = row.children[c];
      if (header === undefined) continue;
      rec[header] = cell ? toString(cell).trim() : "";
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
    out.push({ text: toString(item).trim(), done: item.checked });
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
    const text = toString(item).trim();
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
  return toString(heading).trim();
}
