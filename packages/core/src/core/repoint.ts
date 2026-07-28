/**
 * The deterministic repair stage: apply a caller-declared repoint to the sites an
 * impact manifest enumerated.
 *
 * The scanner answers "who points at this note". The closure checker answers "did
 * anyone fix them". Between those two sat the only unbuilt stage in the pipeline,
 * and the hand-work it replaces is the labour the whole family exists to remove:
 * on one real graph, one target set produced over 490 mechanically repairable
 * sites across 38 files.
 *
 * Three properties are non-negotiable and each is enforced rather than documented
 * as an expectation.
 *
 * **The write set is the mechanical set only.** Bi-directional closure findings,
 * index staleness, malformed references and every advisory entry are emitted as a
 * residual worklist and never touched. Their repair is an edge insertion, a
 * re-index, or an authored correction — none of which a map can express, so
 * automating them would mean guessing. That decision is made in
 * `repoint-classify.ts`, ahead of any file being opened for editing.
 *
 * **Nothing is written until everything verifies.** Every file is staged to
 * `.tmp`, each file's edit set is proven reversible byte-for-byte against the
 * content it was read from, and only then is anything renamed. A partially applied
 * repoint leaves the graph in a state neither the manifest nor the closure report
 * describes.
 *
 * **A second run is a no-op.** An address already holding its repointed form is
 * reported as such rather than substituted again, so re-running after a partial
 * failure is safe and re-running after success changes nothing.
 *
 * The closure checker is the acceptance test. It already carried an `UPDATED`
 * status that nothing produced; a finding this stage repairs is a finding whose
 * stale form is gone from the tree, which is exactly the condition that status
 * describes.
 */

// node:path only — Bun exposes no native path API (ADR-001 F-6 exception).
import { relative, resolve } from "node:path";
import { lexicalPathViolation } from "../schemas/base.js";
import { PlanValidationError } from "../schemas/plan-yaml.js";
import type { ImpactManifest } from "../schemas/reference-manifest.js";
import type {
  RepointEdit,
  RepointFileEntry,
  RepointPlan,
  RepointReport,
  RepointSkipped,
} from "../schemas/repoint-plan.js";
import type { RepointResidual } from "../schemas/repoint-residue.js";
import { cleanup, clusterAtomicRename, stage } from "./atomic-write.js";
import { sha256 } from "./hash.js";
import { type NoteFileSystem, defaultNoteFileSystem } from "./note-identity.js";
import {
  type Candidate,
  LazyNoteIndex,
  classifyFindings,
  compareFindings,
} from "./repoint-classify.js";
import {
  applyEdits,
  invertEdits,
  lineDiff,
  overlappingEdits,
  verifyAddress,
} from "./repoint-edits.js";
import { summarizeRepoint } from "./repoint-report.js";
import { buildWorkBrief } from "./work-brief.js";

export interface RepointOptions {
  manifest: ImpactManifest;
  plan: RepointPlan;
  /** Defaults to the manifest's recorded root. */
  docsRoot?: string;
  /** When true nothing is written and the report is a preview. */
  dryRun: boolean;
  fileSystem?: NoteFileSystem;
  now?: string;
}

/**
 * Integrity failure: the pass could not be proven reversible. Distinct from a
 * validation error because nothing was renamed and the cause is arithmetic in
 * this module, not bad input.
 */
function integrityError(message: string): Error {
  const err = new Error(message);
  (err as Error & { code?: number }).code = 2;
  return err;
}

/**
 * A manifest is untrusted input in the same sense a plan YAML is — it is read
 * back from disk and may have been hand-edited. `referencingFile` becomes a write
 * path, so it gets both halves of the CWE-22 guard: the shared lexical rule, and
 * containment of the resolved path inside the docs root.
 */
