/**
 * Line-oriented slicing primitives for verification passes over notes.
 *
 * The parsers in `src/parsers/` build a typed model of a note and are the right
 * tool when the question is "does this note satisfy its schema". Verification
 * asks a different question — "where in this file does this claim sit" — and
 * needs the answer as a line number in the file the author will open. A remark
 * AST discards enough position detail through `mdast-util-to-string` that
 * mapping a finding back to a line becomes guesswork, so these primitives work
 * on the raw lines and hand back 1-indexed positions throughout.
 *
 * Everything here is pure: text in, spans out. No file I/O.
 */

/** A heading and the 1-indexed line it sits on. */
export interface HeadingRef {
  readonly depth: number;
  readonly text: string;
  readonly line: number;
}

/**
 * A heading plus everything under it, DESCENDANTS INCLUDED — a slice of
 * "## 5. Part C" carries its "### Tier 0..7" subsections, because a count
 * scoped to a part means the whole part.
 */
export interface Section {
  readonly heading: HeadingRef;
  /** 1-indexed, inclusive. `startLine` is the heading itself. */
  readonly startLine: number;
  readonly endLine: number;
  readonly lines: readonly string[];
}

/** How a caller names a section. Exactly one field is used, checked in order. */
export interface SectionMatcher {
  readonly equals?: string | undefined;
  readonly startsWith?: string | undefined;
  readonly matches?: string | undefined;
  /** Regex flags for `matches`, e.g. "i". Ignored by the other two forms. */
  readonly flags?: string | undefined;
}

/** A blank-line-delimited run of lines — the unit a correction marker occupies. */
export interface Block {
  readonly startLine: number;
  readonly endLine: number;
  readonly text: string;
}

export interface TableRow {
  readonly cells: readonly string[];
  readonly line: number;
}

export interface TableBlock {
  readonly headers: readonly string[];
  readonly rows: readonly TableRow[];
  readonly startLine: number;
  readonly endLine: number;
}

const FENCE_RE = /^\s*(?:```|~~~)/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const DELIMITER_ROW_RE = /^\s*\|[\s:|-]+\|\s*$/;

/**
 * Mark every line that sits inside a fenced code block. A pipe table drawn in a
 * fence is documentation OF a table, not one to count, and a `#` in a shell
 * snippet is a comment rather than a heading.
 */
function fencedLines(lines: readonly string[]): boolean[] {
  const fenced = new Array<boolean>(lines.length).fill(false);
  let open = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (FENCE_RE.test(line)) {
      // The fence delimiters themselves are never content.
      fenced[index] = true;
      open = !open;
      continue;
    }
    fenced[index] = open;
  }
  return fenced;
}

export function splitLines(content: string): string[] {
  return content.split("\n");
}

export function listHeadings(content: string): HeadingRef[] {
  const lines = splitLines(content);
  const fenced = fencedLines(lines);
  const out: HeadingRef[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (fenced[index]) continue;
    const match = HEADING_RE.exec(lines[index] ?? "");
    if (!match) continue;
    out.push({ depth: (match[1] ?? "").length, text: (match[2] ?? "").trim(), line: index + 1 });
  }
  return out;
}

function headingMatches(heading: HeadingRef, matcher: SectionMatcher): boolean {
  if (matcher.equals !== undefined) return heading.text === matcher.equals;
  if (matcher.startsWith !== undefined) return heading.text.startsWith(matcher.startsWith);
  if (matcher.matches !== undefined) {
    return new RegExp(matcher.matches, matcher.flags ?? "").test(heading.text);
  }
  return false;
}

/**
 * Every section whose heading satisfies `matcher`, each extending to the next
 * heading of equal or shallower depth. Returns an array rather than a single
 * section because an ambiguous match is a finding for the caller to report, not
 * something to silently resolve by taking the first.
 */
export function sliceSections(content: string, matcher: SectionMatcher): Section[] {
  const lines = splitLines(content);
  const headings = listHeadings(content);
  const out: Section[] = [];
  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index];
    if (!heading || !headingMatches(heading, matcher)) continue;
    const next = headings.slice(index + 1).find((candidate) => candidate.depth <= heading.depth);
    const endLine = next ? next.line - 1 : lines.length;
    out.push({
      heading,
      startLine: heading.line,
      endLine,
      lines: lines.slice(heading.line - 1, endLine),
    });
  }
  return out;
}

/**
 * Every heading with the content up to the NEXT heading of ANY depth — the
 * immediate section, descendants excluded.
 *
 * `sliceSections` is right for a scoped count ("rows in Part C" means the whole
 * part). This is right for judging what a sentence sits beside: under the
 * descendants-included reading, every claim in a note also belongs to the H1,
 * so a claim would be checked twice — once against its own section and once
 * against every table in the document.
 */
export function sliceLeafSections(content: string): Section[] {
  const lines = splitLines(content);
  const headings = listHeadings(content);
  return headings.map((heading, index) => {
    const endLine = (headings[index + 1]?.line ?? lines.length + 1) - 1;
    return {
      heading,
      startLine: heading.line,
      endLine,
      lines: lines.slice(heading.line - 1, endLine),
    };
  });
}

