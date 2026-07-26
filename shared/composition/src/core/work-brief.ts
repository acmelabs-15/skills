/**
 * Turn declined findings into an executable brief.
 *
 * Every entry answers four questions an agent would otherwise have to re-derive
 * from the finding: which file to open, where in it to look, why this is here, and
 * what edit to make. The first two come from the finding's own address; the third
 * is read off the plan (what happened to the target); the fourth is a per-reason
 * template, because the reason a repair was declined fully determines the shape of
 * the repair.
 *
 * The suggested action is a SHAPE, not an instruction to follow blindly. Every one
 * of these entries exists precisely because a machine could not decide it, so each
 * names what to do and leaves the judgment where it belongs.
 */

import type { ReferenceFinding } from "../schemas/reference-manifest.js";
import type { RepointPlan } from "../schemas/repoint-plan.js";
import { type RepointResidual, emptyReasonCounts } from "../schemas/repoint-residue.js";
import type {
  WorkBrief,
  WorkBriefEntry,
  WorkBriefEvidence,
  WorkBriefNote,
} from "../schemas/work-brief.js";

/** Resolve a repair-site path to its frontmatter permalink, or "" if unknown. */
export type PermalinkResolver = (path: string) => string;

/**
 * Where the edit goes.
 *
 * For every text class this is the note carrying the reference. For a
 * bi-directional finding it is the counterpart named by the finding, because the
 * missing inverse edge belongs there and the note carrying the evidence needs no
 * change at all.
 */
function repairSite(finding: ReferenceFinding): string {
  return finding.relation?.counterpartFile ?? finding.referencingFile;
}

/**
 * An entry whose address was never measured from a line of text: a graph finding
 * (column 1 by construction) or an index edge-existence entry, which describes a
 * relationship the index holds rather than a position in a file.
 */
function hasSyntheticAddress(finding: ReferenceFinding): boolean {
  return finding.relation !== undefined || finding.class === "index-stale";
}

function anchorOf(finding: ReferenceFinding): string {
  // A synthetic address is reported as the note itself rather than as a position.
  // Printing "line 1, col 1" for a whole-note observation sends an agent to the
  // frontmatter and reads like a measurement that was never taken.
  if (hasSyntheticAddress(finding)) {
    return finding.line > 1 ? `line ${finding.line}` : "whole note";
  }
  const parts = [`line ${finding.line}`, `col ${finding.column}`];
  if (finding.sectionFragment !== undefined) parts.push(`cites "${finding.sectionFragment}"`);
  return parts.join(", ");
}

function evidenceOf(finding: ReferenceFinding): WorkBriefEvidence {
  return {
    matchedText: finding.matchedText,
    evidenceFile: finding.referencingFile,
    evidenceLine: finding.line,
    ...(finding.relation
      ? {
          expectedInverse: finding.relation.expectedInverse,
          counterpartFile: finding.relation.counterpartFile,
        }
      : {}),
  };
}

/**
 * What the plan says happened to the target. Read off the declared maps rather
 * than inferred, so the brief never asserts a restructuring the plan did not
 * declare — and says so plainly when the plan declared nothing.
 */
function causingOperation(finding: ReferenceFinding, plan: RepointPlan): string {
  const id = finding.target;
  const changes: string[] = [];
  const renumbered = plan.renumber_map[id];
  if (renumbered !== undefined) changes.push(`renumbered ${id} -> ${renumbered}`);

  const retitled = Object.entries(plan.wikilink_map).find(([from]) => from.startsWith(`${id}:`));
  if (retitled) changes.push(`retitled "${retitled[0]}" -> "${retitled[1]}"`);

  const moved = Object.entries(plan.permalink_map).find(([from]) =>
    from.includes(id.toLowerCase()),
  );
  if (moved) changes.push(`permalink moved ${moved[0]} -> ${moved[1]}`);

  const sections = plan.section_map[id];
  if (sections !== undefined) {
    const pairs = Object.entries(sections)
      .map(([from, to]) => `${from} -> ${to}`)
      .join(", ");
    changes.push(`sections renumbered within ${id} (${pairs})`);
  }

  return changes.length === 0
    ? `the plan declares no change to ${id}, so why this reference is stale is not established here`
    : `plan declares: ${changes.join("; ")}`;
}

/**
 * The repair shape per decline reason. Each names the edit and, where the decision
 * is genuinely open, names the decision rather than pretending to have made it.
 */
