/**
 * Line-level matchers for inbound-reference detection.
 *
 * Everything here is pure: a line of text plus resolved targets in, candidate
 * matches out. Keeping the detection logic free of file I/O is what lets the
 * awkward cases — a bare ID nested inside a wikilink, a permalink that is a
 * prefix of a longer one, a colon-less near-miss — be tested as data rather
 * than as fixture trees.
 */

import type {
  ReferenceClass,
  ReferenceFinding,
  ResolvedTarget,
} from "../schemas/reference-manifest.js";
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

/** A target's per-form patterns, built once instead of once per line. */
interface CompiledTarget {
  readonly titleForms: readonly Form[];
  readonly normalizedTitleForms: readonly Form[];
  readonly permalinks: ReadonlyArray<{ readonly re: RegExp; readonly form: Form }>;
  readonly entityIds: ReadonlyArray<{
    readonly citation: RegExp;
    readonly bare: RegExp;
    readonly form: Form;
  }>;
}

/**
 * Compiled patterns per target, memoised on the target object itself.
 *
 * `matchLine` runs once per LINE per target, and every pattern it needs depends
 * only on the target. Building them inside the call meant a `new RegExp` per form
 * per line: measured on the fond graph, 24,297 lines against 28 targets spent
 * 8,799ms in this module, against 319ms for a single target — the cost was
 * compilation, not matching. Hoisting it turns roughly 2.7 million compilations
 * into about a hundred.
 *
 * A `WeakMap` rather than a parameter change so the export keeps its shape and no
 * caller has to thread a cache through. Keyed on the target object, which
 * `resolveTargets` builds once and passes down unchanged; entries are collected
 * with the targets.
 *
 * Reusing a `/g` regex across calls is safe HERE because every use goes through
 * `String.prototype.matchAll`, which per spec clones the regex internally and so
 * never advances `lastIndex` on the instance held here. A bare `.exec()` loop on
 * these would not be safe, which is why there isn't one.
 */
const compiledTargets = new WeakMap<ResolvedTarget, CompiledTarget>();

/**
 * One cheap test that clears a line for EVERY target at once.
 *
 * The per-target matchers are the hot path: measured on the fond graph, 24,297
 * lines against 28 targets ran roughly 2.7 million regex executions and cost
 * 8,241ms, against 302ms for a single target. Hoisting compilation out of the loop
 * bought only 6% — engines already cache a compiled pattern by source — so the cost
 * is the scanning itself, and the only way to reduce it is to scan less.
 *
 * Most lines of most notes mention no note at all, and this decides that for the
 * whole target set in one pass instead of once per target.
 *
 * SAFETY — the filter can never drop a real match, because every candidate class
 * requires one of the two things tested here to be present in the line:
 *
 *   wikilink, wikilink-malformed   both come from `WIKILINK_RE`, so the line must
 *                                  contain `[[`. The malformed class compares on a
 *                                  punctuation-insensitive fold, so its literal may
 *                                  differ from the title — but it is still inside a
 *                                  `[[...]]`, which is what is tested.
 *   permalink, permalink-prefixed  require the permalink literal.
 *   entity-id, entity-id-section   require the entity ID literal.
 *
 * Alias forms are folded in for the same reason they are matched at all. The test
 * is deliberately over-permissive: a line containing `[[` is always scanned, even
 * when the link points elsewhere.
 */
const prefilters = new WeakMap<object, RegExp>();

function prefilterFor(targets: readonly ResolvedTarget[]): RegExp {
  const cached = prefilters.get(targets);
  if (cached) return cached;
  const literals = new Set<string>();
  for (const target of targets) {
    for (const value of [
      target.entityId,
      target.permalink,
      ...target.aliasEntityIds,
      ...target.aliasPermalinks,
    ]) {
      if (value.length > 0) literals.add(escapeRegExp(value));
    }
  }
  // `i` because the permalink form is lowercase while prose cites the CAPS entity ID.
  const built =
    literals.size === 0
      ? /\[\[/
      : new RegExp(`\\[\\[|${[...literals].sort((a, b) => b.length - a.length).join("|")}`, "i");
  prefilters.set(targets, built);
  return built;
}

function compile(target: ResolvedTarget): CompiledTarget {
  const cached = compiledTargets.get(target);
  if (cached) return cached;
  const titleForms = formsOf(target.title, target.aliasTitles);
  const built: CompiledTarget = {
    titleForms,
    normalizedTitleForms: titleForms.map((form) => ({
      value: normalizeReference(form.value),
      viaAlias: form.viaAlias,
    })),
    permalinks: formsOf(target.permalink, target.aliasPermalinks).map((form) => ({
      re: permalinkRegex(form.value),
      form,
    })),
    entityIds: formsOf(target.entityId, target.aliasEntityIds).map((form) => ({
      citation: sectionCitationRegex(form.value),
      bare: bareEntityIdRegex(form.value),
      form,
    })),
  };
  compiledTargets.set(target, built);
  return built;
}

function matchWikilinks(text: string, target: ResolvedTarget, built: CompiledTarget): Candidate[] {
  const forms = built.titleForms;
  const out: Candidate[] = [];
  for (const match of text.matchAll(WIKILINK_RE)) {
    const inner = (match[1] ?? "").trim();
    const start = match.index;
    const base = {
      start,
      end: start + match[0].length,
      matchedText: match[0],
      target: target.entityId,
    };
    const exact = forms.find((form) => form.value === inner);
    if (exact) {
      out.push({ ...base, class: "wikilink", viaAlias: exact.viaAlias });
      continue;
    }
    const normalizedInner = normalizeReference(inner);
    // Pre-normalized, so the fold is not recomputed for every form on every line.
    const near = built.normalizedTitleForms.find((form) => form.value === normalizedInner);
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

function matchPermalinks(text: string, target: ResolvedTarget, built: CompiledTarget): Candidate[] {
  const out: Candidate[] = [];
  for (const { re, form } of built.permalinks) {
    for (const match of text.matchAll(re)) {
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
    `(?<![\\w\\-])${escapeRegExp(entityId)}[ \\t]+(?:(Sections?|Parts?|Appendix)[ \\t]+([A-Za-z0-9][\\w.]*)|([A-Za-z]{1,8}[0-9]*)-([0-9][\\w.]*))`,
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

function matchEntityIds(text: string, target: ResolvedTarget, built: CompiledTarget): Candidate[] {
  const out: Candidate[] = [];
  for (const { citation, bare, form } of built.entityIds) {
    for (const match of text.matchAll(citation)) {
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
    for (const match of text.matchAll(bare)) {
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
  // Clears the whole target set in one pass; see `prefilterFor` for why this cannot
  // drop a real match.
  if (!prefilterFor(targets).test(text)) return [];

  const candidates: Candidate[] = [];
  for (const target of targets) {
    const built = compile(target);
    candidates.push(...matchWikilinks(text, target, built));
    candidates.push(...matchPermalinks(text, target, built));
    candidates.push(...matchEntityIds(text, target, built));
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
