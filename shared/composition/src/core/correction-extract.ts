/**
 * Extraction of correction obligations from a source note.
 *
 * Two patterns cover how this corpus states a correction:
 *
 *   correction-list — a section whose heading names corrections to land, each
 *                     item naming a target and quoting the text it retires.
 *   dated marker    — an in-place marker at the assertion it changed, quoting
 *                     what the assertion previously said.
 *
 * Both reduce to the same tuple, and everything that does not reduce cleanly is
 * reported as UNEXTRACTABLE rather than guessed at. That asymmetry is the whole
 * design: a wrong tuple produces a confident false verdict about a real
 * assertion, while an unextractable item produces a line in a report that a
 * reader can turn into a config tuple in thirty seconds. Only one of those two
 * failure modes is recoverable.
 *
 * WHICH notes to extract from is an input, never a discovery. This module reads
 * one note at a time and the caller supplies the list — `--source` on the CLI,
 * or a config tuple naming a source outright. Nothing here walks a tree looking
 * for likely candidates.
 *
 * That seam is deliberate, and it is where semantic search belongs. Finding the
 * notes across a graph that carry correction obligations at all — a section
 * headed something no pattern anticipated, a correction stated in prose this
 * extractor cannot reduce — is a similarity problem, and the documented future
 * producer of the source list is a semantic-search discovery pass feeding this
 * seam. It stays strictly ADVISORY: discovery may only widen the set of notes
 * examined, and every verdict on every obligation is still reached by the
 * deterministic quote-and-marker check below. A tool that let a similarity
 * score decide whether a correction landed would be guessing with extra steps.
 */

import type {
  CorrectionObligation,
  UnextractableItem,
  UnextractableReason,
} from "../schemas/correction-obligation.js";
import { findCorrectionMarkers, retirementMatch } from "./correction-markers.js";
import { atomizeBlocks, sliceSections } from "./markdown-slices.js";
import { findEntityIds } from "./note-identity.js";

export interface ExtractionResult {
  readonly obligations: CorrectionObligation[];
  readonly unextractable: UnextractableItem[];
}

export interface ExtractOptions {
  /** Docs-root-relative path, recorded on every tuple. */
  readonly sourceNote: string;
  readonly content: string;
  /** The source's own entity ID; marker obligations target it. */
  readonly sourceEntityId: string;
  readonly markerKeywords?: readonly string[] | undefined;
  /** Overrides the default correction-list heading pattern. */
  readonly correctionHeadingPattern?: string | undefined;
  /** Frontmatter `type`; session notes are exempt from correction-list scanning. */
  readonly noteType?: string | undefined;
}

/**
 * Shortest quoted span worth treating as a retired assertion. Below this,
 * quotation marks are almost always scare quotes around a term of art ("field",
 * "newest", "once") rather than a transcription of a sentence, and matching one
 * would report OUTSTANDING on every note that uses the word normally.
 */
const MIN_QUOTE_LENGTH = 8;
const MAX_QUOTE_LENGTH = 400;

/**
 * Quoted spans are matched WITHIN a line. A quote wrapped across a source line
 * therefore goes unextracted rather than being greedily paired with a later
 * quotation mark — the conservative failure. Target-side matching is unaffected,
 * since normalisation collapses newlines before comparing.
 */
const QUOTE_RE = new RegExp(`["“]([^"“”\\n]{${MIN_QUOTE_LENGTH},${MAX_QUOTE_LENGTH}})["”]`, "g");

const SECTION_FRAGMENT_RE = /\b(Sections?|Parts?|Appendix|Tier)\s+([A-Za-z0-9][\w.]*)/;

/**
 * How far after a retirement phrase the retired quote may start.
 *
 * The longest quoted span in a marker is NOT reliably the retired text. A
 * marker that describes the retirement in prose and then quotes its NEW
 * supporting sources — "the claim it supports is narrower than it read ... the
 * announcement states 'the release candidate is locked as of ...'" — hands the
 * longest-span rule a citation and gets a confident verdict about text that was
 * never stale. Requiring the quote to follow the retirement phrase almost
 * immediately is what distinguishes the two, because a marker retiring text
 * says so and then quotes it: `previously read "X"`, `originally ended "Y"`.
 *
 * The window has to clear short interposed matter ("it read that `announced`
 * \"...\"", "originally described the flag as simply \"...\"") without reaching
 * a citation a clause later. Markers outside it yield no obligation, which is
 * the conservative failure: an unextracted obligation is a reported gap, a
 * mis-extracted one is a false verdict about a real assertion.
 */
const MAX_RETIREMENT_QUOTE_GAP = 32;

interface SpanHit {
  readonly quote: string;
  readonly start: number;
}

