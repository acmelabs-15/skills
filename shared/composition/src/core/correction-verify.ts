/**
 * Verification of correction obligations against their target notes.
 *
 * The check is a substring test with one crucial refinement: an occurrence of
 * the retired text INSIDE a dated correction marker is evidence the correction
 * landed, not evidence it did not. Markers quote what they retire — that is the
 * house discipline — so a verifier without this refinement reports OUTSTANDING
 * on precisely the notes that were corrected most carefully, and its output
 * inverts.
 *
 * Verdict rules, in the order they are applied per obligation:
 *
 *   any live occurrence anywhere                    → OUTSTANDING
 *   every quote gone, with marker or retired copy   → LANDED
 *   every quote gone, nothing recording the change  → LANDED-UNMARKED
 *   no note carries the target identity             → TARGET-NOT-FOUND
 */

import type {
  CorrectionObligation,
  MarkerEvidence,
  ObligationFinding,
  QuoteOccurrence,
  ReconcileReport,
} from "../schemas/correction-obligation.js";
import {
  type CorrectionMarker,
  findCorrectionMarkers,
  lineInsideMarker,
  markerWithin,
} from "./correction-markers.js";
import { type Section, lineOfOffset, sliceSections, splitLines } from "./markdown-slices.js";
import type { IndexedNote, NoteIndex } from "./note-index.js";
import { findQuoteMatches, normalizeForQuoteMatch } from "./text-normalize.js";

export interface VerifyOptions {
  readonly index: NoteIndex;
  readonly markerKeywords?: readonly string[] | undefined;
}

/**
 * Locate the section an obligation names, so marker evidence is scoped to the
 * assertion rather than to the note. A named section that does not resolve
 * widens the scope to the whole note rather than failing: the section may have
 * been renamed by the very correction under test, and refusing to look would
 * turn a successful correction into an unverifiable one.
 */
function scopeFor(note: IndexedNote, obligation: CorrectionObligation): Section | undefined {
  if (obligation.targetSection === undefined) return undefined;
  const fragment = obligation.targetSection.replace(/^(?:Sections?|Parts?|Appendix|Tier)\s+/i, "");
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sections = sliceSections(note.content, { matches: `(^|\\s)${escaped}(\\s|$|[.:—-])` });
  return sections.length === 1 ? sections[0] : undefined;
}

/** Everything a target note is scanned against, computed once per note. */
interface TargetScan {
  readonly note: IndexedNote;
  readonly lines: readonly string[];
  readonly normalized: ReturnType<typeof normalizeForQuoteMatch>;
  readonly markers: readonly CorrectionMarker[];
}

function occurrencesOf(scan: TargetScan, quote: string): QuoteOccurrence[] {
  const out: QuoteOccurrence[] = [];
  for (const match of findQuoteMatches(scan.normalized, quote)) {
    const line = lineOfOffset(scan.note.content, match.offset);
    out.push({
      quote,
      line,
      snippet: (scan.lines[line - 1] ?? "").trim().slice(0, 300),
      insideMarker: lineInsideMarker(scan.markers, line),
    });
  }
  return out;
}

function evidenceFrom(marker: CorrectionMarker, scope: "section" | "note"): MarkerEvidence {
  return { line: marker.startLine, text: marker.text.trim().slice(0, 300), scope };
}

/**
 * Marker evidence for a quote that left no trace. Preference is the named
 * section, because a marker three sections away vouches for a different
 * assertion; the whole-note fallback is recorded with `scope: "note"` so a
 * reader can weigh it accordingly.
 */
function findEvidence(
  markers: readonly CorrectionMarker[],
  section: Section | undefined,
): MarkerEvidence | undefined {
  if (section) {
    const inSection = markerWithin(markers, section.startLine, section.endLine);
    if (inSection) return evidenceFrom(inSection, "section");
    return undefined;
  }
  const first = markers[0];
  return first ? evidenceFrom(first, "note") : undefined;
}

function quotesOf(obligation: CorrectionObligation): string[] {
  return [obligation.quotedStaleText, ...obligation.alternateQuotes];
}

