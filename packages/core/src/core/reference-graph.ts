/**
 * The Relations-graph leg of inbound-reference detection.
 *
 * The conventions enforce bi-directional relations: when note A carries
 * `verb [[B]]`, note B must carry `inverse(verb) [[A]]`. That makes a note's own
 * `## Relations` section a FORMAL INDEX of the notes that reference it — an
 * inbound index no amount of text-scanning B could ever reconstruct, because the
 * evidence lives in A.
 *
 * Two checks fall straight out of the rule, and one-way edges — the defect this
 * session's repair work kept turning up — are exactly what they catch:
 *
 *   from the target outward   T has `verb [[A]]`, so A must carry the inverse.
 *                             A missing it is repaired ON A.
 *   from the tree inward      R has `verb [[T]]`, so T must carry the inverse.
 *                             T missing it is repaired ON T.
 *
 * Location convention for the findings produced here: `referencingFile` and
 * `line` always point at the edge that DOES exist (the evidence), while
 * `relation.counterpartFile` names the note where the missing inverse belongs
 * (the repair). Reading a finding therefore tells you both where to look and
 * where to write.
 */

import { inverseVerb } from "../../../models/src/relations.js";
import type { ReferenceFinding, ResolvedTarget } from "../schemas/reference-manifest.js";
import { normalizeReference } from "./note-identity.js";
import { NoteIndex } from "./note-index.js";
import type { NoteRecord } from "./reference-scan.js";

/**
 * Resolve an edge target to a note. The shared `NoteIndex` handles the four
 * canonical forms plus the punctuation-insensitive fallback; the alias map
 * layered on top is scan-specific — a retired title is history the caller
 * declared, not a property of the tree — so an edge still written with an old
 * title is verified rather than silently treated as unresolvable.
 */
function buildResolver(
  notes: readonly NoteRecord[],
  targets: readonly ResolvedTarget[],
): (reference: string) => NoteRecord | undefined {
  const index = new NoteIndex<NoteRecord>("", notes);
  const aliases = new Map<string, NoteRecord>();
  const byPath = new Map(notes.map((note) => [note.path, note]));
  for (const target of targets) {
    const note = byPath.get(target.path);
    if (!note) continue;
    for (const alias of target.aliasTitles) {
      const key = normalizeReference(alias);
      if (!aliases.has(key)) aliases.set(key, note);
    }
  }
  return (reference) =>
    index.resolveNormalized(reference) ?? aliases.get(normalizeReference(reference));
}

/** Every title form under which a note may legitimately be referenced. */
function titleFormsOf(note: NoteRecord, target: ResolvedTarget | undefined): string[] {
  return [note.title, ...(target?.aliasTitles ?? [])].map(normalizeReference);
}

/** Does `note` carry an edge with `verb` pointing at any of `titleForms`? */
function hasEdge(note: NoteRecord, verb: string, titleForms: readonly string[]): boolean {
  return note.relations.some(
    (edge) => edge.verb === verb && titleForms.includes(normalizeReference(edge.target)),
  );
}

function violation(
  cls: "bidirectional-missing-on-target" | "bidirectional-missing-on-referencer",
  evidenceFile: string,
  line: number,
  verb: string,
  expectedInverse: string,
  counterpartFile: string,
  edgeTarget: string,
  targetEntityId: string,
): ReferenceFinding {
  return {
    referencingFile: evidenceFile,
    line,
    column: 1,
    matchedText: `${verb} [[${edgeTarget}]]`,
    class: cls,
    target: targetEntityId,
    viaAlias: false,
    source: "GRAPH",
    advisory: false,
    relation: { verb, expectedInverse, counterpartFile },
  };
}

/**
 * Walk the target's own Relations outward. Each entry names a note that, under
 * the bi-directional rule, is an inbound referencer of the target; any such note
 * lacking the inverse edge is a one-way edge repaired on that note.
 */
function checkOutward(
  target: ResolvedTarget,
  targetNote: NoteRecord,
  resolve: (reference: string) => NoteRecord | undefined,
  targetForms: readonly string[],
): ReferenceFinding[] {
  const out: ReferenceFinding[] = [];
  for (const edge of targetNote.relations) {
    const expected = inverseVerb(edge.verb);
    if (expected === null) continue; // non-canonical verb; a schema concern, not ours
    const counterpart = resolve(edge.target);
    if (!counterpart || counterpart.path === targetNote.path) continue;
    if (hasEdge(counterpart, expected, targetForms)) continue;
    out.push(
      violation(
        "bidirectional-missing-on-referencer",
        targetNote.path,
        edge.line ?? 1,
        edge.verb,
        expected,
        counterpart.path,
        edge.target,
        target.entityId,
      ),
    );
  }
  return out;
}

/**
 * Walk the rest of the tree inward. Any note carrying a formal edge at the
 * target where the target carries no inverse is a one-way edge repaired on the
 * target.
 */
function checkInward(
  target: ResolvedTarget,
  targetNote: NoteRecord,
  notes: readonly NoteRecord[],
  targetForms: readonly string[],
): ReferenceFinding[] {
  const out: ReferenceFinding[] = [];
  for (const note of notes) {
    if (note.path === targetNote.path) continue;
    for (const edge of note.relations) {
      if (!targetForms.includes(normalizeReference(edge.target))) continue;
      const expected = inverseVerb(edge.verb);
      if (expected === null) continue;
      if (hasEdge(targetNote, expected, [normalizeReference(note.title)])) continue;
      out.push(
        violation(
          "bidirectional-missing-on-target",
          note.path,
          edge.line ?? 1,
          edge.verb,
          expected,
          targetNote.path,
          edge.target,
          target.entityId,
        ),
      );
    }
  }
  return out;
}

/**
 * Promote text findings that landed ON a formal Relations edge to `BOTH`, so the
 * manifest distinguishes a corroborated formal edge from an incidental prose
 * mention. Returns a new array; inputs are not mutated.
 */
function promoteCorroborated(
  textFindings: readonly ReferenceFinding[],
  notes: ReadonlyMap<string, NoteRecord>,
): ReferenceFinding[] {
  return textFindings.map((finding) => {
    // Only a TEXT match is promotable. The discriminated finding shape surfaced this
    // as a latent defect: spreading a SEARCH entry into a `BOTH` one carried its
    // advisory flag and search provenance across, producing a deterministic-looking
    // entry that claimed a search mode — and would have entered the closure gate.
    if (finding.source !== "TEXT") return finding;
    const note = notes.get(finding.referencingFile);
    const range = note?.relationsRange;
    if (!range || finding.class !== "wikilink") return finding;
    if (finding.line < range.start || finding.line > range.end) return finding;
    return { ...finding, source: "BOTH" as const };
  });
}

/**
 * Merge the graph leg into the text leg: corroborated text findings become
 * `BOTH`, and bi-directional closure violations are added as `GRAPH` findings.
 */
export function applyGraphLeg(params: {
  targets: readonly ResolvedTarget[];
  notes: ReadonlyMap<string, NoteRecord>;
  textFindings: readonly ReferenceFinding[];
}): ReferenceFinding[] {
  const { targets, notes, textFindings } = params;
  const all = [...notes.values()];
  const resolve = buildResolver(all, targets);
  const graph: ReferenceFinding[] = [];

  for (const target of targets) {
    const targetNote = notes.get(target.path);
    if (!targetNote) continue;
    const targetForms = titleFormsOf(targetNote, target);
    graph.push(...checkOutward(target, targetNote, resolve, targetForms));
    graph.push(...checkInward(target, targetNote, all, targetForms));
  }
  return [...promoteCorroborated(textFindings, notes), ...graph];
}