function suggestedAction(entry: RepointResidual, plan: RepointPlan): string {
  const finding = entry.finding;
  const id = finding.target;
  const renumbered = plan.renumber_map[id];

  switch (entry.reason) {
    case "judgment-class": {
      const inverse = finding.relation?.expectedInverse;
      const counterpart = finding.relation?.counterpartFile;
      if (inverse === undefined || counterpart === undefined) {
        return `re-index or re-verify ${id} by hand; this class is not repaired by editing reference text`;
      }
      return `in ${counterpart}, add "${inverse} [[<title of ${finding.referencingFile}>]]" to its ## Relations section so the edge is two-way`;
    }
    case "malformed-reference":
      return `rewrite ${finding.matchedText} into the canonical colon form [[${id}: <Title>]], then re-run so the repoint can reach it`;
    case "advisory":
      // The action depends on WHICH advisory probe produced the entry, not just on
      // the fact that it is advisory. An index edge-existence row is not prose, and
      // the verb it appears to carry is explicitly untrusted.
      return finding.class === "index-stale"
        ? `the index holds an edge touching ${id} that no text reference corroborates. Open both notes and check their ## Relations sections carry the typed pair in both directions — the index's verb is not evidence and must not be copied`
        : `read line ${finding.line} and decide whether this prose names ${id}; if it does, update the wording by hand — search results are never written from`;
    case "no-mapping":
      return `confirm whether ${id} moved. If it did, add the pair to renumber_map / wikilink_map / permalink_map and re-run. If it did not, this reference is correct as written and needs nothing`;
    case "section-absent":
      return `find where "${finding.sectionFragment}" moved to in ${renumbered ?? id} and add section_map."${id}"."${finding.sectionFragment}" pointing at it — or cite a different section here`;
    case "destination-unresolved":
      return `no note carries ${renumbered ?? "the mapped identifier"} yet; land the split or renumber that creates it, then re-run the repoint`;
    case "address-drift":
      return "the file changed since the scan, so the recorded position is stale: re-run reference-scan to refresh the manifest, then re-run the repoint";
    case "overlapping-edit":
      return `this reference is nested inside another on line ${finding.line}; repoint that line by hand, since substituting both spans would corrupt it`;
    default:
      return `resolve by hand: ${entry.detail}`;
  }
}

function toEntry(residual: RepointResidual, plan: RepointPlan): WorkBriefEntry {
  const finding = residual.finding;
  return {
    reason: residual.reason,
    class: finding.class,
    target: finding.target,
    anchor: anchorOf(finding),
    line: finding.line,
    ...(hasSyntheticAddress(finding) ? {} : { column: finding.column }),
    ...(finding.sectionFragment === undefined ? {} : { sectionFragment: finding.sectionFragment }),
    evidence: evidenceOf(finding),
    causingOperation: causingOperation(finding, plan),
    suggestedAction: suggestedAction(residual, plan),
    detail: residual.detail,
  };
}

/**
 * Build the brief.
 *
 * `resolvePermalink` is injected rather than looked up here so this module stays
 * pure and the caller decides whether resolving permalinks is worth a tree read.
 */
export function buildWorkBrief(
  residual: readonly RepointResidual[],
  plan: RepointPlan,
  resolvePermalink: PermalinkResolver,
): WorkBrief {
  const byPath = new Map<string, WorkBriefEntry[]>();
  const byReason = emptyReasonCounts();

  for (const item of residual) {
    byReason[item.reason] += 1;
    const path = repairSite(item.finding);
    const bucket = byPath.get(path) ?? [];
    bucket.push(toEntry(item, plan));
    byPath.set(path, bucket);
  }

  const notes: WorkBriefNote[] = [...byPath.entries()]
    .map(([path, entries]) => ({
      path,
      permalink: resolvePermalink(path),
      // Top-to-bottom, so one pass down an open file closes everything in it.
      entries: [...entries].sort((a, b) => a.line - b.line || (a.column ?? 0) - (b.column ?? 0)),
    }))
    // Heaviest note first: a partially-worked brief has then made the most progress.
    .sort((a, b) => b.entries.length - a.entries.length || a.path.localeCompare(b.path));

  return {
    notes,
    summary: {
      entries: residual.length,
      notes: notes.length,
      byReason,
    },
  };
}

/** Flatten the brief for counting and filtering, without storing a second copy. */
export function workBriefEntries(brief: WorkBrief): WorkBriefEntry[] {
  return brief.notes.flatMap((note) => note.entries);
}
