/**
 * Aggregation of a repoint run into the report's summary block.
 *
 * Pure counting, kept out of the orchestrator because the counts are what an
 * adjudicator actually reads and they have their own correctness property: every
 * finding lands in exactly one of applied / already-repointed / residual, and the
 * three per-target figures must sum to what the manifest carried. Separating it
 * makes that property checkable without a filesystem.
 *
 * `byClass` is EXACT over all nine classes rather than a partial record: a class
 * reading zero is a fact worth showing, since the five classes this executor never
 * repairs should always read zero and a non-zero one is a bug the report shows
 * rather than hides. The per-REASON breakdown deliberately lives on the work brief
 * instead — it describes the residue, and the same counts in two places is the
 * shape that drifts.
 */

import {
  ClassCountsSchema,
  type ImpactManifest,
  REFERENCE_CLASSES,
  type ReferenceClass,
} from "../schemas/reference-manifest.js";
import type { RepointFileEntry, RepointReport, RepointSkipped } from "../schemas/repoint-plan.js";
import type { RepointResidual } from "../schemas/repoint-residue.js";

function emptyClassCounts(): Record<ReferenceClass, number> {
  return Object.fromEntries(REFERENCE_CLASSES.map((cls) => [cls, 0])) as Record<
    ReferenceClass,
    number
  >;
}

interface TargetOutcome {
  applied: number;
  alreadyRepointed: number;
  residual: number;
}

export function summarizeRepoint(
  manifest: ImpactManifest,
  files: readonly RepointFileEntry[],
  skipped: readonly RepointSkipped[],
  residual: readonly RepointResidual[],
): RepointReport["summary"] {
  const byClass = emptyClassCounts();
  const byTarget: Record<string, TargetOutcome> = {};

  function outcome(id: string): TargetOutcome {
    const existing = byTarget[id];
    if (existing) return existing;
    const created: TargetOutcome = { applied: 0, alreadyRepointed: 0, residual: 0 };
    byTarget[id] = created;
    return created;
  }

  let applied = 0;
  for (const file of files) {
    for (const edit of file.edits) {
      byClass[edit.class] += 1;
      outcome(edit.target).applied += 1;
      applied += 1;
    }
  }
  for (const entry of skipped) outcome(entry.finding.target).alreadyRepointed += 1;
  for (const entry of residual) outcome(entry.finding.target).residual += 1;

  return {
    totalFindings: manifest.findings.length,
    applied,
    alreadyRepointed: skipped.length,
    residual: residual.length,
    filesChanged: files.length,
    byClass: ClassCountsSchema.parse(byClass),
    byTarget,
  };
}
