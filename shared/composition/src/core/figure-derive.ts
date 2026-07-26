/**
 * Config-mode figure checking: locate a stated figure, re-derive it, compare.
 *
 * Everything here is mechanical. A derivation counts rows, counts checkboxes,
 * counts regex hits, or sums a column — no derivation reads meaning, because a
 * derivation that reads meaning is a second opinion rather than a check, and
 * two opinions that disagree tell you nothing about which is stale.
 *
 * The scope of a derivation is a section, and a section carries its
 * subsections. That is what lets "one hundred rows" be checked against Part C
 * as a whole while its eight tier tables stay individually checkable.
 */

import type {
  Derivation,
  FigureCheck,
  FigureFinding,
  SectionMatcherInput,
} from "../schemas/figure-check.js";
import {
  type Section,
  type SectionMatcher,
  cellOf,
  findCheckboxes,
  findTables,
  listHeadings,
  sliceSections,
  splitLines,
} from "./markdown-slices.js";
import type { IndexedNote, NoteIndex } from "./note-index.js";
import { parseFigure } from "./number-words.js";

/** Section-scoped lines plus the file line its first entry sits on. */
interface Scope {
  readonly lines: readonly string[];
  readonly lineOffset: number;
  readonly heading: string;
}

function toMatcher(input: SectionMatcherInput): SectionMatcher {
  return {
    equals: input.equals,
    startsWith: input.startsWith,
    matches: input.matches,
    flags: input.flags,
  };
}

/**
 * Resolve a matcher to exactly one section. Zero matches means the heading
 * moved or was renamed; more than one means the matcher is too loose. Both are
 * refusals rather than fallbacks — silently scoping to the whole note would
 * turn a "Part C rows" check into a whole-document row count and report a
 * confident mismatch.
 */
function resolveScope(
  note: IndexedNote,
  matcher: SectionMatcherInput | undefined,
): { scope: Scope } | { error: string } {
  if (!matcher) {
    return {
      scope: { lines: splitLines(note.content), lineOffset: 1, heading: "" },
    };
  }
  const sections = sliceSections(note.content, toMatcher(matcher));
  const only = sections[0];
  if (!only) return { error: `no section matched ${JSON.stringify(matcher)}` };
  if (sections.length > 1) {
    return { error: `${sections.length} sections matched ${JSON.stringify(matcher)}; too loose` };
  }
  return { scope: scopeOf(only) };
}

function scopeOf(section: Section): Scope {
  return { lines: section.lines, lineOffset: section.startLine, heading: section.heading.text };
}

