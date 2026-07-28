/**
 * Detection of dated correction markers.
 *
 * The house discipline is that a correction landed in a note leaves a dated
 * marker at the assertion it changed — "Corrected 2026-07-26: the Totals row
 * previously stated 192 / 60 / 76 / 56". The marker is what lets the next
 * reader tell a current claim from a repaired one, and it is why an unmarked
 * repair is reported separately from a marked one even though both leave the
 * note factually correct.
 *
 * Markers matter twice over. They are the evidence a correction landed, AND
 * they quote the text they retire — so a naive search for the stale wording
 * finds it inside the very marker announcing its removal. Without the notion of
 * "inside a marker", every well-corrected note reports as OUTSTANDING and the
 * check is worse than useless.
 */

import { type Block, atomizeBlocks } from "./markdown-slices.js";

/**
 * Verbs that, alongside a date, mark a landed change.
 *
 * Deliberately narrower than the vocabulary the corpus uses. "Marked", "added"
 * and "expanded" appear beside dates too, but they describe additions rather
 * than corrections, and admitting them would let an ordinary dated log entry
 * count as evidence that an unrelated assertion was repaired. Callers who want
 * a wider net pass their own list rather than arguing with this one.
 */
export const DEFAULT_MARKER_KEYWORDS: readonly string[] = [
  "corrected",
  "correction",
  "corrections",
  "corrects",
  "superseded",
  "supersedes",
  "resolved",
  "revised",
  "restated",
  "amended",
  "retired",
  "withdrawn",
  "annotated",
  "adjudicated",
  "replaced",
  "replacing",
];

/**
 * Phrases by which a block announces that it is quoting text it retires.
 *
 * These serve two roles. They gate which markers yield an obligation — only a
 * marker that says the assertion USED to read something is quoting retired text
 * — and they act as a second admission route into marker status, because a
 * dated block saying "was carried as X" is performing a marker's job whatever
 * verb it opens with.
 *
 * Every entry pairs a past-tense or superseded sense with a reading/wording
 * sense, which is what separates "this sentence previously read X" from a
 * block that merely quotes a source it agrees with.
 */
export const RETIREMENT_PHRASES: readonly string[] = [
  "previously read",
  "previously stated",
  "previously said",
  "previously ended",
  "previously described",
  "previously characteris",
  "previously characteriz",
  "previously worded",
  "previously carried",
  "previously ran",
  "originally read",
  "originally stated",
  "originally said",
  "originally ended",
  "originally described",
  "originally characteris",
  "originally characteriz",
  "originally written",
  "originally worded",
  "used to read",
  "used to say",
  "formerly read",
  "was carried as",
  "carried as",
  "it read that",
  "it read",
  "still reads",
  "currently reads",
  "which read",
  "this cell previously",
  "this sentence previously",
  "this sentence originally",
  "this row previously",
  "this row originally",
  "this item read",
  "read that",
];

const RETIREMENT_RE = new RegExp(`(?:${RETIREMENT_PHRASES.join("|")})`, "i");

const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/;

function keywordRegex(keywords: readonly string[]): RegExp {
  return new RegExp(`\\b(?:${keywords.join("|")})\\b`, "i");
}

/** Where a block announces retired text, if it does. */
export function retirementMatch(text: string): RegExpExecArray | null {
  return RETIREMENT_RE.exec(text);
}

/** A block carrying both a correction verb and a date. */
export interface CorrectionMarker {
  readonly startLine: number;
  readonly endLine: number;
  readonly text: string;
  /** The verb that matched, lowercased — recorded so a finding is explicable. */
  readonly keyword: string;
  readonly date: string;
}

/**
 * Every dated correction marker in `content`. A block qualifies on a date plus
 * EITHER a correction verb or a retirement phrase — the verb list is
 * deliberately narrow, and a dated block that says an assertion "was carried
 * as" something is announcing a change whether or not it opens with one of the
 * listed verbs.
 *
 * Granularity is the atomised block — a paragraph, one list item, or one table
 * row. That is the unit a marker actually occupies in this corpus: a standalone
 * bold paragraph under the assertion it corrects, a single entry in a
 * Clarifications list, or a corrected rationale inside one cell of a register.
 * Sentence granularity would split a marker from the quote it carries; whole
 * blank-line blocks would let one corrected table row vouch for all seventeen.
 */
export function findCorrectionMarkers(
  content: string,
  keywords: readonly string[] = DEFAULT_MARKER_KEYWORDS,
): CorrectionMarker[] {
  const verb = keywordRegex(keywords);
  const out: CorrectionMarker[] = [];
  for (const block of atomizeBlocks(content)) {
    const date = ISO_DATE_RE.exec(block.text);
    if (!date) continue;
    const admitted = verb.exec(block.text) ?? retirementMatch(block.text);
    if (!admitted) continue;
    out.push({
      startLine: block.startLine,
      endLine: block.endLine,
      text: block.text,
      keyword: (admitted[0] ?? "").toLowerCase(),
      date: date[0],
    });
  }
  return out;
}

/** True when `line` (1-indexed) falls inside any of `markers`. */
export function lineInsideMarker(markers: readonly CorrectionMarker[], line: number): boolean {
  return markers.some((marker) => marker.startLine <= line && line <= marker.endLine);
}

/** The first marker whose span lies within `[startLine, endLine]`, if any. */
export function markerWithin(
  markers: readonly CorrectionMarker[],
  startLine: number,
  endLine: number,
): CorrectionMarker | undefined {
  return markers.find((marker) => marker.startLine >= startLine && marker.startLine <= endLine);
}

/** Atomised blocks of `content`, exposed so callers need not re-split spans. */
export function contentBlocks(content: string): Block[] {
  return atomizeBlocks(content);
}
