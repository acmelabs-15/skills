/**
 * Zero-config figure checking.
 *
 * Config checks need someone to have noticed the claim first. These three
 * built-ins need nothing: point them at a note and they find the figures that
 * carry their own structure alongside them.
 *
 *   totals-row     — a final row labelled Total against its own column sums.
 *   checkbox-tally — an "N of M" claim beside a task list.
 *   stated-count   — an "N rows" or "N items" claim beside exactly one table
 *                    or list, where the noun agrees with the structure's kind.
 *
 * All three refuse to guess. `stated-count` in particular reports UNANCHORED
 * whenever a section holds more than one candidate structure, or none of the
 * matching kind, because "one hundred rows" in a section of prose and bullets
 * is a claim about a table somewhere else, and checking it against the bullets
 * to hand produces a confident mismatch about nothing.
 */

import type { FigureFinding } from "../schemas/figure-check.js";
import {
  type Section,
  type TableBlock,
  findCheckboxes,
  findTables,
  listHeadings,
  sliceLeafSections,
  splitLines,
} from "./markdown-slices.js";
import type { IndexedNote } from "./note-index.js";
import { NUMBER_WORDS, parseFigure } from "./number-words.js";

const NUMBER_TOKEN = `(?:[\\d,]+|(?:${NUMBER_WORDS.join("|")})(?:[\\s-](?:and[\\s-])?(?:${NUMBER_WORDS.join("|")}))*)`;

/**
 * The smallest figure treated as a summary count.
 *
 * "One row per surface", "one item at a time" — a stated one is almost always
 * prose describing a rate or a rule rather than a total, and checking it
 * against a structure produces a mismatch about nothing. Two is where a figure
 * starts being a count someone could have got wrong.
 */
const MIN_STATED_COUNT = 2;

/** Sections whose figures describe the graph rather than the note's content. */
const SKIPPED_HEADINGS = /^(?:observations|relations)$/i;

function isSkipped(section: Section): boolean {
  return SKIPPED_HEADINGS.test(section.heading.text.trim());
}

function finding(
  partial: Omit<FigureFinding, "verdict"> & { verdict?: FigureFinding["verdict"] },
): FigureFinding {
  const { statedFigure, derivedFigure } = partial;
  const verdict =
    partial.verdict ??
    (statedFigure === null || derivedFigure === null
      ? "UNANCHORED"
      : statedFigure === derivedFigure
        ? "MATCH"
        : "MISMATCH");
  return { ...partial, verdict };
}

/* ------------------------------------------------------------------ totals */

const TOTALS_LABEL_RE = /^\**\s*totals?\b/i;