function safeAbsolutePath(docsRoot: string, referencingFile: string): string {
  const violation = lexicalPathViolation(referencingFile);
  if (violation !== null) {
    throw new PlanValidationError(`unsafe referencingFile in manifest (CWE-22): ${violation}`, [
      { path: referencingFile, message: violation },
    ]);
  }
  const abs = resolve(docsRoot, referencingFile);
  const rel = relative(docsRoot, abs);
  if (rel.startsWith("..") || rel.length === 0) {
    throw new PlanValidationError(
      `referencingFile resolves outside the docs root (CWE-22): ${referencingFile}`,
      [{ path: referencingFile, message: `resolves to ${abs}, outside ${docsRoot}` }],
    );
  }
  return abs;
}

interface PreparedFile {
  readonly rel: string;
  readonly abs: string;
  readonly before: readonly string[];
  readonly after: readonly string[];
  readonly edits: readonly RepointEdit[];
  readonly content: string;
  readonly nextContent: string;
}

interface FileOutcome {
  prepared: PreparedFile | undefined;
  residual: RepointResidual[];
  skipped: RepointSkipped[];
}

/**
 * Sort each candidate in one file into applicable, already-done, or declined.
 *
 * Overlap is checked before addresses because an overlapping pair is unusable
 * whatever sits at either address: applying both corrupts the line and applying
 * one silently discards the other.
 */
function triageCandidates(
  rel: string,
  before: readonly string[],
  fileCandidates: readonly Candidate[],
): { applicable: Candidate[]; residual: RepointResidual[]; skipped: RepointSkipped[] } {
  const residual: RepointResidual[] = [];
  const skipped: RepointSkipped[] = [];
  const applicable: Candidate[] = [];
  const conflicted = overlappingEdits(fileCandidates.map((candidate) => candidate.edit));

  for (let index = 0; index < fileCandidates.length; index++) {
    const candidate = fileCandidates[index];
    if (!candidate) continue;
    if (conflicted.has(index)) {
      residual.push({
        finding: candidate.finding,
        reason: "overlapping-edit",
        detail: `span overlaps another finding on line ${candidate.edit.line}; applying both would corrupt the line`,
      });
      continue;
    }
    switch (verifyAddress(before, candidate.edit)) {
      case "old":
        applicable.push(candidate);
        break;
      case "new":
        skipped.push({ finding: candidate.finding, newText: candidate.edit.newText });
        break;
      default:
        residual.push({
          finding: candidate.finding,
          reason: "address-drift",
          detail: `neither "${candidate.edit.oldText}" nor "${candidate.edit.newText}" sits at ${rel}:${candidate.edit.line}:${candidate.edit.column}`,
        });
    }
  }
  return { applicable, residual, skipped };
}

/**
 * Apply one file's applicable edits and prove the result reversible.
 *
 * The proof is not decoration. Addresses are 1-indexed columns applied
 * right-to-left, and real notes carry several references on one line — 26 such
 * lines in the measured manifest — so an off-by-one in the arithmetic would
 * corrupt notes silently. Undoing the pass and comparing hashes catches that
 * before anything is staged, which is the posture `decompose` takes with
 * `reverseMutations`.
 */
function prepareFile(
  rel: string,
  abs: string,
  content: string,
  fileCandidates: readonly Candidate[],
): FileOutcome {
  const before = content.split("\n");
  const { applicable, residual, skipped } = triageCandidates(rel, before, fileCandidates);
  if (applicable.length === 0) return { prepared: undefined, residual, skipped };

  const edits = applicable.map((candidate) => candidate.edit);
  const after = applyEdits(before, edits);
  const restored = applyEdits(after, invertEdits(edits)).join("\n");
  if (sha256(restored) !== sha256(content)) {
    throw integrityError(
      `repoint is not reversible for ${rel}: undoing ${edits.length} edit(s) did not restore the file`,
    );
  }
  return {
    prepared: {
      rel,
      abs,
      before,
      after,
      content,
      nextContent: after.join("\n"),
      edits: applicable.map((candidate) => ({
        line: candidate.edit.line,
        column: candidate.edit.column,
        class: candidate.finding.class,
        target: candidate.finding.target,
        oldText: candidate.edit.oldText,
        newText: candidate.edit.newText,
      })),
    },
    residual,
    skipped,
  };
}