function quotedSpanHits(text: string): SpanHit[] {
  const out: SpanHit[] = [];
  for (const match of text.matchAll(QUOTE_RE)) {
    const quote = (match[1] ?? "").trim();
    if (quote.length >= MIN_QUOTE_LENGTH) out.push({ quote, start: match.index });
  }
  return out;
}

function dedupe(quotes: readonly string[]): string[] {
  return [...new Set(quotes)];
}

/**
 * Quoted spans of a correction-list item, most specific first. Every span in
 * the item is in play here, because the item's whole subject IS the correction
 * — unlike a marker, where the surrounding prose may cite unrelated sources.
 */
function quotedSpans(text: string): string[] {
  return dedupe(quotedSpanHits(text).map((hit) => hit.quote)).sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );
}

/**
 * Quoted spans of a marker, restricted to those that follow its retirement
 * phrase closely enough to be the text it retires. Order is positional rather
 * than by length: the first quote after the phrase is the retired one.
 */
function retiredSpans(text: string): string[] {
  const phrase = retirementMatch(text);
  if (!phrase) return [];
  const phraseEnd = phrase.index + phrase[0].length;
  const hits = quotedSpanHits(text).filter(
    (hit) => hit.start >= phraseEnd && hit.start - phraseEnd <= MAX_RETIREMENT_QUOTE_GAP,
  );
  return dedupe(hits.map((hit) => hit.quote));
}

function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}

interface TargetResolution {
  readonly targetNote: string;
  readonly targetEntityId: string;
  readonly targetSection?: string | undefined;
  readonly reason?: UnextractableReason | undefined;
}

/**
 * Name the target of a correction item.
 *
 * The leading bold span is tried first because that is where this corpus puts
 * the designation — "**UI-state analysis, ANALYSIS-026 Section 5.4** — the
 * claim that ...". Falling back to the whole item is what catches items written
 * without a bold lead, and requiring exactly one distinct entity ID in whichever
 * scope wins is what stops an item that merely cites its provenance from being
 * read as an item targeting that provenance.
 */
export function resolveItemTarget(itemText: string): TargetResolution {
  const boldLead = /^\s*(?:\d+[.)]\s*|[-*+]\s*)?\*\*(.+?)\*\*/s.exec(itemText)?.[1];
  const scopes = boldLead === undefined ? [itemText] : [boldLead, itemText];
  for (const scope of scopes) {
    const ids = distinct(findEntityIds(scope));
    if (ids.length === 0) continue;
    if (ids.length > 1) return { targetNote: "", targetEntityId: "", reason: "ambiguous-target" };
    const entityId = ids[0] ?? "";
    const after = scope.slice(scope.indexOf(entityId) + entityId.length, undefined);
    const fragment = SECTION_FRAGMENT_RE.exec(after.slice(0, 40));
    const section = fragment ? `${fragment[1]} ${fragment[2]}` : undefined;
    return {
      targetNote: section === undefined ? entityId : `${entityId} ${section}`,
      targetEntityId: entityId,
      targetSection: section,
    };
  }
  return { targetNote: "", targetEntityId: "", reason: "no-resolvable-target" };
}

const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s/;

/**
 * An observation bullet — `- [insight] ...` — is never a correction obligation.
 * The note conventions require that shape for entries under `## Observations`,
 * where a bullet states a finding about the note's own subject. An H3 grouping
 * headed "Second-pass corrections" is therefore a set of observations ABOUT
 * corrections, not a list of corrections to land, and admitting them fills the
 * unextractable report with items that were never obligations.
 */
const OBSERVATION_BULLET_RE =
  /^\s*[-*+]\s*\[(?:fact|decision|requirement|technique|insight|problem|solution|constraint|risk|outcome)\]/i;

/**
 * Session notes are exempt from correction-list scanning. A session ledger
 * records that corrections happened elsewhere — "Changed: PLAN-001 ... stale 89
 * corrected to 97" — and its Event headings routinely mention corrections in
 * passing. None of that states an obligation on another note, and treating the
 * ledger's field bullets as correction items buries the real findings. Dated
 * markers inside a session note are still read, since one can genuinely retire
 * a line of its own ledger.
 */
const CORRECTION_LIST_EXEMPT_TYPES: ReadonlySet<string> = new Set(["session"]);

/**
 * A section whose heading names a LIST of corrections.
 *
 * Plural on purpose. A section headed "Correction one — the three-clears
 * arithmetic does not survive execution" argues a single correction in prose;
 * its bullets are steps in that argument, not obligations, and admitting them
 * fills the report with items that were never obligations to begin with.
 * Matched on the heading alone, since a lead-paragraph heuristic fires on any
 * section that discusses corrections in passing.
 */