/** Blank-line-delimited blocks, fences kept whole. */
export function splitBlocks(content: string): Block[] {
  const lines = splitLines(content);
  const fenced = fencedLines(lines);
  const out: Block[] = [];
  let start: number | null = null;
  for (let index = 0; index < lines.length; index++) {
    const blank = (lines[index] ?? "").trim().length === 0 && !fenced[index];
    if (blank) {
      if (start !== null) {
        out.push({
          startLine: start + 1,
          endLine: index,
          text: lines.slice(start, index).join("\n"),
        });
        start = null;
      }
      continue;
    }
    if (start === null) start = index;
  }
  if (start !== null) {
    out.push({ startLine: start + 1, endLine: lines.length, text: lines.slice(start).join("\n") });
  }
  return out;
}

const ATOM_START_RE = /^\s*(?:\||[-*+]\s|\d+[.)]\s)/;

/**
 * Blocks split further at list-item and table-row boundaries.
 *
 * A blank-line block is the wrong unit whenever the block is a list or a table:
 * a seventeen-row table separated from its neighbours by blank lines is one
 * block, so anything true of one row would be attributed to all seventeen. Each
 * row and each list item is an independent assertion and gets its own span; a
 * plain paragraph is unaffected and comes back whole.
 */
export function atomizeBlocks(content: string): Block[] {
  const out: Block[] = [];
  for (const block of splitBlocks(content)) {
    const lines = block.text.split("\n");
    const starts = lines.flatMap((line, index) =>
      index === 0 || ATOM_START_RE.test(line) ? [index] : [],
    );
    for (let index = 0; index < starts.length; index++) {
      const from = starts[index] ?? 0;
      const to = starts[index + 1] ?? lines.length;
      out.push({
        startLine: block.startLine + from,
        endLine: block.startLine + to - 1,
        text: lines.slice(from, to).join("\n"),
      });
    }
  }
  return out;
}

/**
 * Split a table line into cells. GFM allows a leading and trailing pipe; both
 * produce an empty outer field that is dropped. `\|` is an escaped literal and
 * does not split.
 */
function splitCells(line: string): string[] {
  const trimmed = line.trim();
  const body = trimmed.replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return body.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

function isTableLine(line: string): boolean {
  return line.trimStart().startsWith("|");
}

/**
 * Every GFM table in `lines`. A table is a header row, a delimiter row, and
 * zero or more body rows; a run of pipe lines without a delimiter row on the
 * second line is not a table and is skipped rather than half-parsed.
 *
 * `lineOffset` is the 1-indexed file line of `lines[0]`, so tables found inside
 * a section slice still report file-absolute positions.
 */
export function findTables(lines: readonly string[], lineOffset = 1): TableBlock[] {
  const fenced = fencedLines(lines);
  const out: TableBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    if (fenced[index] || !isTableLine(lines[index] ?? "")) {
      index++;
      continue;
    }
    let end = index;
    while (end < lines.length && !fenced[end] && isTableLine(lines[end] ?? "")) end++;
    const run = lines.slice(index, end);
    const delimiter = run[1];
    if (run.length >= 2 && delimiter !== undefined && DELIMITER_ROW_RE.test(delimiter)) {
      out.push({
        headers: splitCells(run[0] ?? ""),
        rows: run.slice(2).map((line, offset) => ({
          cells: splitCells(line),
          line: lineOffset + index + 2 + offset,
        })),
        startLine: lineOffset + index,
        endLine: lineOffset + end - 1,
      });
    }
    index = end;
  }
  return out;
}

/** Cell text for a named column, or undefined when the table has no such column. */
export function cellOf(table: TableBlock, row: TableRow, column: string): string | undefined {
  const columnIndex = table.headers.indexOf(column);
  if (columnIndex < 0) return undefined;
  return row.cells[columnIndex];
}

export interface CheckboxItem {
  readonly line: number;
  readonly state: "open" | "done" | "deferred";
  readonly text: string;
}

const CHECKBOX_RE = /^\s*[-*+]\s+\[([ xX~])\]\s*(.*)$/;

/** Every task-list item in `lines`, with `[~]` recognised as the deferred marker. */
export function findCheckboxes(lines: readonly string[], lineOffset = 1): CheckboxItem[] {
  const fenced = fencedLines(lines);
  const out: CheckboxItem[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (fenced[index]) continue;
    const match = CHECKBOX_RE.exec(lines[index] ?? "");
    if (!match) continue;
    const marker = (match[1] ?? " ").toLowerCase();
    out.push({
      line: lineOffset + index,
      state: marker === "x" ? "done" : marker === "~" ? "deferred" : "open",
      text: (match[2] ?? "").trim(),
    });
  }
  return out;
}

/** Convert a 0-indexed character offset into a 1-indexed line number. */
export function lineOfOffset(content: string, offset: number): number {
  let line = 1;
  const limit = Math.min(offset, content.length);
  for (let index = 0; index < limit; index++) {
    if (content.charCodeAt(index) === 10) line++;
  }
  return line;
}