/** Group candidates by the file they edit, in deterministic path order. */
function groupByFile(candidates: readonly Candidate[]): Map<string, Candidate[]> {
  const byFile = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const bucket = byFile.get(candidate.finding.referencingFile) ?? [];
    bucket.push(candidate);
    byFile.set(candidate.finding.referencingFile, bucket);
  }
  return new Map([...byFile.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Stage every file, then rename every file. All-or-nothing: a failure anywhere
 * removes every `.tmp` and leaves the tree exactly as it was found.
 */
async function commitFiles(prepared: readonly PreparedFile[]): Promise<void> {
  try {
    await Promise.all(prepared.map((file) => stage(file.abs, file.nextContent)));
    await clusterAtomicRename(prepared.map((file) => file.abs));
  } catch (err) {
    await Promise.all(prepared.map((file) => cleanup(file.abs)));
    throw err;
  }
}

/**
 * A permalink lookup for the work brief's repair sites.
 *
 * Resolved through the note index the destination check already builds, so a run
 * with section citations pays nothing extra. A run with no residue skips the index
 * entirely rather than reading the tree to answer no questions — the guard is not
 * an optimisation but the difference between "the executor reads the tree when it
 * needs to" and "the executor always reads the tree".
 */
async function permalinkResolver(
  residual: readonly RepointResidual[],
  index: LazyNoteIndex,
): Promise<(path: string) => string> {
  if (residual.length === 0) return () => "";
  const resolved = await index.get();
  return (path) => resolved.resolve(path)?.permalink ?? "";
}

/**
 * Execute a repoint plan against a manifest.
 *
 * In dry-run mode every step above the write runs unchanged — resolution, the
 * section-existence check, address verification, the reversibility proof — so a
 * preview is the same computation as an execution minus the rename. A preview that
 * took a shorter path would not be evidence about what the execution does.
 */
export async function executeRepoint(options: RepointOptions): Promise<RepointReport> {
  const fileSystem = options.fileSystem ?? defaultNoteFileSystem;
  const docsRoot = resolve(options.docsRoot ?? options.manifest.docsRoot);
  const index = new LazyNoteIndex(docsRoot, fileSystem);

  const { candidates, residual } = await classifyFindings(options.manifest, options.plan, index);
  const prepared: PreparedFile[] = [];
  const skipped: RepointSkipped[] = [];

  for (const [rel, fileCandidates] of groupByFile(candidates)) {
    const abs = safeAbsolutePath(docsRoot, rel);
    if (!(await fileSystem.exists(abs))) {
      for (const candidate of fileCandidates) {
        residual.push({
          finding: candidate.finding,
          reason: "address-drift",
          detail: `referencing file no longer exists: ${rel}`,
        });
      }
      continue;
    }
    const outcome = prepareFile(rel, abs, await fileSystem.read(abs), fileCandidates);
    residual.push(...outcome.residual);
    skipped.push(...outcome.skipped);
    if (outcome.prepared) prepared.push(outcome.prepared);
  }

  if (!options.dryRun && prepared.length > 0) await commitFiles(prepared);

  const files: RepointFileEntry[] = prepared.map((file) => ({
    path: file.rel,
    edits: [...file.edits],
    diff: lineDiff(file.before, file.after),
    sha256Before: sha256(file.content),
    sha256After: sha256(file.nextContent),
  }));
  residual.sort((a, b) => compareFindings(a.finding, b.finding));
  skipped.sort((a, b) => compareFindings(a.finding, b.finding));

  return {
    docsRoot,
    executedAt: options.now ?? new Date().toISOString(),
    dryRun: options.dryRun,
    files,
    alreadyRepointed: skipped,
    workBrief: buildWorkBrief(residual, options.plan, await permalinkResolver(residual, index)),
    summary: summarizeRepoint(options.manifest, files, skipped, residual),
  };
}