export const DEFAULT_CORRECTION_HEADING_PATTERN = "\\bcorrections\\b";

function extractFromCorrectionLists(options: ExtractOptions): ExtractionResult {
  const obligations: CorrectionObligation[] = [];
  const unextractable: UnextractableItem[] = [];
  if (CORRECTION_LIST_EXEMPT_TYPES.has(options.noteType ?? "")) {
    return { obligations, unextractable };
  }
  const sections = sliceSections(options.content, {
    matches: options.correctionHeadingPattern ?? DEFAULT_CORRECTION_HEADING_PATTERN,
    flags: "i",
  });
  for (const section of sections) {
    const body = section.lines.slice(1).join("\n");
    const items = atomizeBlocks(body).filter(
      (block) => LIST_ITEM_RE.test(block.text) && !OBSERVATION_BULLET_RE.test(block.text),
    );
    items.forEach((item, index) => {
      const anchor = `${section.heading.text} — item ${index + 1}`;
      const target = resolveItemTarget(item.text);
      if (target.reason !== undefined) {
        unextractable.push({
          sourceNote: options.sourceNote,
          sourceAnchor: anchor,
          reason: target.reason,
          rawText: item.text.trim(),
        });
        return;
      }
      const quotes = quotedSpans(item.text);
      const primary = quotes[0];
      if (primary === undefined) {
        unextractable.push({
          sourceNote: options.sourceNote,
          sourceAnchor: anchor,
          reason: "no-quoted-stale-text",
          rawText: item.text.trim(),
        });
        return;
      }
      obligations.push({
        sourceNote: options.sourceNote,
        sourceAnchor: anchor,
        targetNote: target.targetNote,
        targetEntityId: target.targetEntityId,
        ...(target.targetSection === undefined ? {} : { targetSection: target.targetSection }),
        quotedStaleText: primary,
        alternateQuotes: quotes.slice(1),
        mandatedChange: item.text.trim(),
        origin: "correction-list",
      });
    });
  }
  return { obligations, unextractable };
}

/**
 * Marker-derived obligations always target the SOURCE note itself.
 *
 * A marker saying "this sentence previously read X" is a statement about the
 * assertion it sits beside. Markers routinely cite their provenance in the same
 * breath — "corrected per CRIT-004 P1-2" — and reading that citation as the
 * target would point every obligation at the critique that prompted it rather
 * than the note that carries the text.
 */
function extractFromMarkers(options: ExtractOptions): ExtractionResult {
  const obligations: CorrectionObligation[] = [];
  const unextractable: UnextractableItem[] = [];
  const markers = findCorrectionMarkers(options.content, options.markerKeywords);
  for (const marker of markers) {
    if (!retirementMatch(marker.text)) continue;
    const anchor = `dated marker at line ${marker.startLine} (${marker.keyword} ${marker.date})`;
    const quotes = retiredSpans(marker.text);
    const primary = quotes[0];
    if (primary === undefined) {
      unextractable.push({
        sourceNote: options.sourceNote,
        sourceAnchor: anchor,
        reason: "no-quoted-stale-text",
        rawText: marker.text.trim(),
      });
      continue;
    }
    obligations.push({
      sourceNote: options.sourceNote,
      sourceAnchor: anchor,
      targetNote: options.sourceEntityId,
      targetEntityId: options.sourceEntityId,
      quotedStaleText: primary,
      alternateQuotes: quotes.slice(1),
      mandatedChange: marker.text.trim(),
      origin: "dated-marker",
    });
  }
  return { obligations, unextractable };
}

/** Deterministic order, independent of which pattern ran first. */
function compareObligations(a: CorrectionObligation, b: CorrectionObligation): number {
  return (
    a.sourceNote.localeCompare(b.sourceNote) ||
    a.targetEntityId.localeCompare(b.targetEntityId) ||
    a.sourceAnchor.localeCompare(b.sourceAnchor) ||
    a.quotedStaleText.localeCompare(b.quotedStaleText)
  );
}

/** Run both extraction patterns over one note. */
export function extractObligations(options: ExtractOptions): ExtractionResult {
  const lists = extractFromCorrectionLists(options);
  const markers = extractFromMarkers(options);
  const seen = new Set<string>();
  const obligations: CorrectionObligation[] = [];
  for (const obligation of [...lists.obligations, ...markers.obligations]) {
    const key = `${obligation.targetEntityId} ${obligation.quotedStaleText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    obligations.push(obligation);
  }
  return {
    obligations: obligations.sort(compareObligations),
    unextractable: [...lists.unextractable, ...markers.unextractable].sort(
      (a, b) => a.sourceAnchor.localeCompare(b.sourceAnchor) || a.reason.localeCompare(b.reason),
    ),
  };
}