export function verifyObligation(
  obligation: CorrectionObligation,
  options: VerifyOptions,
): ObligationFinding {
  const note = options.index.resolve(obligation.targetNote) ?? resolveById(obligation, options);
  if (!note) {
    return {
      obligation,
      verdict: "TARGET-NOT-FOUND",
      liveOccurrences: [],
      retiredOccurrences: [],
      detail: options.index.isAmbiguous(obligation.targetEntityId)
        ? `more than one note claims ${obligation.targetEntityId}; refusing to guess which the correction meant`
        : `no note in the tree carries ${obligation.targetEntityId}`,
    };
  }

  const scan: TargetScan = {
    note,
    lines: splitLines(note.content),
    normalized: normalizeForQuoteMatch(note.content),
    markers: findCorrectionMarkers(note.content, options.markerKeywords),
  };
  const section = scopeFor(note, obligation);
  const live: QuoteOccurrence[] = [];
  const retired: QuoteOccurrence[] = [];
  const unevidenced: string[] = [];

  for (const quote of quotesOf(obligation)) {
    const found = occurrencesOf(scan, quote);
    const quoteLive = found.filter((hit) => !hit.insideMarker);
    const quoteRetired = found.filter((hit) => hit.insideMarker);
    live.push(...quoteLive);
    retired.push(...quoteRetired);
    if (quoteLive.length === 0 && quoteRetired.length === 0) unevidenced.push(quote);
  }

  const evidence = unevidenced.length > 0 ? findEvidence(scan.markers, section) : undefined;
  const landed = unevidenced.length === 0 || evidence !== undefined;
  return {
    obligation,
    verdict: live.length > 0 ? "OUTSTANDING" : landed ? "LANDED" : "LANDED-UNMARKED",
    targetPath: note.path,
    liveOccurrences: live,
    retiredOccurrences: retired,
    ...(evidence === undefined ? {} : { markerEvidence: evidence }),
    detail: detailFor(live, retired, unevidenced, evidence, section),
  };
}

/** Second chance by bare entity ID, for a target written as "ID Section N". */
function resolveById(
  obligation: CorrectionObligation,
  options: VerifyOptions,
): IndexedNote | undefined {
  return options.index.resolve(obligation.targetEntityId);
}

function detailFor(
  live: readonly QuoteOccurrence[],
  retired: readonly QuoteOccurrence[],
  unevidenced: readonly string[],
  evidence: MarkerEvidence | undefined,
  section: Section | undefined,
): string {
  if (live.length > 0) {
    const lines = live.map((hit) => hit.line).join(", ");
    return `retired text is still a live assertion at line${live.length > 1 ? "s" : ""} ${lines}`;
  }
  if (unevidenced.length === 0) {
    return `retired text survives only inside ${retired.length} dated correction marker${retired.length > 1 ? "s" : ""}`;
  }
  if (evidence) {
    const where = section ? `section "${section.heading.text}"` : "the note";
    return `retired text is absent; a dated correction marker in ${where} at line ${evidence.line} records the change`;
  }
  return "retired text is absent, but nothing in the target records that it changed";
}

function summarize(
  findings: readonly ObligationFinding[],
  unextractableCount: number,
): ReconcileReport["summary"] {
  const count = (verdict: ObligationFinding["verdict"]): number =>
    findings.filter((finding) => finding.verdict === verdict).length;
  const outstanding = count("OUTSTANDING");
  const targetNotFound = count("TARGET-NOT-FOUND");
  return {
    total: findings.length,
    outstanding,
    landed: count("LANDED"),
    landedUnmarked: count("LANDED-UNMARKED"),
    targetNotFound,
    unextractable: unextractableCount,
    closed: outstanding === 0 && targetNotFound === 0,
  };
}

/** Deterministic order: by target, then by where the obligation was stated. */
function compareFindings(a: ObligationFinding, b: ObligationFinding): number {
  return (
    a.obligation.targetEntityId.localeCompare(b.obligation.targetEntityId) ||
    a.obligation.sourceNote.localeCompare(b.obligation.sourceNote) ||
    a.obligation.sourceAnchor.localeCompare(b.obligation.sourceAnchor)
  );
}

export interface ReconcileInput {
  readonly docsRoot: string;
  readonly sources: readonly string[];
  readonly obligations: readonly CorrectionObligation[];
  readonly unextractable: ReconcileReport["unextractable"];
  readonly index: NoteIndex;
  readonly markerKeywords?: readonly string[] | undefined;
  /** Injected so a report can be byte-compared in tests. */
  readonly now?: string | undefined;
}

export function reconcile(input: ReconcileInput): ReconcileReport {
  const findings = input.obligations
    .map((obligation) =>
      verifyObligation(obligation, {
        index: input.index,
        ...(input.markerKeywords === undefined ? {} : { markerKeywords: input.markerKeywords }),
      }),
    )
    .sort(compareFindings);
  return {
    docsRoot: input.docsRoot,
    generatedAt: input.now ?? new Date().toISOString(),
    sources: [...input.sources].sort(),
    findings,
    unextractable: input.unextractable,
    summary: summarize(findings, input.unextractable.length),
  };
}