function numericCell(text: string): number | null {
  const cleaned = text.replace(/[*`_]/g, "").trim();
  return cleaned.length === 0 ? null : parseFigure(cleaned);
}

interface Derived {
  readonly value: number;
  readonly detail: string;
}

function deriveCountTableRows(
  scope: Scope,
  derivation: Extract<Derivation, { kind: "countTableRows" }>,
): Derived | { error: string } {
  const tables = findTables(scope.lines, scope.lineOffset);
  if (tables.length === 0) return { error: "no table found in scope" };
  if (derivation.column === undefined) {
    const total = tables.reduce((count, table) => count + table.rows.length, 0);
    return { value: total, detail: `body rows across ${tables.length} table(s) in scope` };
  }
  const pattern =
    derivation.matching === undefined
      ? undefined
      : new RegExp(derivation.matching, derivation.matchingFlags ?? "");
  let matched = 0;
  let columnSeen = false;
  for (const table of tables) {
    if (!table.headers.includes(derivation.column)) continue;
    columnSeen = true;
    for (const row of table.rows) {
      const cell = cellOf(table, row, derivation.column) ?? "";
      if (pattern === undefined || pattern.test(cell)) matched++;
    }
  }
  if (!columnSeen) return { error: `no table in scope has a "${derivation.column}" column` };
  const filter = derivation.matching === undefined ? "any value" : `/${derivation.matching}/`;
  return { value: matched, detail: `rows where "${derivation.column}" matches ${filter}` };
}

function deriveCountCheckboxes(
  scope: Scope,
  derivation: Extract<Derivation, { kind: "countCheckboxes" }>,
): Derived | { error: string } {
  const items = findCheckboxes(scope.lines, scope.lineOffset);
  if (items.length === 0) return { error: "no checkbox items found in scope" };
  const states = derivation.states;
  const matched =
    states === undefined ? items : items.filter((item) => states.includes(item.state));
  const which = states === undefined ? "any state" : states.join("/");
  return { value: matched.length, detail: `checkbox items in ${which}` };
}

function deriveCountRegexMatches(
  scope: Scope,
  derivation: Extract<Derivation, { kind: "countRegexMatches" }>,
): Derived | { error: string } {
  const flags = derivation.flags ?? "";
  const pattern = new RegExp(derivation.pattern, flags.includes("g") ? flags : `${flags}g`);
  const text = scope.lines.join("\n");
  const count = [...text.matchAll(pattern)].length;
  return { value: count, detail: `matches of /${derivation.pattern}/ in scope` };
}

function deriveSumTableColumn(
  scope: Scope,
  derivation: Extract<Derivation, { kind: "sumTableColumn" }>,
): Derived | { error: string } {
  const tables = findTables(scope.lines, scope.lineOffset).filter((table) =>
    table.headers.includes(derivation.column),
  );
  if (tables.length === 0) {
    return { error: `no table in scope has a "${derivation.column}" column` };
  }
  const index = derivation.tableIndex ?? 0;
  if (derivation.tableIndex === undefined && tables.length > 1) {
    return { error: `${tables.length} tables carry "${derivation.column}"; set tableIndex` };
  }
  const table = tables[index];
  if (!table) return { error: `tableIndex ${index} is out of range` };
  let sum = 0;
  let counted = 0;
  for (const row of table.rows) {
    const value = numericCell(cellOf(table, row, derivation.column) ?? "");
    if (value === null) continue;
    sum += value;
    counted++;
  }
  if (counted === 0) return { error: `no numeric cells under "${derivation.column}"` };
  return { value: sum, detail: `sum of ${counted} numeric cells under "${derivation.column}"` };
}

export function derive(scope: Scope, derivation: Derivation): Derived | { error: string } {
  switch (derivation.kind) {
    case "countTableRows":
      return deriveCountTableRows(scope, derivation);
    case "countCheckboxes":
      return deriveCountCheckboxes(scope, derivation);
    case "countRegexMatches":
      return deriveCountRegexMatches(scope, derivation);
    case "sumTableColumn":
      return deriveSumTableColumn(scope, derivation);
  }
}

interface StatedFigure {
  readonly line: number;
  readonly text: string;
  readonly value: number | null;
}

/** Locate the claim and read its captured number. */
function locateFigure(scope: Scope, check: FigureCheck): StatedFigure | { error: string } {
  const flags = check.figureLocation.flags ?? "";
  const pattern = new RegExp(
    check.figureLocation.pattern,
    flags.includes("g") ? flags : `${flags}g`,
  );
  for (let index = 0; index < scope.lines.length; index++) {
    const line = scope.lines[index] ?? "";
    pattern.lastIndex = 0;
    const match = pattern.exec(line);
    if (!match) continue;
    const captured = match[1];
    if (captured === undefined) {
      return { error: "figure pattern matched but captured no group" };
    }
    return {
      line: scope.lineOffset + index,
      text: match[0].trim().slice(0, 300),
      value: parseFigure(captured),
    };
  }
  return { error: `figure pattern /${check.figureLocation.pattern}/ matched nothing in scope` };
}

function unanchored(
  check: FigureCheck,
  note: string,
  section: string,
  detail: string,
): FigureFinding {
  return {
    id: check.id,
    kind: "config",
    note,
    section,
    line: null,
    statedText: "",
    statedFigure: null,
    derivedFigure: null,
    verdict: "UNANCHORED",
    detail,
  };
}

/** The heading a line sits under, for reporting. */
export function headingAt(content: string, line: number): string {
  const headings = listHeadings(content).filter((heading) => heading.line <= line);
  return headings[headings.length - 1]?.text ?? "";
}

export function runCheck(check: FigureCheck, index: NoteIndex): FigureFinding {
  const note = index.resolve(check.note);
  if (!note) return unanchored(check, check.note, "", `no note in the tree carries ${check.note}`);

  const figureScope = resolveScope(note, check.figureLocation.section);
  if ("error" in figureScope) {
    return unanchored(check, note.path, "", `figure section: ${figureScope.error}`);
  }
  const stated = locateFigure(figureScope.scope, check);
  if ("error" in stated)
    return unanchored(check, note.path, figureScope.scope.heading, stated.error);

  const section = headingAt(note.content, stated.line);
  if (stated.value === null) {
    return {
      ...unanchored(check, note.path, section, "captured text is not a parseable figure"),
      line: stated.line,
      statedText: stated.text,
    };
  }

  const derivationNote =
    check.derivation.note === undefined ? note : index.resolve(check.derivation.note);
  if (!derivationNote) {
    return {
      ...unanchored(
        check,
        note.path,
        section,
        `derivation note ${check.derivation.note} not found`,
      ),
      line: stated.line,
      statedText: stated.text,
      statedFigure: stated.value,
    };
  }
  const derivationScope = resolveScope(derivationNote, check.derivation.section);
  if ("error" in derivationScope) {
    return {
      ...unanchored(check, note.path, section, `derivation section: ${derivationScope.error}`),
      line: stated.line,
      statedText: stated.text,
      statedFigure: stated.value,
    };
  }
  const derived = derive(derivationScope.scope, check.derivation);
  if ("error" in derived) {
    return {
      ...unanchored(check, note.path, section, `derivation: ${derived.error}`),
      line: stated.line,
      statedText: stated.text,
      statedFigure: stated.value,
    };
  }

  const where =
    derivationNote.path === note.path
      ? ""
      : ` in ${derivationNote.entityId || derivationNote.path}`;
  return {
    id: check.id,
    kind: "config",
    note: note.path,
    section,
    line: stated.line,
    statedText: stated.text,
    statedFigure: stated.value,
    derivedFigure: derived.value,
    verdict: stated.value === derived.value ? "MATCH" : "MISMATCH",
    detail: `${derived.detail}${where}`,
  };
}
