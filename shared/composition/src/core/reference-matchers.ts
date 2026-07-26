/**
 * Line-level matchers for inbound-reference detection.
 *
 * Everything here is pure: a line of text plus resolved targets in, candidate
 * matches out. Keeping the detection logic free of file I/O is what lets the
 * awkward cases — a bare ID nested inside a wikilink, a permalink that is a
 * prefix of a longer one, a colon-less near-miss — be tested as data rather
 * than as fixture trees.
 */

import type { ReferenceClass, ReferenceFinding, ResolvedTarget } from "../schemas/reference-manifest.js";
import { SUPPRESSION_PRECEDENCE } from "../schemas/reference-manifest.js";
import { ENTITY_PREFIX_SET, normalizeReference } from "./note-identity.js";

/** A match before overlap suppression; carries the span suppression needs. */
interface Candidate {
  start: number;
  end: number;
  matchedText: string;
  class: ReferenceClass;
  target: string;
  viaAlias: boolean;
  sectionFragment?: string;
}

/** One identity form of a target, tagged with whether it is historical. */
interface Form {
  value: string;
  viaAlias: boolean;
}

const WIKILINK_RE = /\[\[([^[\]]+)\]\]/g;

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formsOf(current: string, aliases: readonly string[]): Form[] {
  const forms: Form[] = [];
  if (current.length > 0) forms.push({ value: current, viaAlias: false });
  for (const alias of aliases) {
    if (alias.length > 0) forms.push({ value: alias, viaAlias: true });
  }
  return forms;
}

function matchWikilinks(text: string, target: ResolvedTarget): Candidate[] {
  const forms = formsOf(target.title, target.aliasTitles);
  const out: Candidate[] = [];
  for (const match of text.matchAll(WIKILINK_RE)) {
    const inner = (match[1] ?? "").trim();
    const start = match.index;
    const base = { start, end: start + match[0].length, matchedText: match[0], target: target.entityId };
    const exact = forms.find((form) => form.value === inner);
    if (exact) {
      out.push({ ...base, class: "wikilink", viaAlias: exact.viaAlias });
      continue;
    }
    const normalizedInner = normalizeReference(inner);
    const near = forms.find((form) => normalizeReference(form.value) === normalizedInner);
    if (near) out.push({ ...base, class: "wikilink-malformed", viaAlias: near.viaAlias });
  }
  return out;
}

/**
 * Permalinks are matched with an optional leading `<project>/` segment so the
 * Brain-MCP-flavoured form is caught by the same pass and tagged distinctly.
 * The lookbehind/lookahead pair stops a permalink matching inside a longer one
 * that merely starts with it.
 */
function permalinkRegex(permalink: string): RegExp {
  return new RegExp(
    `(?<![\\w\\-/])((?:[a-z0-9][a-z0-9\\-]*/)?${escapeRegExp(permalink)})(?![\\w\\-])`,
    "g",
  );
}

function matchPermalinks(text: string, target: ResolvedTarget): Candidate[] {
  const out: Candidate[] = [];
  for (const form of formsOf(target.permalink, target.aliasPermalinks)) {
    for (const match of text.matchAll(permalinkRegex(form.value))) {
      const matchedText = match[1] ?? "";
      const start = match.index + match[0].indexOf(matchedText);
      out.push({
        start,
        end: start + matchedText.length,
        matchedText,
        class: matchedText === form.value ? "permalink" : "permalink-project-prefixed",
        target: target.entityId,
        viaAlias: form.viaAlias,
      });
    }
  }
  return out;
}

/**
 * A citation fragment takes one of two shapes in practice:
 *
 *   keyword    `ANALYSIS-034 Part C`, `ANALYSIS-047 Sections 6`
 *   designator `ADR-001 D-5`, `CRIT-004 P0-2`, `ANALYSIS-033 S-1`
 *
 * The designator branch requires a hyphen followed by a digit, which is what
 * separates `ADR-001 D-5` from ordinary prose like `ADR-001 Fond`. Enumerating
 * every designator prefix instead would drift the moment a note introduces a
 * new one; requiring the shape holds without maintenance.
 */
function sectionCitationRegex(entityId: string): RegExp {
  return new RegExp(
    `(?<![\\w\\-])${escapeRegExp(entityId)}[ \\t]+` +
      `(?:(Sections?|Parts?|Appendix)[ \\t]+([A-Za-z0-9][\\w.]*)|([A-Za-z]{1,8}[0-9]*)-([0-9][\\w.]*))`,
    "g",
  );
}