function numericCell(text: string): number | null {
  const cleaned = text.replace(/[*`_]/g, "").trim();
  if (cleaned.length === 0) return null;
  return /^-?[\d,]+$/.test(cleaned) ? parseFigure(cleaned) : null;
}

/**
 * A final row labelled Total, checked column by column against the rows above.
 * Only columns whose every body cell is numeric are checked — a column of prose
 * with one number in it is not a column that sums.
 */
function scanTotalsRows(note: IndexedNote, table: TableBlock): FigureFinding[] {
  const last = table.rows[table.rows.length - 1];
  if (!last || table.rows.length < 2) return [];
  if (!TOTALS_LABEL_RE.test(last.cells[0] ?? "")) return [];
  const body = table.rows.slice(0, -1);
  const out: FigureFinding[] = [];
  for (let column = 1; column < table.headers.length; column++) {
    const stated = numericCell(last.cells[column] ?? "");
    if (stated === null) continue;
    const values = body.map((row) => numericCell(row.cells[column] ?? ""));
    if (values.some((value) => value === null)) continue;
    const sum = values.reduce((total: number, value) => total + (value ?? 0), 0);
    out.push(
      finding({
        id: `totals-row:${note.path}:${last.line}:${table.headers[column] ?? column}`,
        kind: "totals-row",
        note: note.path,
        section: headingFor(note, last.line),
        line: last.line,
        statedText: (last.cells[column] ?? "").trim(),
        statedFigure: stated,
        derivedFigure: sum,
        detail: `sum of ${values.length} rows under "${table.headers[column] ?? column}"`,
      }),
    );
  }
  return out;
}

function headingFor(note: IndexedNote, line: number): string {
  const headings = listHeadings(note.content).filter((heading) => heading.line <= line);
  return headings[headings.length - 1]?.text ?? "";
}

/* ------------------------------------------------------------- checkboxes */

const TALLY_RE = new RegExp(`(${NUMBER_TOKEN})\\s*(?:of|/)\\s*(${NUMBER_TOKEN})\\b`, "i");

/**
 * An "N of M" claim beside a task list. Both halves are checked: N against the
 * ticked items and M against the total, since a tally goes stale on either side
 * and a checker that only verified the numerator would pass "12 of 12" over a
 * list of fifteen.
 */
function scanCheckboxTally(note: IndexedNote, section: Section): FigureFinding[] {
  const items = findCheckboxes(section.lines, section.startLine);
  if (items.length === 0) return [];
  const done = items.filter((item) => item.state === "done").length;
  const out: FigureFinding[] = [];
  for (let index = 0; index < section.lines.length; index++) {
    const line = section.lines[index] ?? "";
    if (/^\s*[-*+]\s+\[[ xX~]\]/.test(line)) continue;
    const match = TALLY_RE.exec(line);
    if (!match) continue;
    const stated = parseFigure(match[1] ?? "");
    const statedTotal = parseFigure(match[2] ?? "");
    if (stated === null || statedTotal === null) continue;
    const at = section.startLine + index;
    out.push(
      finding({
        id: `checkbox-tally:${note.path}:${at}`,
        kind: "checkbox-tally",
        note: note.path,
        section: section.heading.text,
        line: at,
        statedText: match[0].trim(),
        statedFigure: stated,
        derivedFigure: done,
        detail: `${done} of ${items.length} checkbox items are ticked in this section`,
      }),
    );
    if (statedTotal !== items.length) {
      out.push(
        finding({
          id: `checkbox-tally:${note.path}:${at}:total`,
          kind: "checkbox-tally",
          note: note.path,
          section: section.heading.text,
          line: at,
          statedText: match[0].trim(),
          statedFigure: statedTotal,
          derivedFigure: items.length,
          detail: "checkbox items in this section",
        }),
      );
    }
  }
  return out;
}

/* ----------------------------------------------------------- stated counts */

/**
 * Nouns that name a countable structure, and the structure each one names. The
 * agreement requirement is load-bearing: "one hundred rows" stated in a section
 * of numbered prose must NOT be checked against those bullets, and the only
 * thing preventing it is that "rows" names a table and the section has none.
 */
const COUNT_NOUNS: ReadonlyMap<string, "table" | "list"> = new Map([
  ["row", "table"],
  ["rows", "table"],
  ["item", "list"],
  ["items", "list"],
  ["entry", "list"],
  ["entries", "list"],
  ["bullet", "list"],
  ["bullets", "list"],
]);

/**
 * `(?<![\w-])` rather than `\b`: a designator like `CRIT-004 P0-2 rows` puts a
 * word boundary right before the 2, and reading that as a count of two is how
 * a citation becomes a mismatch.
 */
const STATED_COUNT_RE = new RegExp(
  `(?<![\\w-])(${NUMBER_TOKEN})\\s+(${[...COUNT_NOUNS.keys()].join("|")})\\b`,
  "i",
);

/**
 * A stated count is only anchored to the structure beside it when the sentence
 * SAYS it is.
 *
 * Without this gate the built-in fires on every sentence that mentions rows in
 * a section that happens to contain a table — and in this corpus that is most
 * of them, because these notes discuss each other's tables constantly. Swept
 * over the fond graph the ungated form produced twenty-six mismatches, of which
 * every one was a claim about a table in another note. A checker with that hit
 * rate is worse than none: it teaches the reader to skim past the two findings
 * that were real.
 *
 * Deictic phrasing is the one signal that distinguishes "the table below holds
 * ninety-seven rows" from "the inventory counts 197 rows". Claims without it
 * are left to config mode, which is where a caller states the anchor instead of
 * the tool inferring one.
 */
const DEICTIC_ANCHORS: readonly string[] = [
  "this table",
  "this list",
  "these rows",
  "these items",
  "these entries",
  "the table below",
  "the table above",
  "the following table",
  "the list below",
  "the following list",
  "the rows below",
  "the rows above",
  "listed below",
  "shown below",
  "as follows",
];

const DEICTIC_ANCHOR_RE = new RegExp(`\\b(?:${DEICTIC_ANCHORS.join("|")})\\b`, "i");

/**
 * How far from the count the deictic may sit. Paragraphs in this corpus run to
 * several hundred characters, so co-occurrence on a line means very little —
 * "identified three rows as un-enumerated" and "this table" can be eighty words
 * and two subjects apart. A genuine anchor is adjacent: "the table below holds
 * ninety-seven rows".
 */
const DEICTIC_WINDOW = 80;

function deicticNear(line: string, at: number, length: number): boolean {
  const from = Math.max(0, at - DEICTIC_WINDOW);
  return DEICTIC_ANCHOR_RE.test(line.slice(from, at + length + DEICTIC_WINDOW));
}

function listItemCount(section: Section): number {
  return section.lines.filter((line) => /^\s*(?:[-*+]|\d+[.)])\s/.test(line)).length;
}

function scanStatedCounts(note: IndexedNote, section: Section): FigureFinding[] {
  const out: FigureFinding[] = [];
  const tables = findTables(section.lines, section.startLine);
  const tableRows = tables.reduce((count, table) => count + table.rows.length, 0);
  const listItems = listItemCount(section);
  for (let index = 0; index < section.lines.length; index++) {
    const line = section.lines[index] ?? "";
    // A claim written inside a table cell is about some OTHER structure — a
    // row does not summarise the table it sits in.
    if (line.trimStart().startsWith("|")) continue;
    const match = STATED_COUNT_RE.exec(line);
    if (!match || !deicticNear(line, match.index, match[0].length)) continue;
    const stated = parseFigure(match[1] ?? "");
    const kind = COUNT_NOUNS.get((match[2] ?? "").toLowerCase());
    if (stated === null || stated < MIN_STATED_COUNT || kind === undefined) continue;
    const at = section.startLine + index;
    const base = {
      id: `stated-count:${note.path}:${at}`,
      kind: "stated-count" as const,
      note: note.path,
      section: section.heading.text,
      line: at,
      statedText: match[0].trim(),
      statedFigure: stated,
    };
    if (kind === "table") {
      // No table beside the claim means it summarises something elsewhere —
      // outside this built-in's remit, and a config check's job. Several tables
      // means there IS a candidate but no way to pick it, which is worth saying.
      if (tables.length === 0) continue;
      out.push(
        tables.length > 1
          ? finding({
              ...base,
              derivedFigure: null,
              detail: `${tables.length} tables in this section; no unambiguous anchor`,
            })
          : finding({
              ...base,
              derivedFigure: tableRows,
              detail: "body rows of the table in this section",
            }),
      );
      continue;
    }
    if (listItems === 0) continue;
    out.push(finding({ ...base, derivedFigure: listItems, detail: "list items in this section" }));
  }
  return out;
}

/* ------------------------------------------------------------------ driver */

/** Run every built-in over one note. */
export function scanNote(note: IndexedNote): FigureFinding[] {
  const out: FigureFinding[] = [];
  for (const table of findTables(splitLines(note.content))) {
    out.push(...scanTotalsRows(note, table));
  }
  for (const section of sliceLeafSections(note.content)) {
    if (isSkipped(section)) continue;
    out.push(...scanCheckboxTally(note, section));
    out.push(...scanStatedCounts(note, section));
  }
  return out.sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || a.id.localeCompare(b.id));
}