/**
 * Build the fragment text, or null when the match is a sibling entity ID that
 * only looks like a designator. Trailing sentence punctuation is dropped from
 * the fragment while `matchedText` keeps quoting the document verbatim.
 */
function citationFragment(match: RegExpExecArray | RegExpMatchArray): string | null {
  const keyword = match[1];
  if (keyword !== undefined) return `${keyword} ${(match[2] ?? "").replace(/\.+$/, "")}`;
  const designator = match[3] ?? "";
  const letters = /^[A-Za-z]+/.exec(designator)?.[0]?.toUpperCase() ?? "";
  // A designator whose letters are a canonical entity prefix is a reference to a
  // SIBLING note, not a fragment: without this guard `PRD-001 PRD-002` reads as
  // "PRD-001, fragment PRD-002".
  if (ENTITY_PREFIX_SET.has(letters)) return null;
  return `${designator}-${(match[4] ?? "").replace(/\.+$/, "")}`;
}

function bareEntityIdRegex(entityId: string): RegExp {
  return new RegExp(`(?<![\\w\\-])${escapeRegExp(entityId)}(?![\\w])`, "g");
}

function matchEntityIds(text: string, target: ResolvedTarget): Candidate[] {
  const out: Candidate[] = [];
  for (const form of formsOf(target.entityId, target.aliasEntityIds)) {
    for (const match of text.matchAll(sectionCitationRegex(form.value))) {
      const fragment = citationFragment(match);
      if (fragment === null) continue;
      out.push({
        start: match.index,
        end: match.index + match[0].length,
        matchedText: match[0],
        class: "entity-id-section",
        target: target.entityId,
        viaAlias: form.viaAlias,
        sectionFragment: fragment,
      });
    }
    for (const match of text.matchAll(bareEntityIdRegex(form.value))) {
      out.push({
        start: match.index,
        end: match.index + match[0].length,
        matchedText: match[0],
        class: "entity-id",
        target: target.entityId,
        viaAlias: form.viaAlias,
      });
    }
  }
  return out;
}

function precedenceOf(cls: ReferenceClass): number {
  return SUPPRESSION_PRECEDENCE.indexOf(cls);
}

function compareCandidates(a: Candidate, b: Candidate): number {
  const byPrecedence = precedenceOf(a.class) - precedenceOf(b.class);
  if (byPrecedence !== 0) return byPrecedence;
  if (a.start !== b.start) return a.start - b.start;
  if (a.viaAlias !== b.viaAlias) return a.viaAlias ? 1 : -1;
  if (a.end !== b.end) return b.end - a.end;
  return a.target.localeCompare(b.target);
}

/**
 * Drop every candidate whose span sits inside a same-target candidate of equal
 * or higher precedence, so one textual reference produces one finding. Without
 * this, `[[ANALYSIS-034: Consolidated Decision Agenda]]` reports twice — once
 * as a wikilink and once as the bare ID nested inside it — and every per-class
 * count becomes an overcount.
 */
function suppressContained(candidates: readonly Candidate[]): Candidate[] {
  const ranked = [...candidates].sort(compareCandidates);
  const kept: Candidate[] = [];
  for (const candidate of ranked) {
    const covered = kept.some(
      (k) => k.target === candidate.target && k.start <= candidate.start && k.end >= candidate.end,
    );
    if (!covered) kept.push(candidate);
  }
  return kept;
}

/** Detect every inbound reference on a single line, de-overlapped. */
export function matchLine(
  text: string,
  targets: readonly ResolvedTarget[],
  referencingFile: string,
  line: number,
): ReferenceFinding[] {
  const candidates: Candidate[] = [];
  for (const target of targets) {
    candidates.push(...matchWikilinks(text, target));
    candidates.push(...matchPermalinks(text, target));
    candidates.push(...matchEntityIds(text, target));
  }
  return suppressContained(candidates)
    .sort((a, b) => a.start - b.start || precedenceOf(a.class) - precedenceOf(b.class))
    .map((candidate) => ({
      referencingFile,
      line,
      column: candidate.start + 1,
      matchedText: candidate.matchedText,
      class: candidate.class,
      target: candidate.target,
      viaAlias: candidate.viaAlias,
      source: "TEXT" as const,
      advisory: false,
      ...(candidate.sectionFragment === undefined
        ? {}
        : { sectionFragment: candidate.sectionFragment }),
    }));
}
